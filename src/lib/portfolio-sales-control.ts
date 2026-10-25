import type { LedgerSale } from "./portfolio-ledger";

export const DEFAULT_MONTHLY_SALES_LIMIT = 20_000;
export const SALES_WARNING_RATIO = 0.85;
export const ESTIMATED_EQUITY_TAX_RATE = 0.15;

export function validateMonthlySalesLimit(limit: number) {
  if (!Number.isFinite(limit) || limit <= 0 || limit > 1_000_000_000) {
    throw new Error("Informe um limite maior que zero e até R$ 1 bilhão.");
  }
  return Math.round(limit * 100) / 100;
}

export interface SalesControlPosition {
  realizedSales: Array<LedgerSale & { realized: number }>;
}

/** Volume bruto e ganhos positivos; não é apuração fiscal líquida nem inclui proventos. */
export function monthlySalesControl(positions: SalesControlPosition[], year: number, limit = DEFAULT_MONTHLY_SALES_LIMIT) {
  validateMonthlySalesLimit(limit);
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, sold: 0, positiveGains: 0, losses: 0, estimatedTax: 0,
    percentage: 0, remaining: limit, exceeded: false, tone: "success" as "success" | "warning" | "destructive",
  }));
  for (const position of positions) {
    for (const sale of position.realizedSales) {
      if (Number(sale.soldAt.slice(0, 4)) !== year) continue;
      const month = months[Number(sale.soldAt.slice(5, 7)) - 1];
      if (!month) continue;
      month.sold += sale.quantity * sale.price;
      month.positiveGains += Math.max(0, sale.realized);
      month.losses += Math.min(0, sale.realized);
    }
  }
  for (const month of months) {
    month.sold = Math.round(month.sold * 100) / 100;
    month.positiveGains = Math.round(month.positiveGains * 100) / 100;
    month.losses = Math.round(month.losses * 100) / 100;
    month.percentage = month.sold / limit * 100;
    month.remaining = Math.max(0, limit - month.sold);
    month.exceeded = month.sold > limit;
    month.tone = month.exceeded ? "destructive" : month.sold >= limit * SALES_WARNING_RATIO ? "warning" : "success";
    month.estimatedTax = month.exceeded ? Math.round(month.positiveGains * ESTIMATED_EQUITY_TAX_RATE * 100) / 100 : 0;
  }
  return months;
}