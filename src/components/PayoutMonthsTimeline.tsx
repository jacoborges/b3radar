import {
  formatPayoutDate,
  lastPayoutDateInMonth,
  payoutMonthStates,
  type PayoutEvent,
} from "@/lib/payout-months";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/**
 * Linha do tempo de proventos por mês:
 * - pago no ano atual: círculo aceso em verde (sólido)
 * - recorrente nos últimos anos: marcação mesclada que acende e apaga (verde pulsante)
 * - pago apenas no ano anterior: cinza
 * - meses sem pagamento: apagado
 *
 * Ao passar o mouse, mostra a última data de pagamento daquele mês
 * (começando pelo ano atual e recuando ano a ano).
 */
export function PayoutMonthsTimeline({ events }: { events: PayoutEvent[] }) {
  const anoAtual = new Date().getUTCFullYear();
  const states = payoutMonthStates(events, anoAtual);
  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <div className="relative mt-2 grid w-max grid-cols-12 gap-1">
        <div className="absolute left-2 right-2 top-[5px] h-px bg-border/60" />
        {states.map((st, i) => {
          const lit = st.atual;
          const blink = !lit && st.recorrente;
          const dim = !lit && !blink && st.anterior;
          const cls = lit
            ? "bg-success border-success shadow-[0_0_6px_var(--success)]"
            : blink
              ? "bg-success/60 border-success/70 animate-pulse"
              : dim
                ? "bg-muted-foreground/50 border-muted-foreground/60"
                : "bg-background border-border";
          const hint = lit ? "ano atual" : blink ? "recorrente" : dim ? "ano anterior" : null;
          const ultima = formatPayoutDate(lastPayoutDateInMonth(events, i, anoAtual));
          const title = ultima
            ? `${MONTHS_FULL[i]} — último pagamento em ${ultima}`
            : `${MONTHS_FULL[i]} — sem pagamento registrado`;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div className="relative flex w-7 cursor-help flex-col items-center">
                  <span className={`h-2.5 w-2.5 rounded-full border ${cls}`} />
                  <span
                    className={`mt-0.5 text-[9px] ${lit ? "font-semibold text-success" : "text-muted-foreground"}`}
                  >
                    {MONTHS[i]}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center leading-snug">
                <span className="font-semibold">{title}</span>
                {hint ? <span className="block opacity-80">pagou em {st.totalAnos} ano(s) — {hint}</span> : null}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
