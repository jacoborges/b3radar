export interface PayoutEvent { tipo: string; valor: number; dataCom: string | null; dataPagamento: string | null }

/** Number of distinct years with a cash payout in each month (1-12), using payment date, else data com. */
export function payoutMonthCounts(events: PayoutEvent[]): number[] {
  const seen = Array.from({ length: 12 }, () => new Set<string>());
  for (const e of events) {
    if ((e.tipo !== "Dividendo" && e.tipo !== "JCP") || !(e.valor > 0)) continue;
    const d = e.dataPagamento || e.dataCom;
    if (!d) continue;
    const m = Number(d.slice(5, 7)) - 1;
    if (m >= 0 && m < 12) seen[m]!.add(d.slice(0, 4));
  }
  return seen.map((s) => s.size);
}
