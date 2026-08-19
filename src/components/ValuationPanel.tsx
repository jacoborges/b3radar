import { useEffect, useMemo, useState } from "react";
import { Calculator, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoTip } from "./InfoTip";
import { useValuation } from "@/hooks/use-valuation";
import {
  PREMISSAS_PADRAO,
  calcularCustoCapital,
  classificarMargem,
  matrizSensibilidade,
  projetarFCD,
  type Premissas,
  type TipoFluxo,
} from "@/lib/valuation";

interface Props {
  ticker: string;
  precoAtual?: number;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

const bi = (v: number | null) =>
  v == null
    ? "—"
    : `R$ ${(v / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} bi`;

function colorVar(c: "success" | "warning" | "danger" | "muted") {
  if (c === "muted") return "var(--color-muted-foreground, #888)";
  return `var(--color-${c})`;
}

function NumField({
  label,
  value,
  onChange,
  step = 0.1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number.parseFloat(e.target.value))}
          className="h-8 font-mono text-xs"
        />
        {suffix && (
          <span className="text-[11px] text-muted-foreground">{suffix}</span>
        )}
      </div>
    </label>
  );
}

export function ValuationPanel({ ticker, precoAtual }: Props) {
  const { data, isLoading, isFetching, error, refetch } = useValuation(ticker);
  const [tipo, setTipo] = useState<TipoFluxo>("FCFF");
  const [prem, setPrem] = useState<Premissas | null>(null);

  const padrao = useMemo<Premissas | null>(() => {
    if (!data) return null;
    return {
      ...PREMISSAS_PADRAO,
      rf: data.selic ?? 0.15,
      beta: data.beta ?? 1,
    };
  }, [data]);

  useEffect(() => {
    if (padrao) setPrem(padrao);
  }, [padrao]);

  const inputs = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      precoAtual: precoAtual && precoAtual > 0 ? precoAtual : data.precoAtual,
    };
  }, [data, precoAtual]);

  const calc = useMemo(() => {
    if (!inputs || !prem) return null;
    const cc = calcularCustoCapital({
      rf: prem.rf,
      beta: prem.beta,
      rm: prem.rm,
      riscoPais: prem.riscoPais,
      custoDividaPreTax: prem.custoDividaPreTax,
      aliquota: prem.aliquota,
      equity: inputs.marketCap ?? 0,
      divida: inputs.dividaTotal ?? 0,
    });
    const fcff = projetarFCD(inputs, prem, "FCFF");
    const fcfe = projetarFCD(inputs, prem, "FCFE");
    const ativo = tipo === "FCFF" ? fcff : fcfe;
    const taxaBase = tipo === "FCFF" ? cc.wacc : cc.ke;
    const matriz = matrizSensibilidade(inputs, prem, tipo, taxaBase);
    const veredito = classificarMargem(matriz, inputs.precoAtual);
    return { cc, fcff, fcfe, ativo, matriz, veredito };
  }, [inputs, prem, tipo]);

  const cotacao = inputs?.precoAtual ?? null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Valuation (FCD)
        </h3>
        <InfoTip
          title="Fluxo de Caixa Descontado (FCFF e FCFE)"
          fundamentalista="O FCD traz a valor presente o caixa que a empresa deve gerar no futuro. FCFF é o caixa da firma (EBIT após impostos + depreciação − CAPEX − capital de giro), descontado pelo WACC e ajustado pela dívida líquida para chegar ao valor do acionista. FCFE já é o caixa que sobra para o acionista, descontado pelo custo do capital próprio (Ke = Selic + beta × prêmio de mercado + risco-país). Depois do período projetado, o modelo assume um crescimento perpétuo que nunca deve superar a inflação/PIB de longo prazo."
          tecnica="A matriz de sensibilidade mostra o preço justo em vários cenários de taxa de desconto e crescimento. Se até o pior cenário fica acima da cotação, há margem de segurança grande; se só o melhor cenário justifica o preço de tela, a ação está esticada e exige stop mais curto."
        />
        {calc?.ativo?.precoJusto != null && (
          <span className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
            {brl(calc.ativo.precoJusto)}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">
            Preço justo por fluxo de caixa descontado — {ticker}
          </h4>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
            fonte: {data?.fonte ?? "—"}
          </span>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Coletando demonstrativos e dados
            macroeconômicos…
          </div>
        )}

        {!isLoading && (error || data?.error) && (
          <div className="space-y-2">
            <p className="text-sm text-[color:var(--color-danger)]">
              {data?.error ?? "Falha ao coletar os dados do ativo."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium hover:bg-muted/50 disabled:opacity-60"
              >
                {isFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Tentar novamente
              </button>
              {(data?.errorCode === "sem-token" ||
                data?.errorCode === "token-invalido" ||
                data?.errorCode === "plano-sem-modulos") && (
                <Link
                  to="/configuracoes"
                  className="text-xs font-medium text-primary underline underline-offset-2"
                >
                  {data?.errorCode === "sem-token"
                    ? "Cadastrar token em Ajustes"
                    : "Revisar token em Ajustes"}
                </Link>
              )}

            </div>
          </div>
        )}

        {!isLoading && data && !data.error && data.setorFinanceiro && (
          <p className="mb-3 rounded-md border border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/10 px-3 py-2 text-xs text-[color:var(--color-warning)]">
            Banco ou seguradora: EBIT e CAPEX não representam a operação deste setor, então o FCD
            por FCFF tende a distorcer o preço justo. Prefira a leitura por FCFE (caixa do
            acionista) e trate o resultado como referência, não como valor definitivo.
          </p>
        )}

        {!isLoading && data && !data.error && calc && prem && (

          <div className="space-y-5">
            {/* ---- Resumo ---- */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Cotação atual", v: cotacao, destaque: false as const },
                {
                  label: "Preço justo (FCFF)",
                  v: calc.fcff?.precoJusto ?? null,
                  destaque: true as const,
                },
                {
                  label: "Preço justo (FCFE)",
                  v: calc.fcfe?.precoJusto ?? null,
                  destaque: true as const,
                },
              ].map((c) => {
                const ok = c.destaque && c.v != null && cotacao ? c.v > cotacao : null;
                return (
                  <div
                    key={c.label}
                    className="rounded-md border border-border/40 bg-background/60 p-3"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {c.label}
                    </div>
                    <div
                      className="mt-1 font-mono text-lg font-semibold"
                      style={
                        ok === null
                          ? undefined
                          : { color: colorVar(ok ? "success" : "danger") }
                      }
                    >
                      {c.v == null ? "—" : brl(c.v)}
                    </div>
                    {c.destaque && c.v != null && cotacao ? (
                      <div
                        className="text-[11px]"
                        style={{ color: colorVar(ok ? "success" : "danger") }}
                      >
                        margem de segurança{" "}
                        {(((c.v - cotacao) / cotacao) * 100).toFixed(1)}%
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div
              className="rounded-md border p-3"
              style={{
                borderColor: colorVar(calc.veredito.color),
                background: "transparent",
              }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: colorVar(calc.veredito.color) }}
              >
                {calc.veredito.label}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {calc.veredito.desc}
              </p>
            </div>

            {/* ---- Seletor de fluxo + custo de capital ---- */}
            <div className="flex flex-wrap items-center gap-2">
              {(["FCFF", "FCFE"] as TipoFluxo[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={tipo === t ? "default" : "outline"}
                  onClick={() => setTipo(t)}
                >
                  {t}
                </Button>
              ))}
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                Ke {pct(calc.cc.ke)} · WACC {pct(calc.cc.wacc)} · taxa usada{" "}
                {calc.ativo ? pct(calc.ativo.taxaDesconto) : "—"}
              </span>
            </div>

            {/* ---- Premissas ---- */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Premissas
                </h5>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 gap-1 text-xs"
                  onClick={() => padrao && setPrem(padrao)}
                >
                  <RotateCcw className="h-3 w-3" /> restaurar padrão
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NumField
                  label="Selic (Rf) %"
                  value={Number((prem.rf * 100).toFixed(2))}
                  onChange={(v) => setPrem({ ...prem, rf: (v || 0) / 100 })}
                  step={0.25}
                />
                <NumField
                  label="Retorno mercado (Rm) %"
                  value={Number((prem.rm * 100).toFixed(2))}
                  onChange={(v) => setPrem({ ...prem, rm: (v || 0) / 100 })}
                  step={0.5}
                />
                <NumField
                  label="Risco-país %"
                  value={Number((prem.riscoPais * 100).toFixed(2))}
                  onChange={(v) => setPrem({ ...prem, riscoPais: (v || 0) / 100 })}
                  step={0.25}
                />
                <NumField
                  label="Beta"
                  value={Number(prem.beta.toFixed(2))}
                  onChange={(v) => setPrem({ ...prem, beta: v || 0 })}
                  step={0.05}
                />
                <NumField
                  label="Custo da dívida %"
                  value={Number((prem.custoDividaPreTax * 100).toFixed(2))}
                  onChange={(v) =>
                    setPrem({ ...prem, custoDividaPreTax: (v || 0) / 100 })
                  }
                  step={0.5}
                />
                <NumField
                  label="IR/CSLL %"
                  value={Number((prem.aliquota * 100).toFixed(2))}
                  onChange={(v) => setPrem({ ...prem, aliquota: (v || 0) / 100 })}
                  step={1}
                />
                <NumField
                  label="Crescimento fase 1 %"
                  value={Number((prem.gAlta * 100).toFixed(2))}
                  onChange={(v) => setPrem({ ...prem, gAlta: (v || 0) / 100 })}
                  step={0.5}
                />
                <NumField
                  label="Crescimento perpétuo %"
                  value={Number((prem.gPerp * 100).toFixed(2))}
                  onChange={(v) =>
                    setPrem({ ...prem, gPerp: Math.min((v || 0) / 100, 0.06) })
                  }
                  step={0.25}
                />
                <NumField
                  label="Anos fase de alta"
                  value={prem.anosAlta}
                  onChange={(v) =>
                    setPrem({ ...prem, anosAlta: Math.max(1, Math.round(v || 1)) })
                  }
                  step={1}
                />
                <NumField
                  label="Anos de transição"
                  value={prem.anosTransicao}
                  onChange={(v) =>
                    setPrem({ ...prem, anosTransicao: Math.max(0, Math.round(v || 0)) })
                  }
                  step={1}
                />
                <NumField
                  label="Capital de giro (% da receita)"
                  value={Number((prem.nigPctReceita * 100).toFixed(1))}
                  onChange={(v) => setPrem({ ...prem, nigPctReceita: (v || 0) / 100 })}
                  step={1}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                O crescimento na perpetuidade é limitado a 6% ao ano para não superar as
                projeções de inflação/PIB de longo prazo.
              </p>
            </div>

            {/* ---- Dados coletados ---- */}
            <div>
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dados coletados
              </h5>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-3">
                {[
                  ["Receita", bi(data.receita)],
                  ["EBIT", bi(data.ebit)],
                  ["Lucro líquido", bi(data.lucroLiquido)],
                  ["Depreciação/Amort.", bi(data.depreciacao)],
                  ["CAPEX", bi(data.capex)],
                  ["Dívida líquida", bi(data.dividaLiquida)],
                  ["Market cap", bi(data.marketCap)],
                  [
                    "Ações",
                    data.acoes == null
                      ? "—"
                      : `${(data.acoes / 1_000_000).toLocaleString("pt-BR", {
                          maximumFractionDigits: 1,
                        })} mi`,
                  ],
                  ["Beta", data.beta == null ? "—" : data.beta.toFixed(2)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              {data.observacao && (
                <p className="mt-2 text-[11px] text-muted-foreground">{data.observacao}</p>
              )}
              {data.derivacoes && data.derivacoes.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                  {data.derivacoes.map((d) => (
                    <li key={d}>· {d}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                <span>Fonte: {data.fonte ?? "—"}</span>
                {data.atualizadoEm && (
                  <span>
                    · Coletado em{" "}
                    {new Date(data.atualizadoEm).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                  className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-60"
                >
                  {isFetching ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Atualizar
                </button>
              </p>
              {!calc.ativo && (
                <p className="mt-2 text-xs text-[color:var(--color-warning)]">
                  {(() => {
                    const falta = [
                      data.ebit == null ? "EBIT" : null,
                      data.depreciacao == null ? "depreciação/amortização" : null,
                      data.capex == null ? "CAPEX" : null,
                    ].filter(Boolean) as string[];
                    return falta.length > 0
                      ? `A fonte não publica ${falta.join(", ")} para este ativo — o cálculo do FCD está incompleto.`
                      : "Dados insuficientes para concluir o cálculo do FCD.";
                  })()}
                </p>
              )}

            </div>

            {/* ---- Fluxos projetados ---- */}
            {calc.ativo && (
              <div>
                <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fluxos projetados ({tipo})
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[26rem] text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-1 pr-2 font-medium">Ano</th>
                        <th className="py-1 pr-2 text-right font-medium">Cresc.</th>
                        <th className="py-1 pr-2 text-right font-medium">Fluxo</th>
                        <th className="py-1 text-right font-medium">Valor presente</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {calc.ativo.fluxos.map((f) => (
                        <tr key={f.ano} className="border-t border-border/40">
                          <td className="py-1 pr-2">{f.ano}</td>
                          <td className="py-1 pr-2 text-right">{pct(f.crescimento)}</td>
                          <td className="py-1 pr-2 text-right">{bi(f.fluxo)}</td>
                          <td className="py-1 text-right">{bi(f.valorPresente)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-border/60">
                        <td className="py-1 pr-2" colSpan={3}>
                          Valor terminal (perpetuidade a {pct(prem.gPerp)})
                        </td>
                        <td className="py-1 text-right font-mono">
                          {bi(calc.ativo.vpValorTerminal)}
                        </td>
                      </tr>
                      <tr className="border-t border-border/60 font-semibold">
                        <td className="py-1 pr-2" colSpan={3}>
                          {tipo === "FCFF" ? "Valor da firma" : "Valor do acionista"}
                        </td>
                        <td className="py-1 text-right font-mono">
                          {bi(calc.ativo.valorTotal)}
                        </td>
                      </tr>
                      {tipo === "FCFF" && (
                        <tr className="border-t border-border/40">
                          <td className="py-1 pr-2" colSpan={3}>
                            (−) Dívida líquida → valor do acionista
                          </td>
                          <td className="py-1 text-right font-mono">
                            {bi(calc.ativo.equityValue)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---- Matriz de sensibilidade ---- */}
            {calc.ativo && (
              <div>
                <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Matriz de sensibilidade — preço justo por ação
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[26rem] text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="py-1 pr-2 text-left font-medium">Taxa \ g</th>
                        {calc.matriz.crescimentos.map((g) => (
                          <th key={g} className="py-1 px-2 text-right font-medium">
                            {pct(g)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {calc.matriz.taxas.map((taxa, i) => (
                        <tr key={taxa} className="border-t border-border/40">
                          <td className="py-1 pr-2 text-muted-foreground">{pct(taxa)}</td>
                          {calc.matriz.celulas[i].map((v, j) => {
                            const base = i === 2 && j === 2;
                            const ok = v != null && cotacao ? v > cotacao : null;
                            return (
                              <td
                                key={j}
                                className={`py-1 px-2 text-right ${
                                  base ? "rounded-sm ring-1 ring-primary/60" : ""
                                }`}
                                style={
                                  ok === null
                                    ? undefined
                                    : { color: colorVar(ok ? "success" : "danger") }
                                }
                              >
                                {v == null ? "—" : brl(v)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Linhas: taxa de desconto ({tipo === "FCFF" ? "WACC" : "Ke"}) em passos de
                  0,5 p.p. Colunas: crescimento na perpetuidade em passos de 0,5 p.p. Verde =
                  preço justo acima da cotação atual; vermelho = abaixo. A célula central é o
                  cenário base.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
