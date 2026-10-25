import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VALUATION_COLUMNS_KEY, saveStockPreferences, useSyncStockPreferences } from "./use-stock-columns";

/** Liga/desliga, de uma vez, todas as colunas de valuation no cabeçalho (preferência da conta). */
export function useValuationColumns() {
  const client = useQueryClient();
  const { data } = useQuery<boolean>({ queryKey: VALUATION_COLUMNS_KEY, queryFn: () => true, initialData: true, staleTime: Infinity, gcTime: Infinity });
  useSyncStockPreferences(client);
  const set = (v: boolean) => {
    client.setQueryData(VALUATION_COLUMNS_KEY, v);
    saveStockPreferences(client);
  };
  return [data, set] as const;
}
