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