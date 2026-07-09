import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { fetchLiveQuotes, type LiveQuote } from "@/lib/quotes.functions";

const REFRESH_MS = 30_000;
const MAX_TICKERS = 120;

export interface LiveQuotesMap {
  map: Map<string, LiveQuote>;
  updatedAt: Date | null;
  isFetching: boolean;
  error: string | null;
}

/**
 * Poll brapi.dev for real-time-ish prices of the given tickers.
 * Caps the request set so we never blow past brapi's per-request limits.
 */
export function useLiveQuotes(tickers: string[]): LiveQuotesMap {
  const call = useServerFn(fetchLiveQuotes);

  const requested = useMemo(() => {
    const unique = Array.from(new Set(tickers.map((t) => t.toUpperCase())));
    unique.sort();
    return unique.slice(0, MAX_TICKERS);
  }, [tickers]);

  const key = requested.join(",");

  const query = useQuery({
    queryKey: ["live-quotes", key],
    queryFn: () => call({ data: { tickers: requested } }),
    enabled: requested.length > 0,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: REFRESH_MS - 1000,
  });

  return useMemo(() => {
    const map = new Map<string, LiveQuote>();
    for (const q of query.data?.quotes ?? []) map.set(q.ticker, q);
    return {
      map,
      updatedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
      isFetching: query.isFetching,
      error: query.data?.error ?? (query.error ? "Falha ao atualizar cotações." : null),
    };
  }, [query.data, query.dataUpdatedAt, query.isFetching, query.error]);
}
