import { useMemo } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getAllStocks } from "@/lib/stocks.functions";
import { buildStocks, collectSectors, type Stock } from "@/lib/stocks-data";
import { useMinLiquidez } from "@/hooks/use-min-liquidez";

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
  const [minLiquidez] = useMinLiquidez();
  // Mantém todos os ativos; filtra apenas pela liquidez mínima definida em Ajustes (padrão: 0 mi)
  const stocks = useMemo(
    () =>
      minLiquidez > 0
        ? buildStocks(data.rows).filter((s) => (s.liquidezDiaria ?? 0) >= minLiquidez)
        : buildStocks(data.rows),
    [data.rows, minLiquidez],
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
