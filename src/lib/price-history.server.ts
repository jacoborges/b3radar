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
      indicators?: {
        adjclose?: Array<{ adjclose?: (number | null)[] }>;
        quote?: Array<{ close?: (number | null)[] }>;
      };
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

/** Busca 11 anos de cotações mensais ajustadas na Yahoo Finance. */
export async function fetchPriceHistory(ticker: string): Promise<PriceHistoryResult> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.SA` +
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
}

export interface PriceOnDateResult {
  ticker: string;
  /** Data pedida (AAAA-MM-DD). */
  date: string;
  /** Fechamento ajustado do pregão igual ou imediatamente anterior. */
  close: number | null;
  /** Data do pregão efetivamente usado. */
  usedDate: string | null;
  error: string | null;
}

/** Fechamento ajustado de um ticker numa data (usa o pregão anterior se feriado). */
export async function fetchPriceOnDate(
  ticker: string,
  date: string,
): Promise<PriceOnDateResult> {
  const target = new Date(`${date}T00:00:00Z`).getTime();
  if (!Number.isFinite(target)) {
    return { ticker, date, close: null, usedDate: null, error: "Data inválida" };
  }
  const period1 = Math.floor((target - 14 * 24 * 60 * 60 * 1000) / 1000);
  const period2 = Math.floor((target + 3 * 24 * 60 * 60 * 1000) / 1000);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.SA` +
    `?period1=${period1}&period2=${period2}&interval=1d&includeAdjustedClose=true`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (compatible; B3Radar/1.0; +https://b3radar.lovable.app)",
      },
    });
    if (!res.ok)
      return { ticker, date, close: null, usedDate: null, error: `HTTP ${res.status}` };
    const json = (await res.json()) as YahooChart;
    const r = json.chart?.result?.[0];
    const ts = r?.timestamp ?? [];
    const closes =
      r?.indicators?.adjclose?.[0]?.adjclose ?? r?.indicators?.quote?.[0]?.close ?? [];
    let best: { close: number; day: string } | null = null;
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (c == null || !Number.isFinite(c)) continue;
      const dayMs = ts[i] * 1000;
      if (dayMs > target + 24 * 60 * 60 * 1000) continue;
      const day = new Date(dayMs).toISOString().slice(0, 10);
      if (day > date) continue;
      if (!best || day > best.day) best = { close: Number(c.toFixed(2)), day };
    }
    if (!best)
      return {
        ticker,
        date,
        close: null,
        usedDate: null,
        error: "Sem cotação nessa data",
      };
    return { ticker, date, close: best.close, usedDate: best.day, error: null };
  } catch {
    return { ticker, date, close: null, usedDate: null, error: "Falha ao consultar cotações" };
  }
}
