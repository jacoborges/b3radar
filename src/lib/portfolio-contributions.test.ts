import { describe, expect, it } from "vitest";
import { monthlyContributions } from "./portfolio-contributions";
import { portfolioLedger } from "./portfolio-ledger";

describe("Aportes mensais da carteira", () => {
  const lots = [
    { id: "a", ticker: "TAEE4", boughtAt: "2026-01-10", quantity: 100, price: 12.5 },
    { id: "b", ticker: "TAEE11", boughtAt: "2026-01-20", quantity: 20, price: 36 },
    { id: "c", ticker: "TAEE4", boughtAt: "2026-02-10", quantity: 10, price: 13.25 },
    { id: "d", ticker: "TAEE4", boughtAt: "2025-01-10", quantity: 1, price: 10 },
  ];
  it("soma quantidade vezes preço das compras de cada mês", () => {
    const months = monthlyContributions(lots, 2026);
    expect(months[0]?.total).toBe(1970);
    expect(months[1]?.total).toBe(132.5);
    expect(months[0]?.purchases).toHaveLength(2);
  });
  it("mantém os anos separados e os meses sem compra zerados", () => {
    const months = monthlyContributions(lots, 2026);
    expect(months).toHaveLength(12);
    expect(months[2]?.total).toBe(0);
    expect(months.reduce((sum, month) => sum + month.total, 0)).toBe(2102.5);
    expect(monthlyContributions(lots, 2025)[0]?.total).toBe(10);
  });
  it("preserva o aporte original de posição encerrada sem descontar a venda", () => {
    const purchases = lots.filter(lot => lot.id === "a");
    const ledger = portfolioLedger(purchases, [
      { id: "sale", ticker: "TAEE4", soldAt: "2026-02-01", quantity: 100, price: 15 },
    ], [], "2026-12-31");
    expect(ledger.quantity).toBe(0);
    expect(monthlyContributions(purchases, 2026)[0]?.total).toBe(1250);
    expect(monthlyContributions(purchases, 2026)[1]?.total).toBe(0);
  });
});