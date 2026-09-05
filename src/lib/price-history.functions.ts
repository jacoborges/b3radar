import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { fetchPriceHistory } from "./price-history.server";
import type { PriceHistoryResult, PriceYear } from "./price-history.server";

export type { PriceHistoryResult, PriceYear };

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
      shouldStore: (v) => !v.error && (v.years?.length ?? 0) > 0,
    });
  });
