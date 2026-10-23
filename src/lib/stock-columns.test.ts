import { describe, expect, it } from "vitest";
import { FUNDAMENTAL_KEYS } from "./indicators";
import { DEFAULT_STOCK_COLUMNS, normalizeStockColumns } from "./stock-columns";

describe("shared stock columns", () => {
  it("never repeats a fundamental indicator", () => {
    expect(normalizeStockColumns(["preco", "pl", "preco", "dy", "pl"])).toEqual(["preco", "pl", "dy"]);
    expect(new Set(DEFAULT_STOCK_COLUMNS).size).toBe(DEFAULT_STOCK_COLUMNS.length);
  });
  it("accepts every fundamental option and rejects unknown fields", () => {
    expect(normalizeStockColumns([...FUNDAMENTAL_KEYS, "unknown"])).toEqual([...FUNDAMENTAL_KEYS]);
  });
  it("allows clearing all optional columns while keeping valid defaults for invalid storage", () => {
    expect(normalizeStockColumns([])).toEqual([]);
    expect(normalizeStockColumns(null)).toEqual(DEFAULT_STOCK_COLUMNS);
  });
});