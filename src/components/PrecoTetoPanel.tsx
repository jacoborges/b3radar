import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Loader2, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoTip } from "./InfoTip";
import { analyzePrecoTeto, type PrecoTetoResult } from "@/lib/preco-teto.functions";
import { useBazinDivisor, formatDivisor } from "@/hooks/use-bazin-divisor";
import { anosFechados, calcPrecoTetoFromYears } from "@/lib/preco-teto";
import type { DividendYear } from "@/lib/stocks-data";

interface Props {
  ticker: string;
  nome?: string;
  precoAtual?: number;
  historico?: DividendYear[] | null;
}

function linkifyCitations(text: string, citations?: string[]): string {
  if (!citations || citations.length === 0) return text;
  return text.replace(/\[(\d+)\]/g, (m, n) => {
    const idx = parseInt(n, 10) - 1;
    const url = citations[idx];
    return url ? `[[${n}]](${url})` : m;
  });
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PrecoTetoPanel({ ticker, nome, precoAtual, historico }: Props) {
  const call = useServerFn(analyzePrecoTeto);
  const [divisor] = useBazinDivisor();
  const divisorTxt = formatDivisor(divisor);
  const [result, setResult] = useState<PrecoTetoResult | null>(null);
  const [loading, setLoading] = useState(false);

  // ---- Cálculo local com os dados da B3 já carregados no app ----
  const calc = useMemo(() => {
    const linhas = anosFechados().map((year) => {
      const y = historico?.find((h) => h.year === year);
      return {
        year,
        dividendo: y ? y.dividendo : null,
        jcp: y ? y.jcp : null,
        total: y ? y.dividendo + y.jcp : null,
      };
    });
    const disponiveis = linhas.filter((l) => l.total !== null);
    const soma = disponiveis.reduce((acc, l) => acc + (l.total ?? 0), 0);
    const { teto, media, anosComDados } = calcPrecoTetoFromYears(historico, divisor);
    return {
      linhas,
      soma,
      media,
      teto,
      faltando: 5 - anosComDados,
      temDados: anosComDados > 0,
    };
  }, [historico, divisor]);

  const teto = calc.teto;
  const diff =
    teto !== null && precoAtual && precoAtual > 0
      ? ((teto - precoAtual) / precoAtual) * 100
      : null;

  // ---- Conferência opcional pela IA (não altera o preço teto) ----
  const iaMin = result?.minimo ?? null;
  const iaMax = result?.maximo ?? null;
  const iaFaixa = iaMin !== null && iaMax !== null && iaMin !== iaMax;

  const run = async () => {
    setLoading(true);
    try {
      const r = await call({ data: { ticker, nome } });
      setResult(r);
    } catch {
      setResult({
        content: null,
        media: null,
        minimo: null,
        maximo: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: "Falha ao contatar o servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preço Teto
        </h3>
        <InfoTip
          title="Preço Teto (método Bazin)"
          fundamentalista={`Soma dividendos + JCP de cada um dos cinco anos fechados (dados da B3), divide o somatório por 5 para obter a média ponderada e divide essa média pelo divisor configurado (${divisorTxt}), o yield mínimo desejado. O resultado é o preço máximo a pagar para ainda obter esse retorno anual em proventos. Ajuste o divisor em Configurações.`}
          tecnica="Comprar abaixo do preço teto amplia a margem de segurança; acima dele, o retorno em proventos fica abaixo do alvo e o ativo tende a estar caro para estratégias de renda."
        />
        {teto !== null && (
          <span className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
            {brl(teto)}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">
            Proventos médios de 5 anos ÷ {divisorTxt} — {ticker}
          </h4>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
            fonte: B3
          </span>
        </div>

        {!calc.temDados ? (
          <p className="text-sm text-muted-foreground">
            Sem dados de proventos da B3 para os cinco anos fechados deste ativo — o preço teto não
            pôde ser calculado.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-2 font-medium">Ano</th>
                    <th className="py-1 pr-2 text-right font-medium">Dividendos</th>
                    <th className="py-1 pr-2 text-right font-medium">JCP</th>
                    <th className="py-1 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {calc.linhas.map((l) => (
                    <tr key={l.year} className="border-t border-border/40">
                      <td className="py-1 pr-2">{l.year}</td>
                      <td className="py-1 pr-2 text-right">
                        {l.dividendo === null ? "—" : brl(l.dividendo)}
                      </td>
                      <td className="py-1 pr-2 text-right">
                        {l.jcp === null ? "—" : brl(l.jcp)}
                      </td>
                      <td className="py-1 text-right font-semibold">
                        {l.total === null ? (
                          <span className="font-sans text-muted-foreground">sem dado</span>
                        ) : (
                          brl(l.total)
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border/60">
                    <td className="py-1 pr-2 font-sans font-semibold">Soma (5 anos)</td>
                    <td colSpan={3} className="py-1 text-right font-semibold">
                      {brl(calc.soma)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {calc.faltando > 0 && (
              <div className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
                {calc.faltando} de 5 anos sem dado na B3. A média continua sendo soma ÷ 5, o que
                pode subestimar o preço teto.
              </div>
            )}

            <div className="mt-3 grid gap-2 rounded-md border border-border/50 bg-background p-3 text-xs sm:grid-cols-4">
              <div>
                <div className="text-muted-foreground">Média (soma ÷ 5)</div>
                <div className="font-mono text-sm font-semibold">
                  {calc.media === null ? "—" : brl(calc.media)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Preço teto (÷ {divisorTxt})</div>
                <div className="font-mono text-sm font-semibold">
                  {teto === null ? "—" : brl(teto)}
                </div>
              </div>
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
            </div>
          </>
        )}

        {/* Conferência opcional pela IA */}
        <div className="mt-4 border-t border-border/40 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Conferência opcional nas fontes oficiais (RI, B3 e CVM) — não altera o preço teto
              acima.
            </span>
            <div className="ml-auto flex items-center gap-2">
              {result?.cached && (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  cache 24h
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={run}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {loading ? "Conferindo…" : result ? "Atualizar conferência" : "Conferir com IA"}
              </Button>
            </div>
          </div>

          {result?.error && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {result.error}
            </div>
          )}

          {iaFaixa && (
            <div className="mt-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
              A IA encontrou divergência entre as fontes: média anual entre {brl(iaMin!)} e{" "}
              {brl(iaMax!)} — teto equivalente de {brl(iaMin! / divisor)} a{" "}
              {brl(iaMax! / divisor)}.
            </div>
          )}

          {result?.content && (
            <>
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
                  {linkifyCitations(result.content, result.citations)}
                </ReactMarkdown>
              </div>
              {result.citations && result.citations.length > 0 && (
                <div className="mt-3 border-t border-border/40 pt-2">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Fontes consultadas
                  </div>
                  <ol className="space-y-0.5 text-xs">
                    {result.citations.map((url, i) => (
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
                Gerado por IA a partir de dados públicos. Não é recomendação de investimento.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
