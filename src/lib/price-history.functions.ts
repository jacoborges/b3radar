import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
});

export interface PriceYear {
  year: number;
  precoInicio: number;
  precoFim: number;
  precoMedio: number;
  valorizacao: number;
}

export interface PriceHistoryResult {
  anos: PriceYear[];
  fonte: "yahoo" | null;
  error: string | null;
}

interface YahooChart {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { adjclose?: Array<{ adjclose?: (number | null)[] }>; quote?: Array<{ close?: (number | null)[] }> };
    }>;
  };
}

function buildYears(timestamps: number[], closes: (number | null)[]): PriceYear[] {
  const byYear = new Map<number, number[]>();
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c == null || !Number.isFinite(c)) continue;
    const y = new Date(timestamps[i] * 1000).getUTCFullYear();
    const arr = byYear.get(y) ?? [];
    arr.push(c);
    byYear.set(y, arr);
  }
  const anos: PriceYear[] = [];
  for (const year of [...byYear.keys()].sort((a, b) => a - b)) {
    const vals = byYear.get(year)!;
    const precoInicio = vals[0];
    const precoFim = vals[vals.length - 1];
    const precoMedio = vals.reduce((s, v) => s + v, 0) / vals.length;
    anos.push({
      year,
      precoInicio: Number(precoInicio.toFixed(2)),
      precoFim: Number(precoFim.toFixed(2)),
      precoMedio: Number(precoMedio.toFixed(2)),
      valorizacao: Number((((precoFim / precoInicio) - 1) * 100).toFixed(2)),
    });
  }
  const anoAtual = new Date().getUTCFullYear();
  return anos.filter((a) => a.year >= anoAtual - 10);
}

export const getPriceHistory = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<PriceHistoryResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(data.ticker)}.SA` +
      `?range=11y&interval=1mo&includeAdjustedClose=true`;
    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent":
            "Mozilla/5.0 (compatible; B3Radar/1.0; +https://b3radar.lovable.app)",
        },
      });
      if (!res.ok) return { anos: [], fonte: null, error: `HTTP ${res.status}` };
      const json = (await res.json()) as YahooChart;
      const r = json.chart?.result?.[0];
      const ts = r?.timestamp ?? [];
      const closes =
        r?.indicators?.adjclose?.[0]?.adjclose ?? r?.indicators?.quote?.[0]?.close ?? [];
      if (!ts.length || !closes.length)
        return { anos: [], fonte: null, error: "Sem histórico de cotações" };
      return { anos: buildYears(ts, closes), fonte: "yahoo", error: null };
    } catch {
      return { anos: [], fonte: null, error: "Falha ao consultar cotações" };
    }
  });
