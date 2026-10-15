import type { EventoSocietario } from "./dividend-intelligence";
import { parseFatorEvento } from "./sim-portfolio";

export interface LedgerLot { id: string; ticker: string; price: number; quantity: number; boughtAt: string }
export interface LedgerSale { id: string; ticker: string; price: number; quantity: number; soldAt: string }
export interface LedgerDividend { tipo: string; dataCom: string; dataPagamento: string | null; quantity: number; total: number; valor: number }
export interface LedgerAdjustment { tipo: string; date: string; before: number; after: number; factor: number }

/** Moving-average cost, with FIFO lot depletion solely for entitlement dates. */
export function portfolioLedger(lots: LedgerLot[], sales: LedgerSale[], events: EventoSocietario[], until: string) {
  const timeline = [
    ...lots.map(lot => ({ date: lot.boughtAt, rank: 0, lot })),
    ...sales.map(sale => ({ date: sale.soldAt, rank: 2, sale })),
    ...events.filter(e => e.dataCom).map(event => ({ date: event.dataCom ?? "", rank: 1, event })),
  ].filter(t => t.date <= until).sort((a, b) => a.date.localeCompare(b.date) || a.rank - b.rank);
  const holdings: Array<{ date: string; quantity: number }> = [];
  const dividends: LedgerDividend[] = [];
  const adjustments: LedgerAdjustment[] = [];
  const realizedSales: Array<LedgerSale & { cost: number; realized: number }> = [];
  const warnings: string[] = [];
  let quantity = 0, cost = 0, realized = 0, proceeds = 0;
  for (const item of timeline) {
    if ("lot" in item) {
      quantity += item.lot.quantity;
      cost += item.lot.quantity * item.lot.price;
      holdings.push({ date: item.date, quantity: item.lot.quantity });
    } else if ("sale" in item) {
      const sale = item.sale;
      if (sale.quantity > quantity + 1e-8) throw new Error(`Saldo insuficiente em ${sale.soldAt}: disponível ${quantity.toLocaleString("pt-BR")} ações.`);
      const removedCost = quantity > 0 ? cost / quantity * sale.quantity : 0;
      const result = sale.price * sale.quantity - removedCost;
      realized += result;
      proceeds += sale.price * sale.quantity;
      realizedSales.push({ ...sale, cost: removedCost, realized: result });
      cost = Math.max(0, cost - removedCost);
      quantity = Math.max(0, quantity - sale.quantity);
      let remaining = sale.quantity;
      for (const holding of holdings) {
        const removed = Math.min(holding.quantity, remaining);
        holding.quantity -= removed;
        remaining -= removed;
      }
      if (quantity < 1e-8) { quantity = 0; cost = 0; }
    } else if ("event" in item) {
      const event = item.event;
      const eligible = holdings.filter(h => h.date < item.date);
      const eligibleQty = eligible.reduce((s, h) => s + h.quantity, 0);
      if (eligibleQty <= 0) continue;
      if (event.tipo === "Dividendo" || event.tipo === "JCP") {
        if (event.valor > 0) dividends.push({ tipo: event.tipo, dataCom: item.date, dataPagamento: event.dataPagamento, quantity: eligibleQty, total: eligibleQty * event.valor, valor: event.valor });
      } else {
        const parsed = parseFatorEvento(event.tipo, event.ratio);
        if (!parsed.ok) { warnings.push(`${event.tipo} em ${item.date}: proporção indisponível.`); continue; }
        // Entitlement on Data Com, quantity becomes tradable on Data Ex.
        const effective = event.dataEx || item.date;
        if (effective > until) continue;
        const before = quantity;
        for (const h of eligible) h.quantity *= parsed.fator;
        quantity += eligibleQty * (parsed.fator - 1);
        adjustments.push({ tipo: event.tipo, date: effective, before, after: quantity, factor: parsed.fator });
      }
    }
  }
  return { quantity, cost, avgPrice: quantity > 0 ? cost / quantity : 0, realized, proceeds, dividends, adjustments, realizedSales, warnings };
}

export function dividendQuantity(lots: LedgerLot[], sales: LedgerSale[], events: EventoSocietario[], dataCom: string) {
  // Preserve the established rule: purchases strictly before Data Com.
  return portfolioLedger(lots.filter(l => l.boughtAt < dataCom), sales.filter(s => s.soldAt <= dataCom), events.filter(e => e.tipo !== "Dividendo" && e.tipo !== "JCP" && (e.dataEx || e.dataCom || "") <= dataCom), dataCom).quantity;
}