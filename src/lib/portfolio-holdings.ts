import { portfolioLedger, type LedgerLot, type LedgerSale } from "./portfolio-ledger";

/** Ticker com quantidade líquida positiva em alguma carteira (lotes menos vendas). */
export interface HoldingSource {
  lots: Array<{ id?: string; ticker: string; price?: number; quantity: number; boughtAt?: string }>;
  sales: Array<{ id?: string; ticker: string; price?: number; quantity: number; soldAt?: string }>;
}

/** Posição aberta consolidada de um ticker em todas as carteiras do usuário. */
export interface HeldPosition {
  quantity: number;
  avgPrice: number;
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

/**
 * Posições abertas por ticker consolidando todas as carteiras, com quantidade
 * e preço médio calculados pelo ledger cronológico compartilhado (sem eventos
 * societários). Tickers com dados inconsistentes são ignorados.
 */
export function heldPositions(
  portfolios: HoldingSource[],
  today = new Date().toISOString().slice(0, 10),
): Map<string, HeldPosition> {
  const lotsBy = new Map<string, LedgerLot[]>();
  const salesBy = new Map<string, LedgerSale[]>();
  portfolios.forEach((p, pi) => {
    p.lots.forEach((l, i) => {
      const t = norm(l.ticker);
      if (!t) return;
      const arr = lotsBy.get(t) ?? [];
      arr.push({
        id: l.id ?? `${pi}-l${i}`,
        ticker: t,
        price: l.price ?? 0,
        quantity: l.quantity,
        boughtAt: l.boughtAt ?? today,
      });
      lotsBy.set(t, arr);
    });
    p.sales.forEach((s, i) => {
      const t = norm(s.ticker);
      if (!t) return;
      const arr = salesBy.get(t) ?? [];
      arr.push({
        id: s.id ?? `${pi}-s${i}`,
        ticker: t,
        price: s.price ?? 0,
        quantity: s.quantity,
        soldAt: s.soldAt ?? today,
      });
      salesBy.set(t, arr);
    });
  });
  const out = new Map<string, HeldPosition>();
  for (const [t, lots] of lotsBy) {
    try {
      const ledger = portfolioLedger(lots, salesBy.get(t) ?? [], [], today);
      if (ledger.quantity > 0)
        out.set(t, { quantity: ledger.quantity, avgPrice: ledger.avgPrice });
    } catch {
      // dados inconsistentes (ex.: venda maior que o saldo) não quebram a lista
    }
  }
  return out;
}
