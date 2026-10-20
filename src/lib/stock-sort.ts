export const STOCK_SORT_OPTIONS = [
  { value: "ticker:asc", label: "Ticker A→Z" },
  { value: "dy:desc", label: "Maior DY" },
  { value: "pl:asc", label: "Menor P/L" },
  { value: "pvp:asc", label: "Menor P/VP" },
  { value: "roe:desc", label: "Maior ROE" },
  { value: "preco:desc", label: "Maior preço" },
] as const;

export type StockSort = (typeof STOCK_SORT_OPTIONS)[number]["value"];
export interface SortableStock {
  ticker: string;
  dy?: number | null;
  pl?: number | null;
  pvp?: number | null;
  roe?: number | null;
  preco?: number | null;
}

export function isStockSort(value: string): value is StockSort {
  return STOCK_SORT_OPTIONS.some((option) => option.value === value);
}

export function compareStocks(a: SortableStock, b: SortableStock, sort: StockSort): number {
  const tickerOrder = a.ticker.localeCompare(b.ticker);
  if (sort === "ticker:asc") return tickerOrder;
  const [key, direction] = sort.split(":") as [Exclude<keyof SortableStock, "ticker">, string];
  const av = a[key];
  const bv = b[key];
  const aValid = typeof av === "number" && Number.isFinite(av);
  const bValid = typeof bv === "number" && Number.isFinite(bv);
  if (!aValid || !bValid) return Number(bValid) - Number(aValid) || tickerOrder;
  return (direction === "asc" ? av - bv : bv - av) || tickerOrder;
}