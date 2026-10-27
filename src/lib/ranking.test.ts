import { describe, expect, it } from "vitest";
import { closeOnOrBefore, computeRankingRow, periodStart, sortRanking } from "./ranking";
import type { EventoSocietario } from "./dividend-intelligence";

const ev = (p: Partial<EventoSocietario>): EventoSocietario => ({
  tipo: "Dividendo", valor: 0, ratio: null, dataCom: null, dataEx: null,
  dataPagamento: null, dataAprovacao: null, ...p,
});

describe("ranking", () => {
  it("calcula as datas iniciais de 1 ano, 6 meses e 1 mês", () => {
    expect(periodStart("2026-10-27", "1y")).toBe("2025-10-27");
    expect(periodStart("2026-10-27", "6m")).toBe("2026-04-27");
    expect(periodStart("2026-10-27", "1m")).toBe("2026-09-27");
  });

  it("usa o último pregão até a data inicial", () => {
    const s = [{ date: "2025-10-24", close: 10 }, { date: "2025-10-28", close: 11 }];
    expect(closeOnOrBefore(s, "2025-10-26")).toEqual({ date: "2025-10-24", close: 10 });
  });

  it("soma 100 ações × proventos dentro do prazo e ignora os de fora", () => {
    const r = computeRankingRow("AAAA3", { date: "2025-10-27", close: 10 }, 12, [
      ev({ valor: 0.5, dataCom: "2026-01-10" }),
      ev({ tipo: "JCP", valor: 0.2, dataCom: "2026-05-10" }),
      ev({ valor: 9, dataCom: "2025-01-10" }),
    ], "2026-10-27");
    expect(r.valorizacao).toBe(200);
    expect(r.proventos).toBe(70);
    expect(r.retorno).toBe(270);
    expect(r.retornoPct).toBe(27);
  });

  it("ajusta a quantidade em desdobramento", () => {
    const r = computeRankingRow("BBBB3", { date: "2025-10-27", close: 20 }, 10, [
      ev({ tipo: "Desdobramento", ratio: "1:2", dataCom: "2026-03-01" }),
    ], "2026-10-27");
    expect(r.quantidadeFinal).toBe(200);
    expect(r.retorno).toBe(0);
  });

  it("ordena pelo maior retorno e deixa sem dados no fim", () => {
    const base = { dataInicial: null, precoInicial: null, precoAtual: null, quantidadeFinal: 100, valorizacao: null, proventos: 0, retorno: null };
    const out = sortRanking([
      { ...base, ticker: "A", retornoPct: null },
      { ...base, ticker: "B", retornoPct: 5 },
      { ...base, ticker: "C", retornoPct: 20 },
    ]);
    expect(out.map((r) => r.ticker)).toEqual(["C", "B", "A"]);
  });
});
