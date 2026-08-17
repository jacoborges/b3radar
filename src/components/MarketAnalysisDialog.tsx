import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { HelpCircle, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  analyzeMarketView,
  type MarketAnalysisResult,
  type Recomendacao,
} from "@/lib/market-analysis.functions";

interface Props {
  ticker: string;
  nome?: string;
  setor?: string;
}

const FAIXAS: { key: Exclude<Recomendacao, null>; label: string; cls: string }[] = [
  { key: "VENDA", label: "Venda", cls: "bg-destructive/70" },
  { key: "NEUTRO", label: "Neutro", cls: "bg-muted-foreground/50" },
  { key: "COMPRA", label: "Compra", cls: "bg-primary/80" },
];

function Termometro({ rec }: { rec: Recomendacao }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex gap-1.5">
        {FAIXAS.map((f) => {
          const on = rec === f.key;
          return (
            <div key={f.key} className="flex-1 space-y-1.5 text-center">
              <div
                className={`h-2.5 rounded-full ${f.cls} ${on ? "opacity-100" : "opacity-25"}`}
              />
              <span
                className={`text-xs ${on ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {f.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm">
        {rec ? (
          <>
            Termômetro do mercado:{" "}
            <span className="font-semibold text-foreground">
              {FAIXAS.find((f) => f.key === rec)?.label}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Recomendação indefinida pela IA.</span>
        )}
      </p>
    </div>
  );
}

export function MarketAnalysisDialog({ ticker, nome, setor }: Props) {
  const call = useServerFn(analyzeMarketView);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<MarketAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResult(null);
  }, [ticker]);

  const run = async (force = false) => {
    setLoading(true);
    try {
      const r = await call({ data: { ticker, nome, setor, force } });
      setResult(r);
    } catch {
      setResult({
        content: null,
        recomendacao: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: "Falha ao contatar o servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = () => {
    setOpen(true);
    if (!result && !loading) void run(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title="Análise do mercado (IA)"
        aria-label={`Análise do mercado para ${ticker}`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-border/60">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Análise do mercado — <span className="font-mono text-primary">{ticker}</span>
            </DialogTitle>
            <DialogDescription>
              Modelo de negócio, perenidade, lucro e efetividade da operação, com termômetro
              de recomendação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Termometro rec={result?.recomendacao ?? null} />

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando…
              </div>
            )}

            {!loading && result?.error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {result.error}
              </p>
            )}

            {!loading && result?.content && (
              <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{result.content}</ReactMarkdown>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span>
                {result
                  ? `Análise de ${new Date(result.updatedAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}${result.cached ? " · em cache" : ""}`
                  : "Conteúdo informativo gerado por IA."}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => void run(true)}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Conteúdo gerado por IA com base em informações públicas. Não é recomendação de
              investimento.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
