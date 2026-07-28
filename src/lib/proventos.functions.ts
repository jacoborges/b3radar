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

export const getTickerProventos = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<TickerProventosResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    const { buildProventosForTicker } = await import("./proventos.server");
    return buildProventosForTicker(data.ticker);
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
    const items = await mapLimit(data.tickers, 10, async (ticker) => {
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
