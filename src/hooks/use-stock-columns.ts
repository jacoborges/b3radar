import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { DEFAULT_STOCK_COLUMNS, normalizeStockColumns } from "@/lib/stock-columns";
import type { IndicatorKey } from "@/lib/indicators";
import { getMyStockColumns, setMyStockColumns } from "@/lib/user-settings.functions";

export const STOCK_COLUMNS_KEY = ["stock-columns"];
export const VALUATION_COLUMNS_KEY = ["stock-valuation-columns"];
const storageKey = "b3radar:stock-columns";
const valuationStorageKey = "b3radar:stock-valuation-columns";
let synced = false;

/** Carrega preferência local e, uma vez por sessão, a preferência salva na conta. */
export function useSyncStockPreferences(client: QueryClient) {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) client.setQueryData(STOCK_COLUMNS_KEY, normalizeStockColumns(JSON.parse(stored)));
      const v = localStorage.getItem(valuationStorageKey);
      if (v === "0" || v === "1") client.setQueryData(VALUATION_COLUMNS_KEY, v === "1");
    } catch { /* padrão */ }
    if (synced) return;
    synced = true;
    getMyStockColumns().then((r) => {
      if (r.columns) {
        const cols = normalizeStockColumns(r.columns);
        client.setQueryData(STOCK_COLUMNS_KEY, cols);
        try { localStorage.setItem(storageKey, JSON.stringify(cols)); } catch { /* sessão */ }
      }
      if (r.valuation !== null) {
        client.setQueryData(VALUATION_COLUMNS_KEY, r.valuation);
        try { localStorage.setItem(valuationStorageKey, r.valuation ? "1" : "0"); } catch { /* sessão */ }
      }
    }).catch(() => { synced = false; });
  }, [client]);
}

export function saveStockPreferences(client: QueryClient) {
  const columns = client.getQueryData<IndicatorKey[]>(STOCK_COLUMNS_KEY) ?? [...DEFAULT_STOCK_COLUMNS];
  const valuation = client.getQueryData<boolean>(VALUATION_COLUMNS_KEY) ?? true;
  try {
    localStorage.setItem(storageKey, JSON.stringify(columns));
    localStorage.setItem(valuationStorageKey, valuation ? "1" : "0");
  } catch { /* sessão */ }
  setMyStockColumns({ data: { columns, valuation } }).catch(() => {});
}

export function useStockColumns() {
  const client = useQueryClient();
  const { data } = useQuery<IndicatorKey[]>({ queryKey: STOCK_COLUMNS_KEY, queryFn: () => [...DEFAULT_STOCK_COLUMNS], initialData: [...DEFAULT_STOCK_COLUMNS], staleTime: Infinity, gcTime: Infinity });
  useSyncStockPreferences(client);
  const setColumns = (value: IndicatorKey[]) => {
    client.setQueryData(STOCK_COLUMNS_KEY, normalizeStockColumns(value));
    saveStockPreferences(client);
  };
  return [data, setColumns] as const;
}
