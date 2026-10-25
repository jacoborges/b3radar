import { describe, expect, it } from "vitest";
import { monthlySalesControl, validateMonthlySalesLimit, DEFAULT_MONTHLY_SALES_LIMIT } from "./portfolio-sales-control";
import { portfolioLedger } from "./portfolio-ledger";

const position = (sold: number, gain = 1000, month = "01") => ({ realizedSales: [{ id: `${month}-${sold}`, ticker: "TEST3", quantity: 100, price: sold / 100, soldAt: `2026-${month}-10`, realized: gain }] });
describe("Controle mensal de vendas", () => {
  it("usa limite padrão de R$ 20.000", () => { expect(DEFAULT_MONTHLY_SALES_LIMIT).toBe(20_000); });
  it("soma quantidade × preço de todos os ativos no mesmo mês", () => { expect(monthlySalesControl([position(10000), position(5000)], 2026)[0]?.sold).toBe(15000); });
  it("mantém meses e anos separados", () => { const m = monthlySalesControl([position(10000), position(5000, 1000, "02")], 2026); expect(m[1]?.sold).toBe(5000); expect(monthlySalesControl([position(10000)], 2025)[0]?.sold).toBe(0); });
  it("exclui proventos e preserva vendas de posição encerrada", () => {
    const ledger = portfolioLedger([{ id: "buy", ticker: "TEST3", quantity: 100, price: 100, boughtAt: "2025-01-01" }], position(15000).realizedSales, [{ tipo: "Dividendo", valor: 5, dataCom: "2025-02-01", dataEx: "2025-02-02", dataPagamento: "2026-01-05", dataAprovacao: null, ratio: null }], "2026-12-31");
    expect(ledger.quantity).toBe(0); expect(monthlySalesControl([ledger], 2026)[0]?.sold).toBe(15000);
  });
  it("mostra percentual e saldo restante", () => { const m = monthlySalesControl([position(10000)], 2026)[0]; expect(m?.percentage).toBe(50); expect(m?.remaining).toBe(10000); expect(m?.tone).toBe("success"); });
  it("fica amarelo a partir de R$ 17.000", () => { expect(monthlySalesControl([position(16999)], 2026)[0]?.tone).toBe("success"); expect(monthlySalesControl([position(17000)], 2026)[0]?.tone).toBe("warning"); });
  it("não aciona imposto ao atingir exatamente R$ 20.000", () => { const m = monthlySalesControl([position(20000)], 2026)[0]; expect(m?.exceeded).toBe(false); expect(m?.estimatedTax).toBe(0); });
  it("fica vermelho acima do limite e estima 15% dos ganhos positivos", () => { const m = monthlySalesControl([position(21000, 2000), position(1000, -500)], 2026)[0]; expect(m?.tone).toBe("destructive"); expect(m?.positiveGains).toBe(2000); expect(m?.losses).toBe(-500); expect(m?.estimatedTax).toBe(300); });
  it("recalcula percentual e alerta com limite personalizado", () => { const m = monthlySalesControl([position(9000)], 2026, 10000)[0]; expect(m?.percentage).toBe(90); expect(m?.tone).toBe("warning"); });
  it("não estima imposto sem ganhos positivos mesmo acima do limite", () => { expect(monthlySalesControl([position(25000, -500)], 2026)[0]?.estimatedTax).toBe(0); });
  it("rejeita limite inválido", () => { expect(() => validateMonthlySalesLimit(0)).toThrow(); expect(() => validateMonthlySalesLimit(NaN)).toThrow(); });
});