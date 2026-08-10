import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { fetchLiveQuotes, type LiveQuote } from "@/lib/quotes.functions";

const REFRESH_MS = 15_000;
const MAX_TICKERS = 120;
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

/**
 * Poll brapi.dev for real-time-ish prices of the given tickers.
 * Caps the request set so we never blow past brapi's per-request limits.
 */
export function useLiveQuotes(tickers: string[]): LiveQuotesMap {
  const call = useServerFn(fetchLiveQuotes);
  const [token] = useBrapiToken();

  const requested = useMemo(() => {
    const unique = Array.from(new Set(tickers.map((t) => t.toUpperCase())));
    unique.sort();
    return unique.slice(0, MAX_TICKERS);
  }, [tickers]);

  const key = requested.join(",");

  const query = useQuery({
    queryKey: ["live-quotes", key, token ? "user-token" : "anon"],
    queryFn: () =>
      call({ data: token ? { tickers: requested, token } : { tickers: requested } }),
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
