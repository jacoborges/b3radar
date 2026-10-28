import { describe, expect, it } from "vitest";
import { fairPriceAtPvp1 } from "./pvp-fair";

describe("fairPriceAtPvp1", () => {
  it("descontada: 20 / 0,8 = 25", () => expect(fairPriceAtPvp1(20, 0.8)).toBeCloseTo(25));
  it("valorizada: 20 / 2 = 10", () => expect(fairPriceAtPvp1(20, 2)).toBeCloseTo(10));
  it("P/VP inválido retorna null", () => {
    expect(fairPriceAtPvp1(20, 0)).toBeNull();
    expect(fairPriceAtPvp1(20, -1)).toBeNull();
    expect(fairPriceAtPvp1(20, undefined)).toBeNull();
  });
});
