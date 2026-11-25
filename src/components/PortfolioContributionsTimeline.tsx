import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { monthlyContributions, type ContributionLot } from "@/lib/portfolio-contributions";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const compact = (value: number) => value.toLocaleString("pt-BR", {
  notation: "compact", maximumFractionDigits: 1,
});

export function PortfolioContributionsTimeline({ lots, year }: { lots: ContributionLot[]; year: number }) {
  const months = useMemo(() => monthlyContributions(lots, year), [lots, year]);
  const [open, setOpen] = useState<number | null>(null);
  const selected = open === null ? null : months[open - 1];
  const total = months.reduce((sum, month) => sum + month.total, 0);

  return (
    <section aria-label="Aportes mensais" className="border-b border-border/60 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Aportes mensais</h3>
        <div className="flex items-center gap-3 text-sm tabular-nums">
          <span>{year}</span>
          <span className="text-xs font-semibold text-primary">{brl(total)}</span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="relative flex min-w-[860px] justify-between gap-2 px-2">
          <div className="absolute left-8 right-8 top-8 h-px bg-border" />
          {months.map(month => (
            <div key={month.month} className="relative z-10 flex w-16 shrink-0 flex-col items-center gap-1">
              <Button
                variant="ghost"
                aria-label={`Aportes ${MONTHS[month.month - 1]} ${year}: ${brl(month.total)}`}
                aria-pressed={open === month.month}
                title={brl(month.total)}
                onClick={() => setOpen(open === month.month ? null : month.month)}
                className={`h-16 w-16 shrink-0 flex-col gap-0 rounded-full border-2 p-1 tabular-nums ${month.total > 0 ? "border-primary bg-primary/15 text-primary hover:bg-primary/25" : "border-border bg-muted text-muted-foreground"} ${open === month.month ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              >
                <span className="text-[9px]">R$</span>
                <span className="text-[11px] font-semibold">{compact(month.total)}</span>
              </Button>
              <span className="text-[11px] text-muted-foreground">{MONTHS[month.month - 1]}</span>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <div className="mt-3 border-t border-border/60 pt-3 text-xs">
          <div className="mb-2 flex flex-wrap justify-between gap-2 font-semibold">
            <span>Aportes · {MONTHS[selected.month - 1]} {year}</span>
            <span className="tabular-nums">{brl(selected.total)}</span>
          </div>
          {selected.purchases.length === 0 ? <p className="text-muted-foreground">Nenhuma compra registrada neste mês.</p> : (
            <div className="space-y-2">
              {selected.purchases.map((lot, index) => (
                <div key={index} className="flex flex-wrap items-center justify-between gap-2">
                  <span><span className="font-medium">{lot.ticker}</span> · {lot.boughtAt.split("-").reverse().join("/")} · {lot.quantity.toLocaleString("pt-BR")} × {brl(lot.price)}</span>
                  <span className="tabular-nums">{brl(lot.quantity * lot.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}