export interface StockGroup {
  id: string;
  name: string;
  color: string;
  tickers: string[];
}

export const GROUP_COLORS = [
  "#22c55e", "#3b82f6", "#eab308", "#ef4444", "#a855f7",
  "#ec4899", "#14b8a6", "#f97316", "#94a3b8",
];

/** ticker → grupos em que aparece */
export function groupsByTicker(groups: StockGroup[]): Map<string, StockGroup[]> {
  const m = new Map<string, StockGroup[]>();
  for (const g of groups)
    for (const t of g.tickers) {
      const arr = m.get(t) ?? [];
      arr.push(g);
      m.set(t, arr);
    }
  return m;
}

/** Nenhum grupo selecionado = mostra tudo; senão, só tickers em algum dos grupos. */
export function filterByGroups<T extends { ticker: string }>(
  items: T[],
  groups: StockGroup[],
  selectedIds: string[],
): T[] {
  const sel = groups.filter((g) => selectedIds.includes(g.id));
  if (sel.length === 0) return items;
  const set = new Set(sel.flatMap((g) => g.tickers));
  return items.filter((i) => set.has(i.ticker));
}
