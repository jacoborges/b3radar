import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { ValuationInputs } from "@/lib/valuation";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(8).toUpperCase(),
  token: z.string().trim().min(1).max(120).optional(),
  force: z.boolean().optional(),
});

export const getValuationInputs = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ValuationInputs> => {
    const { withCache, CACHE_TTL } = await import("@/lib/market-cache.server");
    const result = await withCache<ValuationInputs>({
      kind: "valuation-inputs",
      ticker: data.ticker,
      ttlMs: CACHE_TTL.valuationRaw,
      force: data.force,
      fetcher: async () => {
        const { collectValuationInputs } = await import("@/lib/valuation.server");
        return collectValuationInputs(data.ticker, data.token);
      },
    });
    setResponseHeader(
      "cache-control",
      result.error ? "no-store" : "public, s-maxage=21600, stale-while-revalidate=86400",
    );
    return result;
  });
