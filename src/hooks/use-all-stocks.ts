import { useMemo } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAllStocks, type StocksPayload } from "@/lib/stocks.functions";
import { buildStocks, collectSectors, type Stock } from "@/lib/stocks-data";

const ONE_HOUR = 60 * 60 * 1000;

export function stocksQueryOptions(fn: () => Promise<StocksPayload>) {
  return queryOptions({
    queryKey: ["stocks-all"],
    queryFn: fn,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 2,
  });
}

export interface UseAllStocksResult {
  stocks: Stock[];
  sectors: string[];
  fonte: "fundamentus" | "snapshot";
  updatedAt: Date;
  error: string | null;
  isFetching: boolean;
}

export function useAllStocks(): UseAllStocksResult {
  const fn = useServerFn(getAllStocks);
  const { data, isFetching } = useSuspenseQuery(stocksQueryOptions(fn));

  const stocks = useMemo(() => buildStocks(data.rows), [data.rows]);
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
