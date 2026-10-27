import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  closeOnOrBefore,
  computeRankingRow,
  periodStart,
  sortRanking,
  type RankingRow,
} from "./ranking";

export interface RankingResult {
  hoje: string;
  dataInicio: string;
  rows: RankingRow[];
}

const ONE_DAY = 24 * 60 * 60 * 1000;

async function fetchDailySeries(ticker: string) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.SA` +
    `?range=13mo&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (compatible; B3Radar/1.0; +https://b3radar.lovable.app)",
      },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> };
    };
    const r = json.chart?.result?.[0];
    const ts = r?.timestamp ?? [];
    const closes = r?.indicators?.quote?.[0]?.close ?? [];
    const out: Array<{ date: string; close: number }> = [];
    ts.forEach((t, i) => {
      const c = closes[i];
      if (c != null && Number.isFinite(c) && c > 0)
        out.push({ date: new Date(t * 1000).toISOString().slice(0, 10), close: Number(c.toFixed(2)) });
    });
    return out;
  } catch {
    return [];
  }
}

export const getSectorRanking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        tickers: z.array(z.string().trim().min(4).max(7).toUpperCase()).min(1).max(150),
        period: z.enum(["1y", "6m", "1m"]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<RankingResult> => {
    const hoje = new Date().toISOString().slice(0, 10);
    const dataInicio = periodStart(hoje, data.period);
    const { mapLimit } = await import("./proventos.server");
    const { readCachedTicker, refreshOneTicker } = await import("./proventos-cache.server");

    const rows = await mapLimit(data.tickers, 6, async (ticker) => {
      const [series, prov] = await Promise.all([
        fetchDailySeries(ticker),
        readCachedTicker(ticker, ONE_DAY * 2)
          .then((c) => c ?? refreshOneTicker(ticker))
          .catch(() => null),
      ]);
      const start = closeOnOrBefore(series, dataInicio);
      const atual = series.length ? series[series.length - 1].close : null;
      return computeRankingRow(ticker, start, atual, prov?.historicoCompleto ?? [], hoje);
    });
    return { hoje, dataInicio, rows: sortRanking(rows) };
  });
