import { describe, expect, it } from "vitest";
import {
  formatPayoutDate,
  lastPayoutDateInMonth,
  payoutMonthStates,
  type PayoutEvent,
} from "./payout-months";

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

describe("lastPayoutDateInMonth", () => {
  const ATUAL = 2026;

  it("prioriza o ano atual mesmo quando um ano antigo tem dia maior", () => {
    const d = lastPayoutDateInMonth([ev("2025-07-30"), ev("2026-07-08")], 6, ATUAL);
    expect(d).toBe("2026-07-08");
  });

  it("recua para o ano anterior quando o ano atual não tem pagamento", () => {
    const d = lastPayoutDateInMonth([ev("2024-03-05"), ev("2025-03-27")], 2, ATUAL);
    expect(d).toBe("2025-03-27");
  });

  it("recua mais anos quando os recentes não pagaram naquele mês", () => {
    const d = lastPayoutDateInMonth([ev("2021-11-12"), ev("2019-11-20")], 10, ATUAL);
    expect(d).toBe("2021-11-12");
  });

  it("retorna null para mês sem pagamento", () => {
    expect(lastPayoutDateInMonth([ev("2026-01-15")], 5, ATUAL)).toBeNull();
  });

  it("ignora eventos societários e valores zerados", () => {
    const events: PayoutEvent[] = [
      { tipo: "Bonificacao", valor: 0, dataCom: "2026-01-10", dataPagamento: "2026-01-10" },
      { tipo: "Dividendo", valor: 0, dataCom: "2026-01-20", dataPagamento: "2026-01-20" },
    ];
    expect(lastPayoutDateInMonth(events, 0, ATUAL)).toBeNull();
  });

  it("usa o pagamento mais recente do ano quando há mais de um", () => {
    const d = lastPayoutDateInMonth([ev("2026-08-05"), ev("2026-08-28")], 7, ATUAL);
    expect(d).toBe("2026-08-28");
  });

  it("formata a data no padrão brasileiro", () => {
    expect(formatPayoutDate("2026-12-15")).toBe("15/12/2026");
    expect(formatPayoutDate(null)).toBeNull();
  });
});
