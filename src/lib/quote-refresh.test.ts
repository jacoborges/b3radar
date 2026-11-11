import { describe, expect, it } from "vitest";
import { quoteRefreshBatches } from "./quote-refresh";

describe("manual quote refresh", () => {
  it("prioritizes portfolio assets even when absent from the displayed filters", () => {
    expect(quoteRefreshBatches(["PETR4", "VALE3"], ["ABEV3", "petr4"], 2)).toEqual([["PETR4", "VALE3"], ["ABEV3"]]);
  });
  it("refreshes assets beyond the automatic polling limit of 40", () => {
    const tickers = Array.from({ length: 95 }, (_, i) => `T${i}`);
    const batches = quoteRefreshBatches([], tickers);
    expect(batches.map(b => b.length)).toEqual([40, 40, 15]);
    expect(batches.flat()).toEqual(tickers);
  });
});
import { isMarketOpen, quoteTiers } from "./quote-refresh";

describe("quote priority tiers", () => {
  it("puts held and group assets first, sold before other displayed assets", () => {
    const t = quoteTiers({ held: ["petr4"], groups: ["VALE3", "PETR4"], sold: ["WEGE3", "ITUB4"], requested: ["ABEV3", "WEGE3", "PETR4", "AALR3"] });
    expect(t.priority).toEqual(["PETR4", "VALE3"]);
    expect(t.background).toEqual(["WEGE3", "AALR3", "ABEV3"]);
  });
  it("detects B3 trading hours in Brasília time", () => {
    expect(isMarketOpen(new Date("2026-11-11T14:00:00Z"))).toBe(true); // 11:00 BRT quarta
    expect(isMarketOpen(new Date("2026-11-11T22:00:00Z"))).toBe(false); // 19:00 BRT
    expect(isMarketOpen(new Date("2026-11-14T15:00:00Z"))).toBe(false); // sábado
  });
});
