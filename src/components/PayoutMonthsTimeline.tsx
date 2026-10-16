import { payoutMonthCounts, type PayoutEvent } from "@/lib/payout-months";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function PayoutMonthsTimeline({ events }: { events: PayoutEvent[] }) {
  const counts = payoutMonthCounts(events);
  const max = Math.max(...counts);
  return (
    <div className="relative mt-2 grid w-max grid-cols-12 gap-1">
      <div className="absolute left-2 right-2 top-[5px] h-px bg-border/60" />
      {counts.map((c, i) => {
        const top = c > 0 && c === max;
        const cls = top
          ? "bg-success border-success shadow-[0_0_6px_var(--success)]"
          : c > 0
            ? "bg-muted-foreground/50 border-muted-foreground/60"
            : "bg-background border-border";
        return (
          <div key={i} className="relative flex w-7 flex-col items-center" title={`${MONTHS[i]}: pagou em ${c} ano(s)`}>
            <span className={`h-2.5 w-2.5 rounded-full border ${cls}`} />
            <span className={`mt-0.5 text-[9px] ${top ? "font-semibold text-success" : "text-muted-foreground"}`}>{MONTHS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
