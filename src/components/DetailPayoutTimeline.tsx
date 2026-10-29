import { useMemo } from "react";
import type { Stock } from "@/lib/stocks-data";
import { useDividendBatch } from "@/hooks/use-dividend-batch";
import { PayoutMonthsTimeline } from "@/components/PayoutMonthsTimeline";

/** Mesma linha do tempo da Inteligência de Proventos, para um único ativo. */
export function DetailPayoutTimeline({ stock }: { stock: Stock }) {
  const list = useMemo(() => [stock], [stock.ticker]); // eslint-disable-line react-hooks/exhaustive-deps
  const { rows } = useDividendBatch(list);
  const events = rows[0]?.raw?.historicoCompleto ?? [];
  return (
    <div className="mt-2">
      <PayoutMonthsTimeline events={events} />
      {events.length === 0 && <div className="mt-1 text-[10px] text-muted-foreground">sem histórico de proventos</div>}
    </div>
  );
}
