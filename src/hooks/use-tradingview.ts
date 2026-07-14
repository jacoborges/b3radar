import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getTradingViewTechnical,
  getTradingViewBatch,
} from "@/lib/tradingview.functions";
import type { TvResult } from "@/lib/tradingview-rating";

const FIVE_MIN = 5 * 60 * 1000;
const ONE_MIN = 60 * 1000;

export function useTradingViewTechnical(ticker: string | null) {
  return useQuery({
    queryKey: ["tv-technical", ticker],
    queryFn: () => getTradingViewTechnical({ data: { ticker: ticker! } }),
    enabled: !!ticker,
    staleTime: ONE_MIN,
    gcTime: 10 * 60 * 1000,
    refetchInterval: ONE_MIN,
    refetchOnWindowFocus: false,
  });
}

export interface TvBatchState {
  results: Record<string, TvResult>;
  updatedAt: Date | null;
  isFetching: boolean;
  refetch: () => void;
}

export function useTradingViewBatch(tickers: string[]): TvBatchState {
  const key = tickers.slice().sort().join(",");
  const q = useQuery({
    queryKey: ["tv-batch", key],
    queryFn: () => getTradingViewBatch({ data: { tickers } }),
    enabled: tickers.length > 0,
    staleTime: FIVE_MIN,
    gcTime: 30 * 60 * 1000,
    refetchInterval: FIVE_MIN,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  return {
    results: q.data?.results ?? {},
    updatedAt: q.data ? new Date(q.data.updatedAt) : null,
    isFetching: q.isFetching,
    refetch: () => {
      void q.refetch();
    },
  };
}
