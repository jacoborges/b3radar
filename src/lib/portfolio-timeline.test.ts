import { describe, expect, it } from "vitest";
import { monthlyPerformance } from "./portfolio-timeline";
import { portfolioLedger } from "./portfolio-ledger";
import type { EventoSocietario } from "./dividend-intelligence";

describe("Linha do tempo mensal da carteira", () => {
  const months = monthlyPerformance([{
    realizedSales: [{ soldAt: "2026-03-10", realized: 200 }, { soldAt: "2025-03-10", realized: 999 }],
    dividends: [{ dataCom: "2026-02-01", dataPagamento: "2026-03-20", total: 50 }],
    adjustments: [{ tipo: "Bonificacao", date: "2026-05-02", before: 100, after: 110 }],
    price: 12,
  }], 2026);
  it("soma realização e provento no mês do pagamento", () => { expect(months[2]?.total).toBe(250); });
  it("valoriza bonificação pelas ações recebidas", () => { expect(months[4]?.bonificacoes).toBe(120); });
  it("ignora outros anos", () => { expect(months.reduce((s, m) => s + m.realized, 0)).toBe(200); });
});

describe("Linha do tempo preserva posições encerradas", () => {
  const lots = [{ id: "compra", ticker: "TEST3", quantity: 100, price: 10, boughtAt: "2026-01-10" }];
  const sales = [{ id: "venda", ticker: "TEST3", quantity: 100, price: 15, soldAt: "2026-03-10" }];
  const dividend = (dataCom: string, dataPagamento: string, tipo: "Dividendo" | "JCP" = "Dividendo"): EventoSocietario => ({
    tipo, dataCom, dataPagamento, dataEx: dataCom, dataAprovacao: null, valor: 2, ratio: null,
  });
  const ledger = portfolioLedger(lots, sales, [
    dividend("2026-02-10", "2026-04-20"),
    dividend("2026-02-15", "2026-04-25", "JCP"),
    dividend("2026-04-10", "2026-05-20"),
  ], "2026-12-31");
  const history = monthlyPerformance([{ ...ledger, price: 15 }], 2026);

  it("inclui lucro da venda no mês do encerramento mesmo sem saldo", () => {
    expect(ledger.quantity).toBe(0);
    expect(history[2]?.realized).toBe(500);
    expect(history[2]?.total).toBe(500);
  });
  it("inclui dividendos e JCP do período de posse pagos após o encerramento", () => {
    expect(history[3]?.proventos).toBe(400);
    expect(history[3]?.total).toBe(400);
    expect(history[1]?.proventos).toBe(0);
  });
  it("não inclui proventos cuja data com é posterior ao encerramento", () => {
    expect(history[4]?.proventos).toBe(0);
  });
  it("mantém perdas realizadas no mês da venda", () => {
    const loss = portfolioLedger(lots, [{ ...sales[0], price: 8 }], [], "2026-12-31");
    expect(monthlyPerformance([{ ...loss, price: 8 }], 2026)[2]?.total).toBe(-200);
  });
  it("soma posições ativas e encerradas sem transferir resultados entre meses", () => {
    const active = portfolioLedger([{ ...lots[0], id: "ativa", ticker: "ACTIVE3" }], [], [dividend("2026-02-10", "2026-03-20")], "2026-12-31");
    const combined = monthlyPerformance([{ ...ledger, price: 15 }, { ...active, price: 12 }], 2026);
    expect(combined[2]?.total).toBe(700);
    expect(combined[3]?.total).toBe(400);
    expect(combined.reduce((sum, month) => sum + month.total, 0)).toBe(1100);
  });
});
