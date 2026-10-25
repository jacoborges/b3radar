import { describe, expect, it } from "vitest";
import { grahamFairPrice, grahamFromMultiples } from "./graham";

describe("Graham", () => {
  it("LPA 4 e VPA 20 resultam em R$ 42,43", () => {
    expect(grahamFairPrice({ lpa: 4, vpa: 20 }).precoJusto).toBeCloseTo(42.426, 2);
  });
  it("margem de segurança a R$ 30", () => {
    expect(grahamFairPrice({ lpa: 4, vpa: 20, preco: 30 }).margem).toBeCloseTo(41.42, 1);
  });
  it("lucro negativo não é aplicável", () => {
    expect(grahamFairPrice({ lpa: -1, vpa: 20 }).aplicavel).toBe(false);
  });
  it("deriva de P/L e P/VP", () => {
    expect(grahamFromMultiples({ preco: 30, pl: 7.5, pvp: 1.5 }).precoJusto).toBeCloseTo(42.426, 2);
  });
});
