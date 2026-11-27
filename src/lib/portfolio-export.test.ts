import { describe, expect, it } from "vitest";
import { buildPortfolioExport } from "./portfolio-export";

const base = { ticker: "TAEE11", quantity: 10, avgPrice: 30, invested: 300, price: 36, current: 360,
  lots: [{ price: 30, quantity: 10, boughtAt: "2026-01-10" }, { price: 32, quantity: 5, boughtAt: "2026-01-20" }],
  sales: [{ price: 35, quantity: 5, soldAt: "2026-03-02", realized: 20 }],
  dividends: [
    { tipo: "Dividendo", dataCom: "2026-02-01", dataPagamento: "2026-02-20", quantity: 15, total: 15, valor: 1 },
    { tipo: "JCP", dataCom: "2026-02-01", dataPagamento: "2026-02-20", quantity: 15, total: 7.5, valor: 0.5 },
    { tipo: "Dividendo", dataCom: "2026-11-01", dataPagamento: "2026-12-20", quantity: 10, total: 10, valor: 1 },
  ] };

describe("buildPortfolioExport", () => {
  const r = buildPortfolioExport([base], "2026-11-27");
  it("header: invested, current and change", () => {
    expect(r.invested).toBe(300); expect(r.current).toBe(360); expect(r.change).toBe(60); expect(r.changePct).toBeCloseTo(20);
  });
  it("counts only payouts already paid, split by dividend and JCP", () => {
    expect(r.dividendos).toBe(15); expect(r.jcp).toBe(7.5);
  });
  it("groups gross purchases and sales by month", () => {
    expect(r.contributions).toHaveLength(1); expect(r.contributions[0]?.total).toBe(460);
    expect(r.sales[0]?.month).toBe("2026-03"); expect(r.sales[0]?.total).toBe(175);
  });
});
