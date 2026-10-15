import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { fetchLiveQuotes, type LiveQuote } from "@/lib/quotes.functions";
import { getMyBrapiToken, setMyBrapiToken } from "@/lib/user-settings.functions";
import { supabase } from "@/integrations/supabase/client";
import { quoteRefreshBatches } from "@/lib/quote-refresh";

// Planos gratuitos da brapi permitem 1 ativo por requisição: pedimos menos
// ativos e com menos frequência para não estourar a cota.
const REFRESH_MS = 60_000;
const MAX_TICKERS = 40;
export const BRAPI_TOKEN_STORAGE_KEY = "b3radar:brapi-token";
const TOKEN_EVENT = "b3radar:brapi-token-changed";

function readStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(BRAPI_TOKEN_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function writeStoredToken(token: string) {
  try {
    if (token) window.localStorage.setItem(BRAPI_TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(BRAPI_TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

/**
 * Token brapi do usuário: cache local (leitura síncrona, evita corrida na
 * primeira consulta) sincronizado com o token salvo na conta do usuário.
 */
export function useBrapiToken(): [string, (v: string) => void, boolean] {
  const [token, setTokenState] = useState<string>(() => readStoredToken());
  const [ready, setReady] = useState<boolean>(false);
  const loadRemote = useServerFn(getMyBrapiToken);
  const saveRemote = useServerFn(setMyBrapiToken);

  useEffect(() => {
    setTokenState(readStoredToken());
    const onCustom = () => setTokenState(readStoredToken());
    const onStorage = (e: StorageEvent) => {
      if (e.key === BRAPI_TOKEN_STORAGE_KEY) setTokenState(readStoredToken());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(TOKEN_EVENT, onCustom);

    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // Sem sessão: não mantemos token de outra conta neste navegador.
          if (!cancelled && readStoredToken()) writeStoredToken("");
          return;
        }
        const remote = (await loadRemote()).token ?? "";
        if (cancelled) return;
        if (remote && remote !== readStoredToken()) writeStoredToken(remote);
        else if (!remote && readStoredToken()) {
          // Primeiro login após a migração: sobe o token local para a conta.
          void saveRemote({ data: { token: readStoredToken() } }).catch(() => {});
        }
      } catch {
        /* mantém o token local */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TOKEN_EVENT, onCustom);
    };
  }, [loadRemote, saveRemote]);

  const setToken = (v: string) => {
    const trimmed = v.trim();
    writeStoredToken(trimmed);
    setTokenState(trimmed);
    void saveRemote({ data: { token: trimmed } }).catch(() => {});
  };

  return [token, setToken, ready];
}

export interface LiveQuotesMap {
  map: Map<string, LiveQuote>;
  updatedAt: Date | null;
  isFetching: boolean;
  error: string | null;
  refresh: (priorityTickers?: string[]) => Promise<void>;
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
  const [cacheRevision, setCacheRevision] = useState(0);
  const [manualFetching, setManualFetching] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => queryClient.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.query.queryKey[0] === "quote") {
      setCacheRevision(revision => revision + 1);
    }
  }), [queryClient]);

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

  const refresh = async (priorityTickers: string[] = []) => {
    if (manualFetching) return;
    setManualFetching(true);
    setManualError(null);
    try {
      for (const batch of quoteRefreshBatches(priorityTickers, allRequested)) {
        const res = await call({ data: token ? { tickers: batch, token } : { tickers: batch } });
        writeQuotesToCache(queryClient, res.quotes);
        if (res.error) throw new Error(res.error);
        if (res.quotes.length < batch.length) {
          setManualError("Algumas cotações não foram retornadas pela fonte; mantido o último preço conhecido.");
        }
      }
    } catch (error) {
      setManualError(error instanceof Error ? error.message : "Falha ao atualizar cotações.");
    } finally {
      setManualFetching(false);
    }
  };

  return (() => {
    const map = new Map<string, LiveQuote>();
    // Last known values from the shared cache (populated by any screen)…
    for (const q of readQuotesFromCache(queryClient, allRequested)) map.set(q.ticker, q);
    // Read the shared cache only: an older polling response must not mask a manual refresh.
    const latest = Math.max(0, ...Array.from(map.values(), q => Date.parse(q.updatedAt)));
    return {
      map,
      updatedAt: latest ? new Date(latest) : null,
      isFetching: query.isFetching || manualFetching,
      error: manualError ?? query.data?.error ?? (query.error ? "Falha ao atualizar cotações." : null),
      refresh,
    };
  })();
}

