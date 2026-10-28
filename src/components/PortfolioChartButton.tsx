import { useState } from "react";
import { ChartCandlestick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function PortfolioChartButton({ ticker, symbol }: { ticker: string; symbol?: string }) {
  const [loaded, setLoaded] = useState(false);
  const params = new URLSearchParams({
    symbol: symbol ?? `BMFBOVESPA:${ticker}`,
    interval: "D",
    timezone: "America/Sao_Paulo",
    theme: "dark",
    style: "1",
    locale: "br",
    allow_symbol_change: "0",
    hide_side_toolbar: "0",
    withdateranges: "1",
    details: "1",
    hotlist: "0",
    calendar: "0",
    support_host: "https://www.tradingview.com",
  });
  params.append("studies", "MASimple@tv-basicstudies");
  params.append("studies", "Volume@tv-basicstudies");

  return (
    <Dialog onOpenChange={() => setLoaded(false)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 gap-2" aria-label={`Ver gráfico de ${ticker}`}>
          <ChartCandlestick className="h-4 w-4" />
          Ver gráfico
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="left-0 top-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-none border-0 p-0 sm:p-0">
        <DialogTitle className="flex min-h-14 items-center gap-2 border-b border-border px-4 pr-14 text-sm">
          <ChartCandlestick className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{ticker} · TradingView</span>
        </DialogTitle>
        <div className="relative min-h-0 min-w-0">
          {!loaded && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Carregando gráfico…</div>}
          <iframe
            title={`Gráfico TradingView ${ticker}`}
            src={`https://s.tradingview.com/widgetembed/?${params.toString()}`}
            className="h-full w-full border-0"
            allow="clipboard-write; fullscreen"
            referrerPolicy="origin-when-cross-origin"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}