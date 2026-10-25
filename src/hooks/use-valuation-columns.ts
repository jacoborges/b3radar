import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const queryKey = ["stock-valuation-columns"];
const storageKey = "b3radar:stock-valuation-columns";

/** Liga/desliga, de uma vez, todas as colunas de valuation no cabeçalho. */
export function useValuationColumns() {
  const client = useQueryClient();
  const { data } = useQuery<boolean>({ queryKey, queryFn: () => false, initialData: false, staleTime: Infinity, gcTime: Infinity });
  useEffect(() => {
    try { if (localStorage.getItem(storageKey) === "1") client.setQueryData(queryKey, true); } catch { /* padrão */ }
  }, [client]);
  const set = (v: boolean) => {
    client.setQueryData(queryKey, v);
    try { localStorage.setItem(storageKey, v ? "1" : "0"); } catch { /* sessão */ }
  };
  return [data, set] as const;
}
