export interface TimelineInput {
  realizedSales: Array<{ soldAt: string; realized: number }>;
  dividends: Array<{ dataCom: string; dataPagamento: string | null; total: number }>;
  adjustments: Array<{ tipo: string; date: string; before: number; after: number }>;
  /** Price used to value bonus shares (current quote). */
  price: number | null;
}

export interface MonthPerformance {
  month: number; // 1-12
  realized: number;
  proventos: number;
  bonificacoes: number;
  total: number;
}

/** Monthly result for one year: realized sales + dividends (by payment date) + bonus shares valued at price. */
export function monthlyPerformance(positions: TimelineInput[], year: number): MonthPerformance[] {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, realized: 0, proventos: 0, bonificacoes: 0, total: 0 }));
  const slot = (date: string | null | undefined) => {
    if (!date || Number(date.slice(0, 4)) !== year) return null;
    return months[Number(date.slice(5, 7)) - 1] ?? null;
  };
  for (const p of positions) {
    for (const s of p.realizedSales) { const m = slot(s.soldAt); if (m) m.realized += s.realized; }
    for (const d of p.dividends) { const m = slot(d.dataPagamento || d.dataCom); if (m) m.proventos += d.total; }
    for (const a of p.adjustments) {
      if (a.tipo !== "Bonificacao" || !p.price) continue;
      const m = slot(a.date); if (m) m.bonificacoes += (a.after - a.before) * p.price;
    }
  }
  for (const m of months) m.total = m.realized + m.proventos + m.bonificacoes;
  return months;
}
