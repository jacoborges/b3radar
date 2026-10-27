import { describe, it, expect } from "vitest";
import { simulateAveragePrice } from "./rebalance";

describe("simulateAveragePrice", () => {
  it("pondera posição atual e nova compra", () => {
    const r = simulateAveragePrice(100, 10, 100, 20);
    expect(r.finalQty).toBe(200);
    expect(r.newAvg).toBe(15);
    expect(r.cost).toBe(2000);
  });
});
