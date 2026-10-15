import { describe, expect, it } from "vitest";
import { portfolioLedger, dividendQuantity } from "./portfolio-ledger";
import type { EventoSocietario } from "./dividend-intelligence";
const lots = [{ id: "a", ticker: "TEST3", quantity: 100, price: 10, boughtAt: "2026-01-01" }];
const sale = { id: "b", ticker: "TEST3", quantity: 40, price: 15, soldAt: "2026-03-01" };
const event = (tipo: EventoSocietario["tipo"], date: string, valor = 1, ratio: string | null = null): EventoSocietario => ({ tipo, dataCom: date, dataEx: date, dataPagamento: "2026-05-01", dataAprovacao: null, valor, ratio });
describe("Carteira: vendas e histórico", () => {
  it("apura venda parcial pelo custo médio", () => {
    const p = portfolioLedger(lots, [sale], [], "2026-12-31");
    expect(p.quantity).toBe(60); expect(p.cost).toBe(600); expect(p.realized).toBe(200);
  });
  it("encerra posição sem perder vendas e proventos anteriores", () => {
    const p = portfolioLedger(lots, [{ ...sale, quantity: 100 }], [event("Dividendo", "2026-02-01"), event("JCP", "2026-04-01")], "2026-12-31");
    expect(p.quantity).toBe(0); expect(p.cost).toBe(0); expect(p.realized).toBe(500); expect(p.dividends.map(d => d.total)).toEqual([100]); expect(p.realizedSales).toHaveLength(1); expect(lots).toHaveLength(1);
  });
  it("aplica desdobramento antes de venda e preserva ajuste", () => {
    const p = portfolioLedger(lots, [{ ...sale, quantity: 200 }], [event("Desdobramento", "2026-02-01", 0, "1:2")], "2026-12-31");
    expect(p.quantity).toBe(0); expect(p.realized).toBe(2000); expect(p.adjustments[0]?.after).toBe(200);
  });
  it("preserva bonificação ao encerrar", () => {
    const p = portfolioLedger(lots, [{ ...sale, quantity: 110 }], [event("Bonificacao", "2026-02-01", 0, "10%")], "2026-12-31");
    expect(p.quantity).toBe(0); expect(p.adjustments[0]?.after).toBeCloseTo(110);
  });
  it("rejeita venda superior ao saldo na data", () => { expect(() => portfolioLedger(lots, [{ ...sale, quantity: 101 }], [], "2026-12-31")).toThrow("Saldo insuficiente"); });
  it("mantém direito após vender depois da Data Com", () => { expect(dividendQuantity(lots, [sale], [], "2026-02-01")).toBe(100); });
  it("retira ações vendidas até Data Com e exclui compras nessa data", () => { expect(dividendQuantity([...lots, { ...lots[0], id: "c", quantity: 20, boughtAt: "2026-04-01" }], [sale], [], "2026-04-01")).toBe(60); });
  it("reabre posição mantendo resultado realizado", () => {
    const p = portfolioLedger([...lots, { ...lots[0], id: "c", quantity: 10, price: 20, boughtAt: "2026-06-01" }], [{ ...sale, quantity: 100 }], [], "2026-12-31");
    expect(p.quantity).toBe(10); expect(p.avgPrice).toBe(20); expect(p.realized).toBe(500);
  });
});