import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { DEFAULT_STOCK_COLUMNS, normalizeStockColumns, withPvpFairColumn, type StockColumnKey } from "@/lib/stock-columns";
import { getMyStockColumns, setMyStockColumns } from "@/lib/user-settings.functions";

export const STOCK_COLUMNS_KEY = ["stock-columns"];
export const VALUATION_COLUMNS_KEY = ["stock-valuation-columns"];
const storageKey = "b3radar:stock-columns";
const valuationStorageKey = "b3radar:stock-valuation-columns";
const pvpFairMigrationKey = "b3radar:stock-columns-pvpfair";
let synced = false;

function needsPvpFairMigration(): boolean {
  try {
    return localStorage.getItem(pvpFairMigrationKey) !== "1";
  } catch {
    return false;
  }
}

function markPvpFairMigrated() {
  try {
    localStorage.setItem(pvpFairMigrationKey, "1");
  } catch {
    /* sessão */
  }
}

/** Carrega preferência local e, uma vez por sessão, a preferência salva na conta. */
export function useSyncStockPreferences(client: QueryClient) {
  useEffect(() => {
    const migrate = needsPvpFairMigration();
    const applyMigration = (cols: StockColumnKey[]): StockColumnKey[] => {
      if (!migrate) return cols;
      const next = withPvpFairColumn(cols);
      if (next !== cols) {
        client.setQueryData(STOCK_COLUMNS_KEY, next);
        saveStockPreferences(client);
      }
      markPvpFairMigrated();
      return next;
    };
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) client.setQueryData(STOCK_COLUMNS_KEY, applyMigration(normalizeStockColumns(JSON.parse(stored))));
      const v = localStorage.getItem(valuationStorageKey);
      if (v === "0" || v === "1") client.setQueryData(VALUATION_COLUMNS_KEY, v === "1");
    } catch {
      /* padrão */
    }
    if (synced) return;
    synced = true;
    getMyStockColumns()
      .then((r) => {
        if (r.columns) {
          const cols = applyMigration(normalizeStockColumns(r.columns));
          client.setQueryData(STOCK_COLUMNS_KEY, cols);
          try {
            localStorage.setItem(storageKey, JSON.stringify(cols));
          } catch {
            /* sessão */
          }
        }
        if (r.valuation !== null) {
          client.setQueryData(VALUATION_COLUMNS_KEY, r.valuation);
          try {
            localStorage.setItem(valuationStorageKey, r.valuation ? "1" : "0");
          } catch {
            /* sessão */
          }
        }
      })
      .catch(() => {
        synced = false;
      });
  }, [client]);
}

export function saveStockPreferences(client: QueryClient) {
  const columns = client.getQueryData<StockColumnKey[]>(STOCK_COLUMNS_KEY) ?? [...DEFAULT_STOCK_COLUMNS];
  const valuation = client.getQueryData<boolean>(VALUATION_COLUMNS_KEY) ?? true;
  try {
    localStorage.setItem(storageKey, JSON.stringify(columns));
    localStorage.setItem(valuationStorageKey, valuation ? "1" : "0");
  } catch {
    /* sessão */
  }
  setMyStockColumns({ data: { columns, valuation } }).catch(() => {});
}

export function useStockColumns() {
  const client = useQueryClient();
  const { data } = useQuery<StockColumnKey[]>({
    queryKey: STOCK_COLUMNS_KEY,
    queryFn: () => [...DEFAULT_STOCK_COLUMNS],
    initialData: [...DEFAULT_STOCK_COLUMNS],
    staleTime: Infinity,
    gcTime: Infinity,
  });
  useSyncStockPreferences(client);
  const setColumns = (value: StockColumnKey[]) => {
    client.setQueryData(STOCK_COLUMNS_KEY, normalizeStockColumns(value));
    saveStockPreferences(client);
  };
  return [data, setColumns] as const;
}
