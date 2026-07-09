import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface LiveQuote {
  ticker: string;
  price: number;
  changePercent: number;
  previousClose: number | null;
  updatedAt: string; // ISO
}

const inputSchema = z.object({
  tickers: z.array(z.string().min(1).max(10)).max(200),
});

const BRAPI_BASE = "https://brapi.dev/api/quote";
const BATCH_SIZE = 15;

async function fetchBatch(
  batch: string[],
  token: string | undefined,
): Promise<LiveQuote[]> {
  const url = new URL(`${BRAPI_BASE}/${batch.join(",")}`);
  if (token) url.searchParams.set("token", token);

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    results?: Array<{
      symbol?: string;
      regularMarketPrice?: number;
      regularMarketChangePercent?: number;
      regularMarketPreviousClose?: number;
    }>;
  };
  const now = new Date().toISOString();
  return (json.results ?? [])
    .filter(
      (r): r is Required<Pick<typeof r, "symbol" | "regularMarketPrice">> & typeof r =>
        typeof r?.symbol === "string" && typeof r.regularMarketPrice === "number",
    )
    .map((r) => ({
      ticker: r.symbol!,
      price: r.regularMarketPrice!,
      changePercent: r.regularMarketChangePercent ?? 0,
      previousClose: r.regularMarketPreviousClose ?? null,
      updatedAt: now,
    }));
}

export const fetchLiveQuotes = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ quotes: LiveQuote[]; error: string | null }> => {
    const tickers = Array.from(new Set(data.tickers.map((t) => t.toUpperCase())));
    if (tickers.length === 0) return { quotes: [], error: null };

    const token = process.env.BRAPI_TOKEN;

    const batches: string[][] = [];
    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      batches.push(tickers.slice(i, i + BATCH_SIZE));
    }

    try {
      const results = await Promise.all(batches.map((b) => fetchBatch(b, token)));
      return { quotes: results.flat(), error: null };
    } catch (err) {
      console.error("[fetchLiveQuotes] failed", err);
      return { quotes: [], error: "Falha ao consultar cotações ao vivo." };
    }
  });
