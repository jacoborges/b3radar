/** Cache central de dados de mercado persistido no Google Drive. */

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

export interface CacheHit<T> { payload: T; fetchedAt: string; }
interface StoredCache { [key: string]: { payload: unknown; fetchedAt: string }; }
const documentName = "market-cache.json";
const keyOf = (kind: string, ticker: string) => `${kind}:${ticker.toUpperCase()}`;

export async function readCache<T>(kind: string, ticker: string, maxAgeMs: number): Promise<CacheHit<T> | null> {
  try {
    const { readSystemDocument } = await import("./drive-storage.server");
    const cache = await readSystemDocument<StoredCache>(documentName, {});
    const row = cache[keyOf(kind, ticker)];
    if (!row || Date.now() - Date.parse(row.fetchedAt) > maxAgeMs) return null;
    return { payload: row.payload as T, fetchedAt: row.fetchedAt };
  } catch (error) {
    console.error("[market-cache] leitura falhou", kind, ticker, error);
    return null;
  }
}

export async function writeCache(kind: string, ticker: string, payload: unknown): Promise<void> {
  try {
    const { updateSystemDocument } = await import("./drive-storage.server");
    await updateSystemDocument<StoredCache>(documentName, {}, (cache) => ({
      ...cache,
      [keyOf(kind, ticker)]: { payload, fetchedAt: new Date().toISOString() },
    }));
  } catch (error) {
    console.error("[market-cache] escrita falhou", kind, ticker, error);
  }
}

export async function withCache<T>(opts: { kind: string; ticker: string; ttlMs: number; force?: boolean; fetcher: () => Promise<T>; shouldStore?: (value: T) => boolean; }): Promise<T> {
  const { kind, ticker, ttlMs, force, fetcher, shouldStore } = opts;
  if (!force) { const hit = await readCache<T>(kind, ticker, ttlMs); if (hit) return hit.payload; }
  const value = await fetcher();
  const store = shouldStore ? shouldStore(value) : !(value && typeof value === "object" && (value as { error?: unknown }).error != null);
  if (store) await writeCache(kind, ticker, value);
  return value;
}