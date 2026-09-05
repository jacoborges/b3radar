import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import {
  TV_TIMEFRAMES,
  tvScoreToRating,
  type TvResult,
  type TvTechnicalData,
  type TvTimeframe,
  type TvTimeframeSignal,
} from "./tradingview-rating";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const SCAN_URL = "https://scanner.tradingview.com/brazil/scan";

function normalize(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/\.SA$/, "");
}
function tvSymbol(ticker: string): string {
  return `BMFBOVESPA:${normalize(ticker)}`;
}

function colFor(tf: TvTimeframe, base: "Recommend.All" | "Recommend.MA" | "Recommend.Other"): string {
  // TradingView usa a coluna sem sufixo para 1D.
  if (tf === "1D") return base;
  return `${base}|${tf}`;
}

function buildColumns(): string[] {
  const cols: string[] = [];
  for (const { key } of TV_TIMEFRAMES) {
    cols.push(colFor(key, "Recommend.All"));
    cols.push(colFor(key, "Recommend.MA"));
    cols.push(colFor(key, "Recommend.Other"));
  }
  return cols;
}

interface ScanRow {
  s: string; // symbol like "BMFBOVESPA:BBSE3"
  d: (number | null)[];
}
interface ScanResponse {
  data?: ScanRow[];
  totalCount?: number;
}

async function callScanner(tickers: string[]): Promise<ScanRow[]> {
  const columns = buildColumns();
  const body = {
    symbols: { tickers: tickers.map(tvSymbol), query: { types: [] } },
    columns,
  };
  const res = await fetch(SCAN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": UA,
      accept: "application/json",
      origin: "https://br.tradingview.com",
      referer: "https://br.tradingview.com/",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TradingView scanner HTTP ${res.status}`);
  const json = (await res.json()) as ScanResponse;
  return json.data ?? [];
}

function parseRow(ticker: string, row: ScanRow | undefined, updatedAt: string): TvResult {
  if (!row || !row.d) {
    return { ticker, available: false, reason: "sem dados" };
  }
  const signals: TvTimeframeSignal[] = [];
  let idx = 0;
  let hasAny = false;
  for (const { key } of TV_TIMEFRAMES) {
    const overall = row.d[idx++];
    const ma = row.d[idx++];
    const osc = row.d[idx++];
    if (overall == null && ma == null && osc == null) continue;
    const o = overall ?? 0;
    const m = ma ?? 0;
    const s = osc ?? 0;
    hasAny = true;
    signals.push({
      timeframe: key,
      overall: o,
      ma: m,
      oscillators: s,
      rating: tvScoreToRating(o),
      ratingMA: tvScoreToRating(m),
      ratingOsc: tvScoreToRating(s),
    });
  }
  if (!hasAny) return { ticker, available: false, reason: "sem cobertura no scanner" };
  return { ticker, updatedAt, signals };
}

export const getTradingViewTechnical = createServerFn({ method: "GET" })
  .inputValidator((data: { ticker: string; force?: boolean }) => {
    if (!data?.ticker || typeof data.ticker !== "string") throw new Error("ticker required");
    return { ticker: data.ticker, force: !!data.force };
  })
  .handler(async ({ data }) => {
    setResponseHeader("cache-control", "public, max-age=60, s-maxage=60");
    const t = normalize(data.ticker);
    const { withCache, CACHE_TTL } = await import("./market-cache.server");
    return withCache<TvResult>({
      kind: "tv-technical",
      ticker: t,
      ttlMs: CACHE_TTL.tradingview,
      force: data.force,
      fetcher: async () => {
        try {
          const rows = await callScanner([t]);
          const row = rows.find((r) => r.s.endsWith(`:${t}`)) ?? rows[0];
          return parseRow(t, row, new Date().toISOString());
        } catch (err) {
          return {
            ticker: t,
            available: false,
            reason: err instanceof Error ? err.message : "erro desconhecido",
          } as TvResult;
        }
      },
      shouldStore: (v) => v.available !== false,
    });
  });

export const getTradingViewBatch = createServerFn({ method: "POST" })
  .inputValidator((data: { tickers: string[] }) => {
    if (!Array.isArray(data?.tickers)) throw new Error("tickers required");
    return { tickers: data.tickers.slice(0, 200).map((t) => String(t)) };
  })
  .handler(async ({ data }) => {
    setResponseHeader("cache-control", "public, max-age=60, s-maxage=60");
    const tickers = Array.from(new Set(data.tickers.map(normalize))).filter(Boolean);
    const now = new Date().toISOString();
    const results: Record<string, TvResult> = {};
    // TradingView aceita batches grandes; usamos 50 por segurança.
    const BATCH = 50;
    for (let i = 0; i < tickers.length; i += BATCH) {
      const chunk = tickers.slice(i, i + BATCH);
      try {
        const rows = await callScanner(chunk);
        const byTicker = new Map<string, ScanRow>();
        for (const r of rows) {
          const t = r.s.split(":")[1];
          if (t) byTicker.set(t, r);
        }
        for (const t of chunk) results[t] = parseRow(t, byTicker.get(t), now);
      } catch (err) {
        const reason = err instanceof Error ? err.message : "erro";
        for (const t of chunk) results[t] = { ticker: t, available: false, reason };
      }
      if (i + BATCH < tickers.length) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    return { results, updatedAt: now } as {
      results: Record<string, TvResult>;
      updatedAt: string;
    };
  });

export type { TvResult, TvTechnicalData };
