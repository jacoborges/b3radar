import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTickerProventos, type TickerProventosResult } from "@/lib/proventos.functions";

const ONE_HOUR = 60 * 60 * 1000;

export interface UseTickerDataResult {
  proventos: TickerProventosResult | null;
  isLoading: boolean;
  isFetching: boolean;
}

export function useTickerData(ticker: string | null): UseTickerDataResult {
  const callProventos = useServerFn(getTickerProventos);
  const t = ticker ?? "";

  const proventosQuery = useQuery({
    queryKey: ["proventos", t],
    queryFn: () => callProventos({ data: { ticker: t } }),
    enabled: !!ticker,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 2,
    retry: 1,
  });

  return {
    proventos: proventosQuery.data ?? null,
    isLoading: proventosQuery.isLoading,
    isFetching: proventosQuery.isFetching,
  };
}
