import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  ticker: string | null;
  onClose: () => void;
}

export function TradingViewModal({ ticker, onClose }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [ticker]);

  const chartUrl = useMemo(() => {
    if (!ticker) return "";

    const params = new URLSearchParams({
      symbol: `BMFBOVESPA:${ticker}`,
      interval: "D",
      timezone: "America/Sao_Paulo",
      theme: "dark",
      style: "1",
      locale: "br",
      allow_symbol_change: "1",
      hide_side_toolbar: "0",
      withdateranges: "1",
      details: "1",
      hotlist: "0",
      calendar: "0",
      studies: JSON.stringify([
        "MASimple@tv-basicstudies",
        "Volume@tv-basicstudies",
      ]),
      support_host: "https://www.tradingview.com",
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [ticker]);

  return (
    <Dialog open={!!ticker} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 gap-0 border-border/60 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border/60 shrink-0">
          <DialogTitle className="font-mono text-primary">
            {ticker} — Gráfico TradingView
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gráfico interativo do TradingView para o ativo selecionado.
          </DialogDescription>
        </DialogHeader>
        <div className="relative flex-1 min-h-0 bg-background">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Carregando gráfico…
            </div>
          )}
          {chartUrl && (
            <iframe
              key={chartUrl}
              title={`Gráfico TradingView ${ticker}`}
              src={chartUrl}
              className="h-full w-full border-0"
              allow="clipboard-write; fullscreen"
              referrerPolicy="origin-when-cross-origin"
              onLoad={() => setLoaded(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
