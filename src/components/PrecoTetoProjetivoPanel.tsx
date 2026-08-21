import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Loader2, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoTip } from "./InfoTip";
import { useValuation } from "@/hooks/use-valuation";
import { useBazinDivisor, formatDivisor } from "@/hooks/use-bazin-divisor";
import { calcPrecoTetoFromYears } from "@/lib/preco-teto";
import {
  calcProjetivo,
  descontoPct,
  payoutHistorico,
} from "@/lib/preco-teto-projetivo";
import { projetarLucro, type ProjecaoLucroResult } from "@/lib/preco-teto-projetivo.functions";
import type { DividendYear } from "@/lib/stocks-data";

interface Props {
  ticker: string;
  nome?: string;
  precoAtual?: number;
  historico?: DividendYear[] | null;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlBi = (v: number) =>
  `${(v / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} bi`;
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const payoutKey = (t: string) => `b3radar:payout-manual:${t}`;

export function PrecoTetoProjetivoPanel({ ticker, nome, precoAtual, historico }: Props) {
  const call = useServerFn(projetarLucro);
  const [divisor] = useBazinDivisor();
  const divisorTxt = formatDivisor(divisor);
  const { data: val } = useValuation(ticker);

  const [proj, setProj] = useState<ProjecaoLucroResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState<string>("");

  useEffect(() => {
    setProj(null);
    try {
      setManual(window.localStorage.getItem(payoutKey(ticker)) ?? "");
    } catch {
      setManual("");
    }
  }, [ticker]);

  const acoes = val?.acoes ?? null;
  const payoutHist = useMemo(
    () => payoutHistorico(historico, val?.lucroLiquido ?? null, acoes),
    [historico, val?.lucroLiquido, acoes],
  );

  const manualNum = Number.parseFloat(manual.replace(",", "."));
  const payoutManual =
    Number.isFinite(manualNum) && manualNum > 0 && manualNum <= 150 ? manualNum / 100 : null;
  const payoutUsado = payoutManual ?? proj?.payout ?? payoutHist;
  const origemPayout = payoutManual
    ? "manual"
    : proj?.payout
      ? "política de dividendos (IA)"
      : payoutHist
        ? "histórico (proventos ÷ LPA)"
        : null;

  const { lpa, dpa, teto } = calcProjetivo(
    proj?.lucroProjetado ?? null,
    acoes,
    payoutUsado ?? null,
    divisor,
  );
  const diff = descontoPct(teto, precoAtual);
  const tetoHist = calcPrecoTetoFromYears(historico, divisor).teto;

  const setManualPersist = (v: string) => {
    setManual(v);
    try {
      if (v.trim()) window.localStorage.setItem(payoutKey(ticker), v);
      else window.localStorage.removeItem(payoutKey(ticker));
    } catch {
      /* storage indisponível */
    }
  };

  const run = async (force = false) => {
    setLoading(true);
    try {
      setProj(await call({ data: { ticker, nome, force } }));
    } catch {
      setProj({
        lucroProjetado: null,
        ano: null,
        payout: null,
        content: null,
        citations: [],
        cached: false,
        updatedAt: new Date().toISOString(),
        error: "Falha ao contatar o servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  const faltando: string[] = [];
  if (proj && proj.lucroProjetado === null && !proj.error) faltando.push("lucro projetado");
  if (acoes === null) faltando.push("nº total de ações");
  if (payoutUsado === null) faltando.push("payout");

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preço Teto Projetivo
        </h3>
        <InfoTip
          title="Preço Teto Projetivo (Bazin sobre projeção)"
          fundamentalista={`Parte do lucro líquido projetado para o próximo ano pelas casas de análise e pelo RI da empresa. Divide esse lucro pelo número total de ações para achar o LPA projetivo, aplica o payout (percentual do lucro distribuído) para chegar ao DPA projetivo e divide o DPA pelo divisor configurado (${divisorTxt}) para obter o preço máximo a pagar hoje.`}
          tecnica="Enquanto o preço teto tradicional olha para trás (5 anos fechados), o projetivo antecipa o próximo ciclo: útil em empresas com lucro em forte mudança, mas depende da qualidade da projeção."
        />
        {teto !== null && (
          <span className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
            {brl(teto)}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">
            LPA projetivo × payout ÷ {divisorTxt} — {ticker}
          </h4>
          <div className="ml-auto flex items-center gap-2">
            {proj?.cached && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                cache 24h
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => run(!!proj)}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {loading ? "Buscando…" : proj ? "Atualizar projeção" : "Buscar projeção"}
            </Button>
          </div>
        </div>

        {!proj && !loading && (
          <p className="text-sm text-muted-foreground">
            Busque a projeção de lucro do próximo ano nas casas de análise (BTG Pactual e outras) e
            no RI da empresa para calcular o preço teto projetivo.
          </p>
        )}

        {proj?.error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {proj.error}
          </div>
        )}

        {proj && !proj.error && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[24rem] text-xs">
                <tbody className="font-mono">
                  <tr className="border-t border-border/40">
                    <td className="py-1 pr-2 font-sans text-muted-foreground">
                      1. Lucro projetado {proj.ano ?? ""}
                    </td>
                    <td className="py-1 text-right font-semibold">
                      {proj.lucroProjetado === null ? "—" : `R$ ${brlBi(proj.lucroProjetado)}`}
                    </td>
                  </tr>
                  <tr className="border-t border-border/40">
                    <td className="py-1 pr-2 font-sans text-muted-foreground">
                      2. Nº total de ações
                    </td>
                    <td className="py-1 text-right font-semibold">
                      {acoes === null ? "—" : num(acoes)}
                    </td>
                  </tr>
                  <tr className="border-t border-border/40">
                    <td className="py-1 pr-2 font-sans text-muted-foreground">3. LPA projetivo</td>
                    <td className="py-1 text-right font-semibold">{lpa === null ? "—" : brl(lpa)}</td>
                  </tr>
                  <tr className="border-t border-border/40">
                    <td className="py-1 pr-2 font-sans text-muted-foreground">
                      4. Payout {origemPayout ? `(${origemPayout})` : ""}
                    </td>
                    <td className="py-1 text-right font-semibold">
                      {payoutUsado === null ? "—" : pct(payoutUsado)}
                    </td>
                  </tr>
                  <tr className="border-t border-border/40">
                    <td className="py-1 pr-2 font-sans text-muted-foreground">
                      5. DPA projetivo (LPA × payout)
                    </td>
                    <td className="py-1 text-right font-semibold">{dpa === null ? "—" : brl(dpa)}</td>
                  </tr>
                  <tr className="border-t border-border/60">
                    <td className="py-1 pr-2 font-sans font-semibold">
                      6. Preço teto projetivo (÷ {divisorTxt})
                    </td>
                    <td className="py-1 text-right font-semibold">{teto === null ? "—" : brl(teto)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <label htmlFor={`payout-${ticker}`} className="text-muted-foreground">
                Payout manual (%)
              </label>
              <Input
                id={`payout-${ticker}`}
                value={manual}
                onChange={(e) => setManualPersist(e.target.value)}
                placeholder={payoutHist ? (payoutHist * 100).toFixed(0) : "40"}
                inputMode="decimal"
                className="h-8 w-24 font-mono text-xs"
              />
              {payoutHist !== null && (
                <span className="text-muted-foreground">
                  histórico: {pct(payoutHist)}
                </span>
              )}
              {proj.payout !== null && (
                <span className="text-muted-foreground">política (IA): {pct(proj.payout)}</span>
              )}
            </div>

            {faltando.length > 0 && (
              <div className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
                Faltam dados para concluir o cálculo: {faltando.join(", ")}. Informe o payout manual
                acima ou verifique o token da fonte de dados nos Ajustes.
              </div>
            )}

            <div className="mt-3 grid gap-2 rounded-md border border-border/50 bg-background p-3 text-xs sm:grid-cols-3">
              <div>
                <div className="text-muted-foreground">Preço atual</div>
                <div className="font-mono text-sm font-semibold">
                  {precoAtual ? brl(precoAtual) : "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Situação</div>
                <div
                  className="font-mono text-sm font-semibold"
                  style={{
                    color:
                      diff === null
                        ? undefined
                        : diff >= 0
                          ? "var(--color-success)"
                          : "var(--color-danger)",
                  }}
                >
                  {diff === null
                    ? "—"
                    : diff >= 0
                      ? `Abaixo do teto (${diff.toFixed(1)}% de desconto)`
                      : `Acima do teto (${Math.abs(diff).toFixed(1)}% de prêmio)`}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Teto histórico (5 anos)</div>
                <div className="font-mono text-sm font-semibold">
                  {tetoHist === null ? "—" : brl(tetoHist)}
                  {tetoHist !== null && teto !== null && (
                    <span className="ml-1 font-sans text-[11px] text-muted-foreground">
                      {teto > tetoHist ? "projeção mais otimista" : "projeção mais conservadora"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {proj.content && (
              <div className="prose prose-sm prose-invert mt-3 max-w-none prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-sm prose-headings:font-semibold prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-primary prose-table:text-xs">
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {proj.content}
                </ReactMarkdown>
              </div>
            )}

            {proj.citations.length > 0 && (
              <div className="mt-3 border-t border-border/40 pt-2">
                <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Fontes consultadas
                </div>
                <ol className="space-y-0.5 text-xs">
                  {proj.citations.map((url, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-muted-foreground">[{i + 1}]</span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <p className="mt-3 text-[11px] text-muted-foreground">
              Projeções de lucro são estimativas de terceiros e podem não se confirmar. Não é
              recomendação de investimento.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
