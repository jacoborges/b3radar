import { useMemo } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getAllStocks } from "@/lib/stocks.functions";
import { buildStocks, collectSectors, type Stock } from "@/lib/stocks-data";

const ONE_HOUR = 60 * 60 * 1000;

export const stocksQueryOptions = queryOptions({
  queryKey: ["stocks-all"],
  queryFn: () => getAllStocks(),
  staleTime: ONE_HOUR,
  gcTime: ONE_HOUR * 2,
});

export interface UseAllStocksResult {
  stocks: Stock[];
  sectors: string[];
  fonte: "fundamentus" | "snapshot";
  updatedAt: Date;
  error: string | null;
  isFetching: boolean;
}

export function useAllStocks(): UseAllStocksResult {
  const { data, isFetching } = useSuspenseQuery(stocksQueryOptions);
  // Exclui automaticamente ativos sem liquidez diária (0 mi)
  const stocks = useMemo(
    () => buildStocks(data.rows).filter((s) => (s.liquidezDiaria ?? 0) > 0),
    [data.rows],
  );
  const sectors = useMemo(() => collectSectors(stocks), [stocks]);

  return {
    stocks,
    sectors,
    fonte: data.fonte,
    updatedAt: new Date(data.updatedAt),
    error: data.error,
    isFetching,
  };
}
