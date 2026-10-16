import { describe, expect, it } from "vitest";
import { monthlyPerformance } from "./portfolio-timeline";

describe("Linha do tempo mensal da carteira", () => {
  const months = monthlyPerformance([{
    realizedSales: [{ soldAt: "2026-03-10", realized: 200 }, { soldAt: "2025-03-10", realized: 999 }],
    dividends: [{ dataCom: "2026-02-01", dataPagamento: "2026-03-20", total: 50 }],
    adjustments: [{ tipo: "Bonificacao", date: "2026-05-02", before: 100, after: 110 }],
    price: 12,
  }], 2026);
  it("soma realização e provento no mês do pagamento", () => { expect(months[2]!.total).toBe(250); });
  it("valoriza bonificação pelas ações recebidas", () => { expect(months[4]!.bonificacoes).toBe(120); });
  it("ignora outros anos", () => { expect(months.reduce((s, m) => s + m.realized, 0)).toBe(200); });
});
