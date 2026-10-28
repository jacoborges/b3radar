import { describe, expect, it } from "vitest";
import { FUNDAMENTAL_KEYS } from "./indicators";
import {
  DEFAULT_STOCK_COLUMNS,
  normalizeStockColumns,
  PVP_FAIR_KEY,
  stockColumnLabel,
  STOCK_COLUMN_KEYS,
  withPvpFairColumn,
} from "./stock-columns";

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
  it("offers 'Justo P/VP=1' as a header option, right after P/VP", () => {
    expect(STOCK_COLUMN_KEYS).toContain(PVP_FAIR_KEY);
    expect(STOCK_COLUMN_KEYS.indexOf(PVP_FAIR_KEY)).toBe(STOCK_COLUMN_KEYS.indexOf("pvp") + 1);
    expect(stockColumnLabel(PVP_FAIR_KEY)).toBe("Justo P/VP=1");
  });
  it("keeps 'Justo P/VP=1' only once and drops it when the user unchecks it", () => {
    expect(normalizeStockColumns([PVP_FAIR_KEY, "pvp", PVP_FAIR_KEY])).toEqual([PVP_FAIR_KEY, "pvp"]);
    expect(normalizeStockColumns(["preco", "dy"])).toEqual(["preco", "dy"]);
  });
  it("ships the default header with 'Justo P/VP=1' right after the day column (so it lands after Bazin)", () => {
    expect(DEFAULT_STOCK_COLUMNS).toContain(PVP_FAIR_KEY);
    expect(DEFAULT_STOCK_COLUMNS[DEFAULT_STOCK_COLUMNS.indexOf("variacaoDia") + 1]).toBe(PVP_FAIR_KEY);
  });
  it("adds the column to saved preferences that predate it, in the default position", () => {
    expect(withPvpFairColumn(["preco", "variacaoDia", "dy", "pvp"])).toEqual(["preco", "variacaoDia", PVP_FAIR_KEY, "dy", "pvp"]);
    const already = ["preco", "variacaoDia", PVP_FAIR_KEY, "dy"];
    expect(withPvpFairColumn(already)).toBe(already);
    expect(withPvpFairColumn(["preco", "dy"])).toEqual(["preco", "dy", PVP_FAIR_KEY]);
  });
});
