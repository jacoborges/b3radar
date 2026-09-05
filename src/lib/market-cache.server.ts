/**
 * Cache central de dados de mercado (Lovable Cloud).
 * Guarda no banco do app tudo que muda pouco (fundamentos, histórico de preços,
 * linhas contábeis, técnico, consenso e análises de IA) para que a fonte externa
 * (brapi, Fundamentus, Yahoo, TradingView, IA) só seja consultada quando o dado
 * guardado vence — e uma única vez para todos os usuários.
 */
import { createClient } from "@supabase/supabase-js";

const TABLE = "market_cache";

export const CACHE_TTL = {
  fundamentals: 12 * 60 * 60 * 1000,
  fundamentusTicker: 12 * 60 * 60 * 1000,
  fundamentusList: 6 * 60 * 60 * 1000,
  priceHistory: 7 * 24 * 60 * 60 * 1000,
  valuationRaw: 7 * 24 * 60 * 60 * 1000,
  consensus: 6 * 60 * 60 * 1000,
  tradingview: 6 * 60 * 60 * 1000,
  ai: 7 * 24 * 60 * 60 * 1000,
} as const;

function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (isNewKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseFetch(key) },
  });
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface CacheHit<T> {
  payload: T;
  fetchedAt: string;
}

/** Lê o valor guardado se ainda estiver dentro da validade. */
export async function readCache<T>(
  kind: string,
  ticker: string,
  maxAgeMs: number,
): Promise<CacheHit<T> | null> {
  try {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("payload, fetched_at")
      .eq("kind", kind)
      .eq("ticker", ticker.toUpperCase())
      .maybeSingle();
    if (error || !data) return null;
    const row = data as { payload: unknown; fetched_at: string };
    const age = Date.now() - new Date(row.fetched_at).getTime();
    if (age > maxAgeMs) return null;
    return { payload: row.payload as T, fetchedAt: row.fetched_at };
  } catch (err) {
    console.error("[market_cache] leitura falhou", kind, ticker, err);
    return null;
  }
}

/** Grava (ou sobrescreve) o valor no cache do servidor. */
export async function writeCache(
  kind: string,
  ticker: string,
  payload: unknown,
): Promise<void> {
  try {
    const supabase = await adminClient();
    const { error } = await supabase.from(TABLE).upsert(
      {
        kind,
        ticker: ticker.toUpperCase(),
        payload: payload as never,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "kind,ticker" },
    );
    if (error) console.error("[market_cache] upsert falhou", kind, ticker, error.message);
  } catch (err) {
    console.error("[market_cache] escrita falhou", kind, ticker, err);
  }
}

/**
 * Envolve uma busca externa: devolve o cache válido; senão busca, grava
 * (quando o resultado é aproveitável) e devolve o dado novo.
 */
export async function withCache<T>(opts: {
  kind: string;
  ticker: string;
  ttlMs: number;
  force?: boolean;
  fetcher: () => Promise<T>;
  /** Só grava quando devolve true (por padrão, nunca guarda erro). */
  shouldStore?: (value: T) => boolean;
}): Promise<T> {
  const { kind, ticker, ttlMs, force, fetcher, shouldStore } = opts;
  if (!force) {
    const hit = await readCache<T>(kind, ticker, ttlMs);
    if (hit) return hit.payload;
  }
  const value = await fetcher();
  const store = shouldStore
    ? shouldStore(value)
    : !(
        value &&
        typeof value === "object" &&
        (value as { error?: unknown }).error != null
      );
  if (store) await writeCache(kind, ticker, value);
  return value;
}
