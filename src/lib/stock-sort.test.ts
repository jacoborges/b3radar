import { describe, expect, it } from "vitest";
import { compareStocks, type SortableStock, type StockSort } from "./stock-sort";

const stocks: SortableStock[] = [
  { ticker: "BBBB4", dy: 3, pl: 15, pvp: 2, roe: 25, preco: 20 },
  { ticker: "AAAA3", dy: 10, pl: 8, pvp: 3, roe: 15, preco: 40 },
  { ticker: "CCCC11", dy: 5, pl: 12, pvp: 1, roe: 20, preco: 30 },
];
const ordered = (sort: StockSort) => [...stocks].sort((a, b) => compareStocks(a, b, sort)).map((s) => s.ticker);
describe("organização comum dos ativos", () => {
  it("Ticker A→Z", () => expect(ordered("ticker:asc")).toEqual(["AAAA3", "BBBB4", "CCCC11"]));
  it("Maior DY", () => expect(ordered("dy:desc")).toEqual(["AAAA3", "CCCC11", "BBBB4"]));
  it("Menor P/L", () => expect(ordered("pl:asc")).toEqual(["AAAA3", "CCCC11", "BBBB4"]));
  it("Menor P/VP", () => expect(ordered("pvp:asc")).toEqual(["CCCC11", "BBBB4", "AAAA3"]));
  it("Maior ROE", () => expect(ordered("roe:desc")).toEqual(["BBBB4", "CCCC11", "AAAA3"]));
  it("Maior preço", () => expect(ordered("preco:desc")).toEqual(["AAAA3", "CCCC11", "BBBB4"]));
  it("coloca dados ausentes no fim e desempata por ticker", () => {
    const rows = [{ ticker: "ZZZZ3", pl: null }, { ticker: "BBBB4", pl: 0 }, { ticker: "AAAA3", pl: 0 }, { ticker: "CCCC3", pl: NaN }];
    expect(rows.sort((a, b) => compareStocks(a, b, "pl:asc")).map(s => s.ticker)).toEqual(["AAAA3", "BBBB4", "CCCC3", "ZZZZ3"]);
  });
});