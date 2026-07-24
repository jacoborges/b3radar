import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Globe2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoTip } from "./InfoTip";
import {
  analyzeMacroSensitivity,
  type MacroSensitivityResult,
} from "@/lib/macro-sensitivity.functions";

interface Props {
  ticker: string;
  nome?: string;
  setor?: string;
}

function linkifyCitations(text: string, citations?: string[]): string {
  if (!citations || citations.length === 0) return text;
  return text.replace(/\[(\d+)\]/g, (m, n) => {
    const idx = parseInt(n, 10) - 1;
    const url = citations[idx];
    return url ? `[[${n}]](${url})` : m;
  });
}

export function MacroSensitivityPanel({ ticker, nome, setor }: Props) {
  const call = useServerFn(analyzeMacroSensitivity);
  const [result, setResult] = useState<MacroSensitivityResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const r = await call({ data: { ticker, nome, setor } });
      setResult(r);
    } catch {
      setResult({
        content: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: "Falha ao contatar o servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sensibilidade macroeconômica
        </h3>
        <InfoTip
          title="Como funciona"
          fundamentalista="A IA (Perplexity) pesquisa na web e explica de forma didática como o negócio desta empresa reage a variações do dólar, da inflação e da taxa Selic."
          tecnica="Ativos exportadores tendem a se beneficiar do dólar alto; bancos e seguradoras costumam se beneficiar da Selic alta; empresas endividadas e de consumo cíclico sofrem com juros altos."
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Globe2 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">
            Dólar, inflação e Selic — impacto em {ticker}
          </h4>
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
                <Globe2 className="h-3.5 w-3.5" />
              )}
              {loading ? "Analisando…" : result ? "Atualizar" : "Analisar impacto macro"}
            </Button>
          </div>
        </div>

        {!result && !loading && (
          <p className="text-sm text-muted-foreground">
            Clique em "Analisar impacto macro" para uma explicação didática de como a alta ou a
            queda do dólar, da inflação e da taxa Selic tendem a afetar {ticker}
            {nome ? ` (${nome.split(" ").slice(0, 3).join(" ")})` : ""}
            {setor ? `, do setor de ${setor}` : ""}.
          </p>
        )}

        {result?.error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {result.error}
          </div>
        )}

        {result?.content && (
          <>
            <div className="prose prose-sm prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-sm prose-headings:font-semibold prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-primary">
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
