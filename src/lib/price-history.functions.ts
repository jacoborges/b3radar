import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { fetchPriceHistory, fetchPriceOnDate } from "./price-history.server";
import type {
  PriceHistoryResult,
  PriceOnDateResult,
  PriceYear,
} from "./price-history.server";

export type { PriceHistoryResult, PriceOnDateResult, PriceYear };

export const getPriceHistory = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        ticker: z.string().trim().min(4).max(7).toUpperCase(),
        force: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<PriceHistoryResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    const { withCache, CACHE_TTL } = await import("./market-cache.server");
    return withCache<PriceHistoryResult>({
      kind: "price-history",
      ticker: data.ticker,
      ttlMs: CACHE_TTL.priceHistory,
      force: data.force,
      fetcher: () => fetchPriceHistory(data.ticker),
      shouldStore: (v) => !v.error && (v.anos?.length ?? 0) > 0,
    });
  });

/** Fechamento de um ativo numa data específica (histórico, cache longo). */
export const getPriceOnDate = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        ticker: z.string().trim().min(4).max(7).toUpperCase(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<PriceOnDateResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    const { withCache } = await import("./market-cache.server");
    return withCache<PriceOnDateResult>({
      kind: "price-on-date",
      ticker: `${data.ticker}@${data.date}`,
      // Preço passado não muda: validade longa.
      ttlMs: 365 * 24 * 60 * 60 * 1000,
      fetcher: () => fetchPriceOnDate(data.ticker, data.date),
      shouldStore: (v) => !v.error && v.close != null,
    });
  });
