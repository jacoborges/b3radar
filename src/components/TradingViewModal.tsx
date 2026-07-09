import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  ticker: string | null;
  onClose: () => void;
}

export function TradingViewModal({ ticker, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BMFBOVESPA:${ticker}`,
      interval: "D",
      timezone: "America/Sao_Paulo",
      theme: "dark",
      style: "1",
      locale: "br",
      backgroundColor: "rgba(15, 15, 20, 1)",
      gridColor: "rgba(90, 90, 105, 0.1)",
      allow_symbol_change: true,
      hide_side_toolbar: false,
      studies: ["MASimple@tv-basicstudies", "Volume@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);
  }, [ticker]);

  return (
    <Dialog open={!!ticker} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0 border-border/60">
        <DialogHeader className="px-6 py-4 border-b border-border/60">
          <DialogTitle className="font-mono text-primary">
            {ticker} — Gráfico TradingView
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-background">
          <div
            className="tradingview-widget-container h-full w-full"
            ref={containerRef}
          >
            <div className="tradingview-widget-container__widget h-full w-full" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
