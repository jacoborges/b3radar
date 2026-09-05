import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import {
  scoreToRating,
  type ConsensusData,
  type ConsensusMonth,
  type ConsensusResult,
} from "./consensus-rating";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

interface YahooTrendEntry {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface YahooQuoteSummaryResponse {
  quoteSummary?: {
    result?: Array<{
      recommendationTrend?: { trend?: YahooTrendEntry[] };
    }> | null;
    error?: { description?: string } | null;
  };
}

function normalizeTicker(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  return t.endsWith(".SA") ? t : `${t}.SA`;
}

// Yahoo exige um "crumb" + cookies para quoteSummary.
// Guardamos por isolate do Worker; expira em 30 min.
interface YahooAuth {
  crumb: string;
  cookie: string;
  expiresAt: number;
}
let cachedAuth: YahooAuth | null = null;
let authPromise: Promise<YahooAuth | null> | null = null;

async function fetchYahooAuth(): Promise<YahooAuth | null> {
  try {
    // 1) Semear cookies.
    const seed = await fetch("https://fc.yahoo.com/", {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "manual",
    });
    let cookies = extractCookies(seed.headers);
    if (cookies.length === 0) {
      const seed2 = await fetch("https://finance.yahoo.com/quote/AAPL/", {
        headers: { "user-agent": UA, accept: "text/html" },
        redirect: "manual",
      });
      cookies = extractCookies(seed2.headers);
    }
    if (cookies.length === 0) return null;
    const cookieHeader = cookies.join("; ");

    // 2) Buscar crumb.
    const crumbRes = await fetch(
      "https://query2.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: {
          "user-agent": UA,
          cookie: cookieHeader,
          accept: "text/plain",
        },
      },
    );
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.length > 32 || /\s/.test(crumb)) return null;

    return {
      crumb,
      cookie: cookieHeader,
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
  } catch {
    return null;
  }
}

function extractCookies(headers: Headers): string[] {
  const raw =
    (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
    headers.get("set-cookie")?.split(/,(?=[^;]+=)/g) ??
    [];
  return raw
    .map((c) => c.split(";")[0].trim())
    .filter((c) => c.length > 0);
}

async function getYahooAuth(): Promise<YahooAuth | null> {
  if (cachedAuth && cachedAuth.expiresAt > Date.now()) return cachedAuth;
  if (authPromise) return authPromise;
  authPromise = (async () => {
    const auth = await fetchYahooAuth();
    if (auth) cachedAuth = auth;
    authPromise = null;
    return auth;
  })();
  return authPromise;
}

async function fetchYahooConsensus(ticker: string): Promise<ConsensusResult> {
  const symbol = normalizeTicker(ticker);
  const auth = await getYahooAuth();
  if (!auth) {
    return { ticker, available: false, reason: "Yahoo indisponível" };
  }

  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol,
  )}?modules=recommendationTrend&crumb=${encodeURIComponent(auth.crumb)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "application/json,text/plain,*/*",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
        cookie: auth.cookie,
      },
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      // Crumb pode ter expirado.
      cachedAuth = null;
      return { ticker, available: false, reason: "Auth expirada" };
    }
    if (!res.ok) {
      return {
        ticker,
        available: false,
        reason: `Yahoo HTTP ${res.status}`,
      };
    }

    const json = (await res.json()) as YahooQuoteSummaryResponse;
    const trend = json.quoteSummary?.result?.[0]?.recommendationTrend?.trend;
    if (!trend || trend.length === 0) {
      return { ticker, available: false, reason: "Sem cobertura" };
    }

    const months: ConsensusMonth[] = trend.map((t) => {
      const total =
        (t.strongBuy ?? 0) +
        (t.buy ?? 0) +
        (t.hold ?? 0) +
        (t.sell ?? 0) +
        (t.strongSell ?? 0);
      return {
        period: t.period,
        strongBuy: t.strongBuy ?? 0,
        buy: t.buy ?? 0,
        hold: t.hold ?? 0,
        sell: t.sell ?? 0,
        strongSell: t.strongSell ?? 0,
        total,
      };
    });

    const withData = months.filter((m) => m.total > 0);
    if (withData.length === 0) {
      return { ticker, available: false, reason: "Sem casas cobrindo" };
    }

    const agg = withData.reduce(
      (a, m) => ({
        strongBuy: a.strongBuy + m.strongBuy,
        buy: a.buy + m.buy,
        hold: a.hold + m.hold,
        sell: a.sell + m.sell,
        strongSell: a.strongSell + m.strongSell,
        total: a.total + m.total,
      }),
      { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0, total: 0 },
    );

    const score =
      (5 * agg.strongBuy +
        4 * agg.buy +
        3 * agg.hold +
        2 * agg.sell +
        1 * agg.strongSell) /
      agg.total;

    // Score do mês mais recente (Yahoo ordena "0m" primeiro).
    const monthScore = (m: ConsensusMonth) =>
      m.total > 0
        ? (5 * m.strongBuy +
            4 * m.buy +
            3 * m.hold +
            2 * m.sell +
            1 * m.strongSell) /
          m.total
        : NaN;
    const latestScore = monthScore(withData[0]);
    const prev = withData.slice(1).map(monthScore).filter((n) => !Number.isNaN(n));
    const prevAvg = prev.length > 0 ? prev.reduce((a, b) => a + b, 0) / prev.length : latestScore;
    const trendDelta = Number.isFinite(latestScore) ? latestScore - prevAvg : 0;

    // Última casa contando
    const latestTotal = withData[0].total;

    const data: ConsensusData = {
      ticker,
      score: Number(score.toFixed(3)),
      rating: scoreToRating(score),
      totalAnalysts: latestTotal,
      distribution: {
        strongBuy: (agg.strongBuy / agg.total) * 100,
        buy: (agg.buy / agg.total) * 100,
        hold: (agg.hold / agg.total) * 100,
        sell: (agg.sell / agg.total) * 100,
        strongSell: (agg.strongSell / agg.total) * 100,
      },
      trend: Number(trendDelta.toFixed(3)),
      months,
      updatedAt: new Date().toISOString(),
    };
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ticker, available: false, reason: msg };
  } finally {
    clearTimeout(timer);
  }
}

