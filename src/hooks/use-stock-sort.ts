import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { StockSort } from "@/lib/stock-sort";

const queryKey = ["stock-sort"];
export function useStockSort() {
  const client = useQueryClient();
  const { data } = useQuery<StockSort>({
    queryKey,
    queryFn: () => "ticker:asc",
    initialData: "ticker:asc",
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return [data, (value: StockSort) => client.setQueryData(queryKey, value)] as const;
}