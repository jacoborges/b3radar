import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTickerProventos, type TickerProventosResult } from "@/lib/proventos.functions";
import {
  getTickerFundamentals,
  type TickerFundamentalsResult,
} from "@/lib/fundamentals.functions";
import { useBrapiToken } from "./use-live-quotes";

const ONE_HOUR = 60 * 60 * 1000;

export interface UseTickerDataResult {
  proventos: TickerProventosResult | null;
  fundamentals: TickerFundamentalsResult | null;
  isLoading: boolean;
  isFetching: boolean;
}

export function useTickerData(ticker: string | null): UseTickerDataResult {
  const callProventos = useServerFn(getTickerProventos);
  const callFundamentals = useServerFn(getTickerFundamentals);
  const [token] = useBrapiToken();
  const t = ticker ?? "";

  const proventosQuery = useQuery({
    queryKey: ["proventos", t],
    queryFn: () => callProventos({ data: { ticker: t } }),
    enabled: !!ticker,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 2,
    retry: 1,
  });

  const fundamentalsQuery = useQuery({
    queryKey: ["fundamentals", t, token ? "user" : "anon"],
    queryFn: () =>
      callFundamentals({
        data: token ? { ticker: t, token } : { ticker: t },
      }),
    enabled: !!ticker,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 2,
    retry: 1,
  });

  return {
    proventos: proventosQuery.data ?? null,
    fundamentals: fundamentalsQuery.data ?? null,
    isLoading: proventosQuery.isLoading || fundamentalsQuery.isLoading,
    isFetching: proventosQuery.isFetching || fundamentalsQuery.isFetching,
  };
}
