import { useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  usePortfolioProventos,
  type PosicaoProventos,
  type ProventoCarteira,
} from "@/hooks/use-portfolio-proventos";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brl4 = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
const dia = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};
const qty = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 6 });

interface GrupoProventos {
  ticker: string;
  eventos: ProventoCarteira[];
  subtotal: number;
}

export function PortfolioProventos({
  posicoes,
}: {
  posicoes: PosicaoProventos[];
}) {
  const [open, setOpen] = useState(false);
  const { eventos, total, isLoading, isFetching, refetch } =
    usePortfolioProventos(posicoes);

  const grupos = useMemo(() => {
    const map = new Map<string, ProventoCarteira[]>();
    for (const e of eventos) {
      const list = map.get(e.ticker) ?? [];
      list.push(e);
      map.set(e.ticker, list);
    }
    return Array.from(map.entries())
      .map(([ticker, items]) => ({
        ticker,
        eventos: items,
        subtotal: items.reduce((s, e) => s + e.total, 0),
      }))
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [eventos]);

  const hasData = posicoes.length > 0 && eventos.length > 0;
  const totalLabel =
    posicoes.length === 0 || eventos.length === 0
      ? "—"
      : isLoading
        ? "Calculando…"
        : brl(total);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="rounded-xl border border-border/60 bg-card">
        <CollapsibleTrigger asChild>
          <header className="flex cursor-pointer flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3 transition-colors hover:bg-muted/20">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Próximos proventos a receber</h3>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              anúncios oficiais (B3/CVM/RI), só lotes comprados antes da data com
            </span>

            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  refetch();
                }}
                disabled={isFetching || posicoes.length === 0}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Total previsto</span>
                <span className="font-bold text-success">{totalLabel}</span>
                {open ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </header>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {posicoes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Adicione ativos à carteira para ver os proventos anunciados.
            </p>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          ) : eventos.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum provento anunciado no momento para os ativos da carteira.
            </p>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Ativo</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-right font-medium">Por ação</th>
                      <th className="px-3 py-2 text-right font-medium">Qtd.</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-center font-medium">Data com</th>
                      <th className="px-3 py-2 text-center font-medium">Data ex</th>
                      <th className="px-4 py-2 text-center font-medium">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((g) => (
                      <>
                        <tr
                          key={`group-${g.ticker}`}
                          className="border-b border-border/60 bg-muted/30"
                        >
                          <td className="px-4 py-2 font-bold">{g.ticker}</td>
                          <td className="px-3 py-2 text-[11px] text-muted-foreground" colSpan={3}>
                            Total do ativo
                          </td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums text-success">
                            {brl(g.subtotal)}
                          </td>
                          <td className="px-3 py-2" colSpan={3} />
                        </tr>
                        {g.eventos.map((e, i) => (
                          <tr
                            key={`${e.ticker}-${e.dataPagamento}-${i}`}
                            className="border-b border-border/40 last:border-0"
                          >
                            <td className="px-4 py-2 font-semibold">{e.ticker}</td>
                            <td className="px-3 py-2">
                              <Badge
                                variant="outline"
                                className={
                                  e.tipo === "JCP"
                                    ? "border-primary/40 text-primary"
                                    : "border-success/40 text-success"
                                }
                              >
                                {e.tipo}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {brl4(e.valorPorAcao)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                              {qty(e.quantidade)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-success">
                              {brl(e.total)}
                            </td>
                            <td className="px-3 py-2 text-center text-xs">
                              {dia(e.dataCom)}
                              {e.direitoGarantido && (
                                <span className="ml-1 text-[10px] text-success">✓</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                              {dia(e.dataEx)}
                            </td>
                            <td className="px-4 py-2 text-center text-xs font-medium">
                              {dia(e.dataPagamento)}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="space-y-4 p-3 md:hidden">
                {grupos.map((g) => (
                  <div key={`mobile-group-${g.ticker}`} className="space-y-2">
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{g.ticker}</span>
                        <span className="font-bold text-success">{brl(g.subtotal)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Total do ativo</p>
                    </div>
                    <div className="space-y-2 pl-2">
                      {g.eventos.map((e, i) => (
                        <div
                          key={`${e.ticker}-${e.dataPagamento}-${i}`}
                          className="rounded-lg border border-border/50 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{e.ticker}</span>
                            <Badge
                              variant="outline"
                              className={
                                e.tipo === "JCP"
                                  ? "border-primary/40 text-primary"
                                  : "border-success/40 text-success"
                              }
                            >
                              {e.tipo}
                            </Badge>
                            <span className="ml-auto font-semibold text-success">
                              {brl(e.total)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {brl4(e.valorPorAcao)} × {qty(e.quantidade)}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Com {dia(e.dataCom)} · Ex {dia(e.dataEx)} ·{" "}
                            <span className="font-medium text-foreground">
                              Pagamento {dia(e.dataPagamento)}
                            </span>
                          </p>
                          {e.direitoGarantido && (
                            <p className="mt-1 text-[11px] text-success">
                              Direito garantido (data com já passou)
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <footer className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Total previsto</span>
                <span className="font-bold text-success">{brl(total)}</span>
              </footer>
            </>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
