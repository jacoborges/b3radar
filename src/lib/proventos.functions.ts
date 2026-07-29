import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { ProventoProvisionado } from "./stocks-data";
import type { EventoSocietario } from "./dividend-intelligence";
import type { TickerProventosResult } from "./proventos.server";

export type { TickerProventosResult };

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
});

const batchInputSchema = z.object({
  tickers: z.array(z.string().trim().min(4).max(7).toUpperCase()).min(1).max(350),
});

const refreshInputSchema = z.object({
  tickers: z.array(z.string().trim().min(4).max(7).toUpperCase()).min(1).max(40),
});

export interface BatchProventosItem {
  ticker: string;
  historicoCompleto: EventoSocietario[];
  provisionados: ProventoProvisionado[];
  fonte: "B3" | null;
  error: string | null;
}

export interface BatchProventosResult {
  items: BatchProventosItem[];
  updatedAt: string;
}

export interface CachedDividendItem {
  ticker: string;
  historicoCompleto: EventoSocietario[];
  fonte: "B3" | null;
  error: string | null;
  fetchedAt: string;
}

export interface CachedDividendsResult {
  items: CachedDividendItem[];
  updatedAt: string;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;

export const getTickerProventos = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<TickerProventosResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    const { readCachedTicker, refreshOneTicker } = await import(
      "./proventos-cache.server"
    );
    const cached = await readCachedTicker(data.ticker, SIX_HOURS);
    if (cached) return cached;
    return refreshOneTicker(data.ticker);
  });

/** Lê o cache persistente (todos os ativos já coletados) — não chama a B3. */
export const getProventosCached = createServerFn({ method: "GET" }).handler(
  async (): Promise<CachedDividendsResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=300, stale-while-revalidate=86400",
    );
    const { listCachedProventos, fromCompact } = await import(
      "./proventos-cache.server"
    );
    const rows = await listCachedProventos();
    return {
      items: rows.map((r) => ({
        ticker: r.ticker,
        historicoCompleto: fromCompact(r.eventosCash),
        fonte: r.fonte,
        error: r.error,
        fetchedAt: r.fetchedAt,
      })),
      updatedAt: new Date().toISOString(),
    };
  },
);

/** Coleta um lote pequeno na B3 e grava no banco (usado em segundo plano). */
export const refreshProventosChunk = createServerFn({ method: "POST" })
  .inputValidator((data) => refreshInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ processed: number; comDados: number }> => {
    const { refreshTickers } = await import("./proventos-cache.server");
    return refreshTickers(data.tickers, 6);
  });

export const getProventosBatch = createServerFn({ method: "POST" })
  .inputValidator((data) => batchInputSchema.parse(data))
  .handler(async ({ data }): Promise<BatchProventosResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    const { buildProventosForTicker, mapLimit } = await import(
      "./proventos.server"
    );
    const items = await mapLimit(data.tickers, 6, async (ticker) => {
      const r = await buildProventosForTicker(ticker);
      return {
        ticker,
        historicoCompleto: r.historicoCompleto ?? [],
        provisionados: r.provisionados ?? [],
        fonte: r.fonte,
        error: r.error,
      } satisfies BatchProventosItem;
    });
    return { items, updatedAt: new Date().toISOString() };
  });
