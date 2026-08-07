import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoTip } from "./InfoTip";
import { analyzePrecoTeto, type PrecoTetoResult } from "@/lib/preco-teto.functions";
import { useBazinDivisor, formatDivisor } from "@/hooks/use-bazin-divisor";

interface Props {
  ticker: string;
  nome?: string;
  precoAtual?: number;
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

export function PrecoTetoPanel({ ticker, nome, precoAtual }: Props) {
  const call = useServerFn(analyzePrecoTeto);
  const [divisor] = useBazinDivisor();
  const divisorTxt = formatDivisor(divisor);
  const [result, setResult] = useState<PrecoTetoResult | null>(null);
  const [loading, setLoading] = useState(false);

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

  const min = result?.minimo ?? null;
  const max = result?.maximo ?? null;
  const media = result?.media ?? null;
  const hasFaixa = min !== null && max !== null && min !== max;

  const tetoMin = hasFaixa ? min / divisor : media !== null ? media / divisor : null;
  const tetoMax = hasFaixa ? max / divisor : tetoMin;

  const tetoRef = tetoMin !== null && tetoMax !== null ? (tetoMin + tetoMax) / 2 : null;
  const diff =
    tetoRef !== null && precoAtual && precoAtual > 0
      ? ((tetoRef - precoAtual) / precoAtual) * 100
      : null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preço Teto
        </h3>
        <InfoTip
          title="Preço Teto (método Bazin)"
          fundamentalista={`Divide a média ponderada dos proventos (dividendos + JCP) dos cinco anos anteriores pelo divisor configurado (${divisorTxt}), o yield mínimo desejado. O resultado é o preço máximo a pagar para ainda obter esse retorno anual em proventos. Ajuste o divisor em Configurações.`}
          tecnica="Comprar abaixo do preço teto amplia a margem de segurança; acima dele, o retorno em proventos fica abaixo do alvo e o ativo tende a estar caro para estratégias de renda."
        />
        {tetoMin !== null && tetoMax !== null && (
          <span className="ml-auto rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-sm font-semibold text-primary">
            {hasFaixa ? `${brl(tetoMin)} — ${brl(tetoMax)}` : brl(tetoMin)}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">
            Proventos médios de 5 anos ÷ {divisorTxt} — {ticker}
          </h4>
          <div className="ml-auto flex items-center gap-2">
            {result?.cached && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                cache 24h
              </span>
            )}
            <Button size="sm" variant="outline" onClick={run} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Target className="h-3.5 w-3.5" />
              )}
              {loading ? "Calculando…" : result ? "Atualizar" : "Calcular preço teto"}
            </Button>
          </div>
        </div>

        {tetoMin !== null && (
          <div className="mb-3 grid gap-2 rounded-md border border-border/50 bg-background p-3 text-xs sm:grid-cols-3">
            <div>
              <div className="text-muted-foreground">Proventos médios/ano</div>
              <div className="font-mono text-sm font-semibold">
                {hasFaixa
                  ? `${brl(min!)} — ${brl(max!)}`
                  : media !== null
                    ? brl(media)
                    : "—"}
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
        )}

        {result?.content && tetoMin === null && (
          <div className="mb-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
            Não foi possível extrair um valor numérico confiável da pesquisa — o preço teto não foi
            calculado. Confira a análise abaixo.
          </div>
        )}

        {!result && !loading && (
          <p className="text-sm text-muted-foreground">
            Clique em "Calcular preço teto" para a IA (Google Gemini) consultar apenas RI da
            empresa, B3 e CVM os proventos (dividendos + JCP) dos cinco anos anteriores de {ticker}
            {nome ? ` (${nome.split(" ").slice(0, 3).join(" ")})` : ""}, somar, dividir por 5 e
            aplicar a fórmula de Bazin (média ÷ {divisorTxt}).
          </p>
        )}


        {result?.error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {result.error}
          </div>
        )}

        {result?.content && (
          <>
            <div className="prose prose-sm prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-sm prose-headings:font-semibold prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-primary prose-table:text-xs">
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
  );
}
