import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { fetchLiveQuotes, type LiveQuote } from "@/lib/quotes.functions";

// Planos gratuitos da brapi permitem 1 ativo por requisição: pedimos menos
// ativos e com menos frequência para não estourar a cota.
const REFRESH_MS = 60_000;
const MAX_TICKERS = 40;
export const BRAPI_TOKEN_STORAGE_KEY = "b3radar:brapi-token";

export interface LiveQuotesMap {
  map: Map<string, LiveQuote>;
  updatedAt: Date | null;
  isFetching: boolean;
  error: string | null;
}

function readStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(BRAPI_TOKEN_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Reactively read the brapi token from localStorage across tabs and in-tab updates. */
export function useBrapiToken(): [string, (v: string) => void] {
  const [token, setTokenState] = useState<string>("");

  useEffect(() => {
    setTokenState(readStoredToken());
    const onStorage = (e: StorageEvent) => {
      if (e.key === BRAPI_TOKEN_STORAGE_KEY) setTokenState(readStoredToken());
    };
    const onCustom = () => setTokenState(readStoredToken());
    window.addEventListener("storage", onStorage);
    window.addEventListener("b3radar:brapi-token-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("b3radar:brapi-token-changed", onCustom);
    };
  }, []);

  const setToken = (v: string) => {
    const trimmed = v.trim();
    try {
      if (trimmed) window.localStorage.setItem(BRAPI_TOKEN_STORAGE_KEY, trimmed);
      else window.localStorage.removeItem(BRAPI_TOKEN_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    setTokenState(trimmed);
    window.dispatchEvent(new Event("b3radar:brapi-token-changed"));
  };

  return [token, setToken];
}

/** Shared per-ticker quote cache key so every screen reads the same price. */
export function quoteCacheKey(ticker: string) {
  return ["quote", ticker.toUpperCase()] as const;
}

function writeQuotesToCache(qc: QueryClient, quotes: LiveQuote[]) {
  for (const q of quotes) qc.setQueryData(quoteCacheKey(q.ticker), q);
}

function readQuotesFromCache(qc: QueryClient, tickers: string[]): LiveQuote[] {
  const out: LiveQuote[] = [];
  for (const t of tickers) {
    const q = qc.getQueryData<LiveQuote>(quoteCacheKey(t));
    if (q) out.push(q);
  }
  return out;
}

/**
 * Poll brapi.dev for real-time-ish prices of the given tickers.
 * Caps the request set so we never blow past brapi's per-request limits.
 * Every quote is mirrored into a shared per-ticker cache, so the portfolio
 * and the quotes screen always display the same price for the same asset.
 */
export function useLiveQuotes(tickers: string[]): LiveQuotesMap {
  const call = useServerFn(fetchLiveQuotes);
  const [token] = useBrapiToken();
  const queryClient = useQueryClient();

  const allRequested = useMemo(() => {
    const unique = Array.from(new Set(tickers.map((t) => t.toUpperCase())));
    unique.sort();
    return unique;
  }, [tickers]);

  const requested = useMemo(() => allRequested.slice(0, MAX_TICKERS), [allRequested]);

  const key = requested.join(",");

  const query = useQuery({
    queryKey: ["live-quotes", key, token ? "user-token" : "anon"],
    queryFn: async () => {
      const res = await call({
        data: token ? { tickers: requested, token } : { tickers: requested },
      });
      writeQuotesToCache(queryClient, res.quotes);
      return res;
    },
    enabled: requested.length > 0,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: REFRESH_MS - 1000,
  });

  return useMemo(() => {
    const map = new Map<string, LiveQuote>();
    // Last known values from the shared cache (populated by any screen)…
    for (const q of readQuotesFromCache(queryClient, allRequested)) map.set(q.ticker, q);
    // …then this query's fresh values.
    for (const q of query.data?.quotes ?? []) map.set(q.ticker, q);
    return {
      map,
      updatedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
      isFetching: query.isFetching,
      error: query.data?.error ?? (query.error ? "Falha ao atualizar cotações." : null),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, query.dataUpdatedAt, query.isFetching, query.error, allRequested, queryClient]);
}

