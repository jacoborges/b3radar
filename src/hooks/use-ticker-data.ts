import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTickerProventos, type TickerProventosResult } from "@/lib/proventos.functions";

const ONE_DAY = 24 * 60 * 60 * 1000;
/** Anúncios de dividendos/JCP saem ao longo do dia: revalidar a cada 6h. */
const SIX_HOURS = 6 * 60 * 60 * 1000;

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
    staleTime: ONE_DAY,
    gcTime: ONE_DAY * 7,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  return {
    proventos: proventosQuery.data ?? null,
    isLoading: proventosQuery.isLoading,
    isFetching: proventosQuery.isFetching,
  };
}
