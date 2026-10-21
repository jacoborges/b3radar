import { payoutMonthStates, type PayoutEvent } from "@/lib/payout-months";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Linha do tempo de proventos por mês:
 * - pago no ano atual: círculo aceso em verde (sólido)
 * - recorrente nos últimos anos: marcação mesclada que acende e apaga (verde pulsante)
 * - pago apenas no ano anterior: cinza
 * - meses sem pagamento: apagado
 */
export function PayoutMonthsTimeline({ events }: { events: PayoutEvent[] }) {
  const states = payoutMonthStates(events);
  return (
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
        const hint = lit
          ? "ano atual"
          : blink
            ? "recorrente"
            : dim
              ? "ano anterior"
              : null;
        const title = `${MONTHS[i]}: pagou em ${st.totalAnos} ano(s)${hint ? ` — ${hint}` : ""}`;
        return (
          <div key={i} className="relative flex w-7 flex-col items-center" title={title}>
            <span className={`h-2.5 w-2.5 rounded-full border ${cls}`} />
            <span className={`mt-0.5 text-[9px] ${lit ? "font-semibold text-success" : "text-muted-foreground"}`}>{MONTHS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