export const getAnalystConsensus = createServerFn({ method: "GET" })
  .inputValidator((data: { ticker: string; force?: boolean }) => {
    if (!data || typeof data.ticker !== "string" || data.ticker.length === 0) {
      throw new Error("ticker é obrigatório");
    }
    return { ticker: data.ticker.trim().toUpperCase(), force: !!data.force };
  })
  .handler(async ({ data }): Promise<ConsensusResult> => {
    setResponseHeader("cache-control", "no-store");
    const { withCache, CACHE_TTL } = await import("./market-cache.server");
    return withCache<ConsensusResult>({
      kind: "consensus",
      ticker: data.ticker,
      ttlMs: CACHE_TTL.consensus,
      force: data.force,
      fetcher: () => fetchYahooConsensus(data.ticker),
    });
  });

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export const getConsensusBatch = createServerFn({ method: "POST" })
  .inputValidator((data: { tickers: string[] }) => {
    if (!data || !Array.isArray(data.tickers)) {
      throw new Error("tickers é obrigatório");
    }
    const clean = data.tickers
      .map((t) => String(t).trim().toUpperCase())
      .filter((t) => /^[A-Z]{4}\d{1,2}$/.test(t));
    return { tickers: clean.slice(0, 200) };
  })
  .handler(
    async ({ data }): Promise<{ results: Record<string, ConsensusResult>; updatedAt: string }> => {
      setResponseHeader("cache-control", "no-store");
      const results: Record<string, ConsensusResult> = {};
      const batchSize = 8;
      for (let i = 0; i < data.tickers.length; i += batchSize) {
        const batch = data.tickers.slice(i, i + batchSize);
        const settled = await Promise.all(batch.map((t) => fetchYahooConsensus(t)));
        for (let j = 0; j < batch.length; j++) {
          results[batch[j]] = settled[j];
        }
        if (i + batchSize < data.tickers.length) {
          await sleep(300);
        }
      }
      return { results, updatedAt: new Date().toISOString() };
    },
  );
