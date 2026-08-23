import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Loader2, Landmark, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoTip } from "./InfoTip";
import { useValuation } from "@/hooks/use-valuation";
import {
  PREMISSAS_DDM_PADRAO,
  cagrDividendos,
  classificarDdm,
  crescimentoFundamentalista,
  custoCapitalProprio,
  dpaUltimos12m,
  matrizSensibilidadeDdm,
  precoJustoGordon,
} from "@/lib/valuation-ddm";
import { buscarDadosDdm, type DadosDdmResult } from "@/lib/valuation-ddm.functions";
import type { DividendYear } from "@/lib/stocks-data";

interface Props {
  ticker: string;
  nome?: string;
  precoAtual?: number;
  /** ROE em % da base fundamentalista */
  roe?: number;
  historico?: DividendYear[] | null;
}

type Cenario = "fundamentalista" | "cagr" | "conservador";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

const storeKey = (t: string) => `b3radar:ddm:${t}`;

interface Overrides {
  payout?: string;
  beta?: string;
  premio?: string;
  cenario?: Cenario;
}

export function ValuationDdmPanel({ ticker, nome, precoAtual, roe, historico }: Props) {
  const call = useServerFn(buscarDadosDdm);
  const { data: val } = useValuation(ticker);

  const [ia, setIa] = useState<DadosDdmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ov, setOv] = useState<Overrides>({});

  useEffect(() => {
    setIa(null);
    try {
      const raw = window.localStorage.getItem(storeKey(ticker));
      setOv(raw ? (JSON.parse(raw) as Overrides) : {});
    } catch {
      setOv({});
    }
  }, [ticker]);

  const patch = (p: Overrides) => {
    setOv((prev) => {
      const next = { ...prev, ...p };
      try {
        window.localStorage.setItem(storeKey(ticker), JSON.stringify(next));
      } catch {
        /* storage indisponível */
      }
      return next;
    });
  };

  const parse = (s?: string) => {
    const n = Number.parseFloat((s ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  // ---- entradas (app → IA → manual) -------------------------------------
  const d0App = useMemo(() => dpaUltimos12m(historico), [historico]);
  const d0 = d0App ?? ia?.dpaProjetado ?? null;
  const origemD0 = d0App !== null ? "app (proventos B3)" : ia?.dpaProjetado ? "IA" : null;

  const lpa =
    val?.lucroLiquido != null && val?.acoes ? val.lucroLiquido / val.acoes : null;
  const payoutApp = lpa && lpa > 0 && d0App ? Math.min(d0App / lpa, 1.5) : null;
  const payoutManual = (() => {
    const n = parse(ov.payout);
    return n !== null && n > 0 && n <= 150 ? n / 100 : null;
  })();
  const payout = payoutManual ?? ia?.payout ?? payoutApp;
  const origemPayout = payoutManual ? "manual" : ia?.payout ? "IA (política)" : payoutApp ? "app" : null;

  const roeApp = roe != null && Number.isFinite(roe) ? roe / 100 : null;
  const roeUsado = ia?.roeProjetado ?? roeApp;
  const origemRoe = ia?.roeProjetado ? "IA (projetado)" : roeApp !== null ? "app" : null;

  const betaManual = parse(ov.beta);
  const beta = betaManual ?? val?.beta ?? ia?.beta ?? PREMISSAS_DDM_PADRAO.beta;
  const origemBeta =
    betaManual !== null ? "manual" : val?.beta ? "app" : ia?.beta ? "IA" : "padrão (1,00)";

  const rf = val?.selic ?? 0.15;
  const premioManual = parse(ov.premio);
  const premio =
    premioManual !== null && premioManual > 0 && premioManual < 20
      ? premioManual / 100
      : PREMISSAS_DDM_PADRAO.premioMercado;
  const r = custoCapitalProprio({
    rf,
    premioMercado: premio,
    riscoPais: PREMISSAS_DDM_PADRAO.riscoPais,
    beta,
  });

  // ---- cenários de crescimento ------------------------------------------
  const gFund = crescimentoFundamentalista(roeUsado, payout);
  const gCagr = useMemo(() => cagrDividendos(historico), [historico]);
  const gCons = PREMISSAS_DDM_PADRAO.gConservador;

  const cenarios: Array<{ id: Cenario; label: string; g: number | null; hint: string }> = [
    { id: "fundamentalista", label: "Fundamentalista", g: gFund, hint: "ROE × (1 − payout)" },
    { id: "cagr", label: "CAGR histórico", g: gCagr, hint: "crescimento dos proventos" },
    { id: "conservador", label: "Conservador", g: gCons, hint: "inflação + PIB nominal" },
  ];

  const cenarioSel: Cenario = ov.cenario ?? (gFund !== null ? "fundamentalista" : "conservador");
  const gUsado = cenarios.find((c) => c.id === cenarioSel)?.g ?? null;

  const resultado = precoJustoGordon(d0, gUsado, r, precoAtual);
  const veredito = classificarDdm(resultado?.precoJusto ?? null, precoAtual);
  const matriz = useMemo(
    () => (d0 && gUsado !== null ? matrizSensibilidadeDdm(d0, r, gUsado) : null),
    [d0, gUsado, r],
  );

  const run = async (force = false) => {
    setLoading(true);
    try {
      setIa(await call({ data: { ticker, nome, force } }));
    } catch {
      setIa({
        payout: null,
        dpaProjetado: null,
        roeProjetado: null,
        beta: null,
        ano: null,
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
  if (d0 === null) faltando.push("dividendos dos últimos 12 meses (D0)");
  if (gUsado === null) faltando.push("taxa de crescimento (ROE ou payout)");

  const cor = (c: string) =>
    c === "success"
      ? "var(--color-success)"
      : c === "danger"
        ? "var(--color-danger)"
        : c === "warning"
          ? "var(--color-warning)"
          : undefined;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Valuation DDM (Gordon)
        </h3>
        <InfoTip
          title="Modelo de Desconto de Dividendos"
          fundamentalista="Calcula o valor justo como o valor presente dos dividendos futuros: V0 = D1 ÷ (r − g). D1 é o dividendo esperado no próximo ano, r é o retorno exigido pelo CAPM (Selic + beta × prêmio de mercado + risco-país) e g é o crescimento dos dividendos (ROE × retenção do lucro ou CAGR histórico)."
          tecnica="É o método indicado para bancos, financeiras e seguradoras, onde EBIT e CAPEX do FCD não representam a operação. Só faz sentido em pagadores estáveis: se g ficar próximo ou acima de r, o modelo perde validade."
        />
        {resultado?.precoJusto != null && (
          <span className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
            {brl(resultado.precoJusto)}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">D1 ÷ (r − g) — {ticker}</h4>
          <div className="ml-auto flex items-center gap-2">
            {ia?.cached && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                cache 24h
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => run(!!ia)}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {loading ? "Buscando…" : ia ? "Atualizar dados (IA)" : "Buscar dados de mercado (IA)"}
            </Button>
          </div>
        </div>

        {ia?.error && (
          <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {ia.error}
          </div>
        )}

        {/* memória de cálculo */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] text-xs">
            <tbody className="font-mono">
              <Row label={`D0 — proventos 12m${origemD0 ? ` (${origemD0})` : ""}`} value={d0 === null ? "—" : brl(d0)} />
              <Row label={`Payout${origemPayout ? ` (${origemPayout})` : ""}`} value={payout === null ? "—" : pct(payout)} />
              <Row label={`ROE${origemRoe ? ` (${origemRoe})` : ""}`} value={roeUsado === null ? "—" : pct(roeUsado)} />
              <Row label={`g — ${cenarios.find((c) => c.id === cenarioSel)?.label}`} value={gUsado === null ? "—" : pct(gUsado)} />
              <Row label="D1 = D0 × (1 + g)" value={resultado ? brl(resultado.d1) : "—"} />
              <Row label="Rf (Selic)" value={pct(rf)} />
              <Row label={`Beta (${origemBeta})`} value={beta.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} />
              <Row label="Prêmio de mercado" value={pct(premio)} />
              <Row label="Risco-país" value={pct(PREMISSAS_DDM_PADRAO.riscoPais)} />
              <Row label="r = Rf + β×prêmio + risco-país" value={pct(r)} />
              <tr className="border-t border-border/60">
                <td className="py-1 pr-2 font-sans font-semibold">Preço justo (DDM)</td>
                <td className="py-1 text-right font-semibold">
                  {resultado?.precoJusto == null ? "—" : brl(resultado.precoJusto)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {resultado?.invalido && (
          <div className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
            Crescimento (g = {pct(resultado.g)}) igual ou maior que o retorno exigido (r ={" "}
            {pct(r)}): a fórmula de Gordon não tem solução. Use o cenário conservador, reduza o
            payout retido ou revise o beta/prêmio de mercado.
          </div>
        )}

        {faltando.length > 0 && (
          <div className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
            Faltam dados para concluir o DDM: {faltando.join(", ")}. Busque os dados na IA ou
            informe os valores manualmente abaixo.
          </div>
        )}

        {/* cenários */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {cenarios.map((c) => {
            const res = precoJustoGordon(d0, c.g, r, precoAtual);
            const ativo = c.id === cenarioSel;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => patch({ cenario: c.id })}
                className={`rounded-md border p-3 text-left text-xs transition ${
                  ativo ? "border-primary/60 bg-primary/5" : "border-border/50 bg-background"
                }`}
              >
                <div className="font-semibold">{c.label}</div>
                <div className="text-[11px] text-muted-foreground">{c.hint}</div>
                <div className="mt-1 font-mono text-sm font-semibold">
                  {res?.precoJusto == null ? "—" : brl(res.precoJusto)}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  g = {c.g === null ? "—" : pct(c.g)}
                </div>
              </button>
            );
          })}
        </div>

        {/* veredito */}
        <div className="mt-3 grid gap-2 rounded-md border border-border/50 bg-background p-3 text-xs sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Preço atual</div>
            <div className="font-mono text-sm font-semibold">
              {precoAtual ? brl(precoAtual) : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Margem sobre o preço</div>
            <div className="font-mono text-sm font-semibold" style={{ color: cor(veredito.color) }}>
              {resultado?.margem == null
                ? "—"
                : `${resultado.margem >= 0 ? "+" : ""}${resultado.margem.toFixed(1)}%`}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Veredito</div>
            <div className="text-sm font-semibold" style={{ color: cor(veredito.color) }}>
              {veredito.label}
            </div>
            <div className="text-[11px] text-muted-foreground">{veredito.desc}</div>
          </div>
        </div>

        {/* sensibilidade */}
        {matriz && (
          <div className="mt-3">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Sensibilidade — preço justo (linhas: r · colunas: g)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-[11px]">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="p-1 text-left font-normal">r \ g</th>
                    {matriz.crescimentos.map((g) => (
                      <th key={g} className="p-1 text-right font-mono font-normal">
                        {pct(g)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {matriz.taxas.map((taxa, i) => (
                    <tr key={taxa} className="border-t border-border/40">
                      <td className="p-1 text-muted-foreground">{pct(taxa)}</td>
                      {matriz.celulas[i]!.map((v, j) => (
                        <td
                          key={j}
                          className="p-1 text-right"
                          style={{
                            color:
                              v == null || !precoAtual
                                ? undefined
                                : v >= precoAtual
                                  ? "var(--color-success)"
                                  : "var(--color-danger)",
                          }}
                        >
                          {v == null ? "—" : brl(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* overrides */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <Field
            id={`ddm-payout-${ticker}`}
            label="Payout (%)"
            value={ov.payout ?? ""}
            placeholder={payoutApp ? (payoutApp * 100).toFixed(0) : "40"}
            onChange={(v) => patch({ payout: v })}
          />
          <Field
            id={`ddm-beta-${ticker}`}
            label="Beta"
            value={ov.beta ?? ""}
            placeholder={(val?.beta ?? 1).toFixed(2)}
            onChange={(v) => patch({ beta: v })}
          />
          <Field
            id={`ddm-premio-${ticker}`}
            label="Prêmio de mercado (%)"
            value={ov.premio ?? ""}
            placeholder={(PREMISSAS_DDM_PADRAO.premioMercado * 100).toFixed(0)}
            onChange={(v) => patch({ premio: v })}
          />
        </div>

        {ia?.content && (
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
              {ia.content}
            </ReactMarkdown>
          </div>
        )}

        {ia?.citations && ia.citations.length > 0 && (
          <div className="mt-3 border-t border-border/40 pt-2">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Fontes consultadas
            </div>
            <ol className="space-y-0.5 text-xs">
              {ia.citations.map((url, i) => (
                <li key={url} className="truncate">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    {i + 1}. {url}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Projeções e estimativas de terceiros — não constituem recomendação de investimento.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-border/40">
      <td className="py-1 pr-2 font-sans text-muted-foreground">{label}</td>
      <td className="py-1 text-right font-semibold">{value}</td>
    </tr>
  );
}

function Field({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        className="h-8 w-20 font-mono text-xs"
      />
    </div>
  );
}
