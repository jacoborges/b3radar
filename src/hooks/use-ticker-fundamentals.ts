import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTickerFundamentus,
  type TickerFundamentusPayload,
} from "@/lib/stocks.functions";

const FIFTEEN_MIN = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

export interface UseTickerFundamentalsResult {
  data: TickerFundamentusPayload | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
}

export function useTickerFundamentals(
  ticker: string | null,
): UseTickerFundamentalsResult {
  const call = useServerFn(getTickerFundamentus);
  const t = ticker ?? "";

  const q = useQuery({
    queryKey: ["fundamentus-ticker", t],
    queryFn: () => call({ data: { ticker: t } }),
    enabled: !!ticker,
    staleTime: FIFTEEN_MIN,
    gcTime: ONE_HOUR,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    data: q.data ?? null,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    error: q.error ? String(q.error) : null,
  };
}
