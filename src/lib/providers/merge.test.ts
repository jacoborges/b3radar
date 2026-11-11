import { describe, expect, it } from "vitest";
import { fillMissing, shouldFallback, tickersForAlt, altQuoteOrder } from "./merge";

describe("modo híbrido", () => {
  it("somente BRAPI nunca consulta alternativas", () => {
    expect(tickersForAlt("brapi", ["PETR4"], new Set())).toEqual([]);
  });
  it("híbrido consulta só o que a BRAPI não devolveu", () => {
    expect(tickersForAlt("hybrid", ["PETR4", "VALE3"], new Set(["PETR4"]))).toEqual(["VALE3"]);
  });
  it("prioridade alternativa consulta todos", () => {
    expect(tickersForAlt("alt_first", ["PETR4", "VALE3"], new Set(["PETR4"]))).toEqual(["PETR4", "VALE3"]);
  });
  it("preço: HG Brasil antes de Bolsai, só com chave", () => {
    expect(altQuoteOrder({ bolsai: true, hgbrasil: true })).toEqual(["hgbrasil", "bolsai"]);
    expect(altQuoteOrder({ bolsai: true })).toEqual(["bolsai"]);
  });
  it("campos vazios são preenchidos pela fonte seguinte, sem sobrescrever", () => {
    expect(fillMissing<{ pl: number | null; roe: number | null }>({ pl: 5, roe: null }, { pl: 9, roe: 12 })).toEqual({ pl: 5, roe: 12 });
  });
  it("401, 429 e falha de rede fazem cair para a próxima fonte; 200 não", () => {
    expect(shouldFallback(401)).toBe(true);
    expect(shouldFallback(429)).toBe(true);
    expect(shouldFallback(0)).toBe(true);
    expect(shouldFallback(200)).toBe(false);
  });
});
