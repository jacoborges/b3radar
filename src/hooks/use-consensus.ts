import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getAnalystConsensus, getConsensusBatch } from "@/lib/consensus.functions";
import type { ConsensusResult } from "@/lib/consensus-rating";

const FIVE_MIN = 5 * 60 * 1000;

export function useAnalystConsensus(ticker: string | null) {
  return useQuery({
    queryKey: ["consensus", ticker],
    queryFn: () => getAnalystConsensus({ data: { ticker: ticker! } }),
    enabled: !!ticker,
    staleTime: FIVE_MIN,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export interface ConsensusBatchState {
  results: Record<string, ConsensusResult>;
  updatedAt: Date | null;
  isFetching: boolean;
  refetch: () => void;
}

export function useConsensusBatch(tickers: string[]): ConsensusBatchState {
  const key = tickers.slice().sort().join(",");
  const q = useQuery({
    queryKey: ["consensus-batch", key],
    queryFn: () => getConsensusBatch({ data: { tickers } }),
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
