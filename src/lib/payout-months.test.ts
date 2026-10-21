import { describe, expect, it } from "vitest";
import { payoutMonthStates, type PayoutEvent } from "./payout-months";

const ev = (dataPagamento: string, valor = 1): PayoutEvent => ({
  tipo: "Dividendo",
  valor,
  dataCom: dataPagamento,
  dataPagamento,
});

describe("payoutMonthStates", () => {
  const ATUAL = 2026;

  it("mês pago no ano atual fica aceso", () => {
    const st = payoutMonthStates([ev("2026-07-20")], ATUAL);
    expect(st[6].atual).toBe(true);
    expect(st[6].recorrente).toBe(false);
  });

  it("mês pago apenas no ano anterior fica em cinza", () => {
    const st = payoutMonthStates([ev("2025-03-10")], ATUAL);
    expect(st[2].anterior).toBe(true);
    expect(st[2].atual).toBe(false);
    expect(st[2].recorrente).toBe(false);
  });

  it("mês recorrente nos últimos 5 anos pisca", () => {
    const st = payoutMonthStates([ev("2025-02-10"), ev("2024-02-10"), ev("2019-02-10")], ATUAL);
    expect(st[1].recorrente).toBe(true);
    expect(st[1].totalAnos).toBe(3);
  });

  it("pagamentos antigos fora da janela de 5 anos não são recorrentes", () => {
    const st = payoutMonthStates([ev("2019-05-10"), ev("2018-05-10")], ATUAL);
    expect(st[4].recorrente).toBe(false);
    expect(st[4].totalAnos).toBe(2);
  });

  it("meses sem pagamento ficam apagados e eventos societários são ignorados", () => {
    const st = payoutMonthStates(
      [{ tipo: "Bonificacao", valor: 0, dataCom: "2026-01-01", dataPagamento: "2026-01-01" }],
      ATUAL,
    );
    expect(st.every((s) => !s.atual && !s.anterior && !s.recorrente)).toBe(true);
  });
});
