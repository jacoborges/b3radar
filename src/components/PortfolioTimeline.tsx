import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthlyPerformance, type TimelineInput } from "@/lib/portfolio-timeline";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PortfolioTimeline({ name, positions }: { name: string; positions: TimelineInput[] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const months = useMemo(() => monthlyPerformance(positions, year), [positions, year]);
  const [open, setOpen] = useState<number | null>(null);
  const total = months.reduce((s, m) => s + m.total, 0);
  const sel = open != null ? months[open - 1] : null;
  return (
    <section className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Linha do tempo · {name}</h3>
        <div className="flex items-center gap-1 text-sm">
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Ano anterior" onClick={() => setYear(year - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="tabular-nums">{year}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Próximo ano" onClick={() => setYear(year + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className={`ml-2 text-xs font-semibold ${total > 0 ? "text-success" : total < 0 ? "text-destructive" : "text-muted-foreground"}`}>{brl(total)}</span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="relative flex min-w-[560px] justify-between px-2">
          <div className="absolute left-4 right-4 top-[14px] h-px bg-border" />
          {months.map((m) => {
            const tone = m.total > 0 ? "bg-success border-success" : m.total < 0 ? "bg-destructive border-destructive" : "bg-muted border-border";
            return (
              <button key={m.month} type="button" onClick={() => setOpen(open === m.month ? null : m.month)} className="relative z-10 flex w-11 flex-col items-center gap-1" aria-label={`${MESES[m.month - 1]}: ${brl(m.total)}`}>
                <span className={`h-7 w-7 rounded-full border-2 ${tone} ${open === m.month ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`} />
                <span className="text-[11px] text-muted-foreground">{MESES[m.month - 1]}</span>
                <span className={`text-[10px] tabular-nums ${m.total > 0 ? "text-success" : m.total < 0 ? "text-destructive" : "text-muted-foreground"}`}>{m.total === 0 ? "—" : Math.abs(m.total) >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : m.total.toFixed(0)}</span>
              </button>
            );
          })}
        </div>
      </div>
      {sel && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-4">
          <div><div className="text-muted-foreground">Realizações</div><div className="font-medium">{brl(sel.realized)}</div></div>
          <div><div className="text-muted-foreground">Proventos</div><div className="font-medium">{brl(sel.proventos)}</div></div>
          <div><div className="text-muted-foreground">Bonificações</div><div className="font-medium">{brl(sel.bonificacoes)}</div></div>
          <div><div className="text-muted-foreground">Total do mês</div><div className="font-semibold">{brl(sel.total)}</div></div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">Toque em um mês para ver o detalhe. Proventos entram no mês do pagamento; bonificações são valorizadas pela cotação atual.</p>
    </section>
  );
}
