/** Ticker com quantidade líquida positiva em alguma carteira (lotes menos vendas). */
export interface HoldingSource {
  lots: Array<{ ticker: string; quantity: number }>;
  sales: Array<{ ticker: string; quantity: number }>;
}

const norm = (t: string) => t.trim().toUpperCase();

/**
 * Tickers realmente em carteira: soma lotes e subtrai vendas por ativo,
 * mantendo só quem ficou com quantidade positiva. Vendas completas somem da lista.
 */
export function heldTickers(portfolios: HoldingSource[]): string[] {
  const net = new Map<string, number>();
  for (const p of portfolios) {
    for (const l of p.lots) {
      const t = norm(l.ticker);
      if (!t) continue;
      net.set(t, (net.get(t) ?? 0) + l.quantity);
    }
    for (const s of p.sales) {
      const t = norm(s.ticker);
      if (!t) continue;
      net.set(t, (net.get(t) ?? 0) - s.quantity);
    }
  }
  return Array.from(net.entries())
    .filter(([, q]) => q > 0)
    .map(([t]) => t)
    .sort();
}
