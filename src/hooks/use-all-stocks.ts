import { useMemo } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getAllStocks } from "@/lib/stocks.functions";
import { buildStocks, collectSectors, type Stock } from "@/lib/stocks-data";
import { useMinLiquidez } from "@/hooks/use-min-liquidez";
import { useVisibleSectors } from "@/hooks/use-visible-sectors";
import { filterBySectors } from "@/lib/visible-sectors";

const ONE_HOUR = 60 * 60 * 1000;

export const stocksQueryOptions = queryOptions({
  queryKey: ["stocks-all"],
  queryFn: () => getAllStocks(),
  staleTime: ONE_HOUR,
  gcTime: ONE_HOUR * 2,
});

export interface UseAllStocksResult {
  stocks: Stock[];
  /** todos os setores disponíveis (sem o filtro "Visualizar somente") */
  sectors: string[];
  fonte: "fundamentus" | "snapshot";
  updatedAt: Date;
  error: string | null;
  isFetching: boolean;
}

export function useAllStocks(opts?: { allSectors?: boolean }): UseAllStocksResult {
  const { data, isFetching } = useSuspenseQuery(stocksQueryOptions);
  const [minLiquidez] = useMinLiquidez();
  const [visibleSectors] = useVisibleSectors();
  const ignoreSectors = opts?.allSectors ?? false;

  const base = useMemo(
    () =>
      minLiquidez > 0
        ? buildStocks(data.rows).filter((s) => (s.liquidezDiaria ?? 0) >= minLiquidez)
        : buildStocks(data.rows),
    [data.rows, minLiquidez],
  );
  const stocks = useMemo(
    () => (ignoreSectors ? base : filterBySectors(base, visibleSectors)),
    [base, visibleSectors, ignoreSectors],
  );
  const sectors = useMemo(() => collectSectors(base), [base]);

  return {
    stocks,
    sectors,
    fonte: data.fonte,
    updatedAt: new Date(data.updatedAt),
    error: data.error,
    isFetching,
  };
}
