import { useBazinEvents } from "@/hooks/use-bazin-events";
import { PayoutMonthsTimeline } from "@/components/PayoutMonthsTimeline";

/** Mesma linha do tempo de Proventos, lida do cache compartilhado de proventos. */
export function TickerPayoutTimeline({ ticker }: { ticker: string }) {
  const events = useBazinEvents(true).get(ticker) ?? [];
  return <PayoutMonthsTimeline events={events} />;
}
