import { describe, expect, it } from "vitest";
import { filterByGroups, groupsByTicker, type StockGroup } from "./stock-groups";

const groups: StockGroup[] = [
  { id: "a", name: "Bancos", color: "#22c55e", tickers: ["BBAS3", "ITUB4"] },
  { id: "b", name: "Dividendos", color: "#3b82f6", tickers: ["BBAS3", "TAEE4"] },
];
const items = ["BBAS3", "ITUB4", "TAEE4", "PETR4"].map((ticker) => ({ ticker }));

describe("stock groups", () => {
  it("empty selection shows all", () => {
    expect(filterByGroups(items, groups, [])).toHaveLength(4);
  });
  it("selected group shows only its tickers", () => {
    expect(filterByGroups(items, groups, ["b"]).map((i) => i.ticker)).toEqual(["BBAS3", "TAEE4"]);
  });
  it("a ticker can belong to multiple groups", () => {
    expect(groupsByTicker(groups).get("BBAS3")?.map((g) => g.id)).toEqual(["a", "b"]);
  });
});
