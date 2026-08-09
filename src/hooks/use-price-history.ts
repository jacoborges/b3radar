import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPriceHistory, type PriceHistoryResult } from "@/lib/price-history.functions";

const ONE_DAY = 24 * 60 * 60 * 1000;

export function usePriceHistory(ticker: string | null, enabled = true) {
  const call = useServerFn(getPriceHistory);
  const t = ticker ?? "";

  const q = useQuery<PriceHistoryResult>({
    queryKey: ["price-history", t],
    queryFn: () => call({ data: { ticker: t } }),
    enabled: !!ticker && enabled,
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    data: q.data ?? null,
    isLoading: q.isLoading,
    error: q.error ? String(q.error) : null,
  };
}
