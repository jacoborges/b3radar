import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { fetchPriceHistory } from "./price-history.server";
import type { PriceHistoryResult, PriceYear } from "./price-history.server";

export type { PriceHistoryResult, PriceYear };

export const getPriceHistory = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ ticker: z.string().trim().min(4).max(7).toUpperCase() }).parse(data),
  )
  .handler(async ({ data }): Promise<PriceHistoryResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    return fetchPriceHistory(data.ticker);
  });
