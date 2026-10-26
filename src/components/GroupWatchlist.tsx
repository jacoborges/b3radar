import { useMemo } from "react";
import { useAllStocks } from "@/hooks/use-all-stocks";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import { useStockSort } from "@/hooks/use-stock-sort";
import { compareStocks } from "@/lib/stock-sort";
import type { StockGroup } from "@/lib/stock-groups";
import { StockGroupMarker } from "@/components/StockGroupMarker";
import { PortfolioChartButton } from "@/components/PortfolioChartButton";
import { StockMetricsStrip } from "@/components/StockMetricColumns";

const brl = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Watchlist view of a tracking group; no ledger or position calculations. */
export function GroupWatchlist({ group }: { group: StockGroup }) {
  const { stocks } = useAllStocks({ allSectors: true });
  const [sort] = useStockSort();
  const quotes = useLiveQuotes(group.tickers);

  const rows = useMemo(() => {
    const byTicker = new Map(stocks.map((s) => [s.ticker, s]));
    return group.tickers
      .map((ticker) => {
        const base = byTicker.get(ticker);
        const live = quotes.map.get(ticker);
        const preco = live?.price && live.price > 0 ? live.price : base?.preco ?? null;
        return { ticker, base, preco, change: live?.changePercent ?? base?.variacaoDia ?? null };
      })
      .sort((a, b) => compareStocks({ ...a.base, ticker: a.ticker, preco: a.preco }, { ...b.base, ticker: b.ticker, preco: b.preco }, sort));
  }, [group.tickers, stocks, quotes.map, sort]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: group.color }} />
        <div>
          <h2 className="text-lg font-semibold">{group.name}</h2>
          <p className="text-xs text-muted-foreground">{group.tickers.length} ativo(s) em acompanhamento</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhum ativo neste grupo — marque ativos pelo quadrado ao lado do ticker.
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.ticker} className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex flex-wrap items-center gap-3">
              <StockGroupMarker ticker={r.ticker} />
              <div className="min-w-0">
                <p className="font-mono font-semibold">{r.ticker}</p>
                <p className="truncate text-xs text-muted-foreground">{r.base?.empresa ?? ""}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-mono text-sm">{brl(r.preco)}</p>
                {typeof r.change === "number" && (
                  <p className={`text-xs font-medium ${r.change >= 0 ? "text-success" : "text-destructive"}`}>
                    {r.change >= 0 ? "+" : ""}{r.change.toFixed(2)}%
                  </p>
                )}
              </div>
              <PortfolioChartButton ticker={r.ticker} />
            </div>
            {r.base && <div className="mt-2"><StockMetricsStrip stock={{ ...r.base, preco: r.preco ?? r.base.preco }} /></div>}
          </div>
        ))
      )}
    </div>
  );
}
