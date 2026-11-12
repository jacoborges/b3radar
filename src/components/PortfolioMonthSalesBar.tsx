import { useMemo } from "react";
import { currentMonthSalesProgress, type SalesControlPosition } from "@/lib/portfolio-sales-control";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fill = { success: "bg-success", warning: "bg-warning", destructive: "bg-destructive" };
const text = { success: "text-muted-foreground", warning: "text-warning", destructive: "text-destructive" };

/** Barra 0–100% das vendas do mês vigente frente ao limite: soma a corretora inteira quando a carteira tem uma. */
export function PortfolioMonthSalesBar({ positions, today, limit, brokerName }: { positions: SalesControlPosition[]; today: string; limit: number; brokerName?: string | null }) {
  const p = useMemo(() => currentMonthSalesProgress(positions, today, limit), [positions, today, limit]);
  const pct = p.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return (
    <div className="mt-2" title={`Vendido neste mês ${brokerName ? `na corretora ${brokerName} (todas as carteiras dela)` : "nesta carteira"}: ${brl(p.sold)} de ${brl(limit)}`}>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="truncate text-muted-foreground">Vendas no mês{brokerName ? ` · ${brokerName}` : ""}</span>
        <span className={`shrink-0 font-mono tabular-nums ${text[p.tone]}`}>{brl(p.sold)} · {pct}%</span>
      </div>
      <div role="progressbar" aria-label="Vendas do mês em relação ao limite" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.bar)} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${fill[p.tone]}`} style={{ width: `${p.bar}%` }} />
      </div>
    </div>
  );
}
