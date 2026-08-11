import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getValuationInputs } from "@/lib/valuation.functions";
import { useBrapiToken } from "@/hooks/use-live-quotes";
import type { ValuationInputs } from "@/lib/valuation";

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function useValuation(ticker: string | null, enabled = true) {
  const call = useServerFn(getValuationInputs);
  const [token] = useBrapiToken();
  const t = ticker ?? "";

  const q = useQuery<ValuationInputs>({
    queryKey: ["valuation-inputs", t, token ? "user-token" : "anon"],
    queryFn: () =>
      call({ data: token ? { ticker: t, token } : { ticker: t } }),
    enabled: !!ticker && enabled,
    staleTime: SIX_HOURS,
    gcTime: SIX_HOURS,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    data: q.data ?? null,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    error: q.error ? String(q.error) : null,
    refetch: () => q.refetch(),
  };
}
