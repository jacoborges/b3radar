import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_STOCK_COLUMNS, normalizeStockColumns } from "@/lib/stock-columns";
import type { IndicatorKey } from "@/lib/indicators";

const queryKey = ["stock-columns"];
const storageKey = "b3radar:stock-columns";

export function useStockColumns() {
  const client = useQueryClient();
  const { data } = useQuery<IndicatorKey[]>({ queryKey, queryFn: () => [...DEFAULT_STOCK_COLUMNS], initialData: [...DEFAULT_STOCK_COLUMNS], staleTime: Infinity, gcTime: Infinity });
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) client.setQueryData(queryKey, normalizeStockColumns(JSON.parse(stored)));
    } catch { /* mantém configuração padrão */ }
  }, [client]);
  const setColumns = (value: IndicatorKey[]) => {
    const columns = normalizeStockColumns(value);
    client.setQueryData(queryKey, columns);
    try { localStorage.setItem(storageKey, JSON.stringify(columns)); } catch { /* seleção permanece na sessão */ }
  };
  return [data, setColumns] as const;
}