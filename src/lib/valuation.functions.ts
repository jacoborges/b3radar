import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { ValuationInputs } from "@/lib/valuation";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(8).toUpperCase(),
  token: z.string().trim().min(1).max(120).optional(),
});

export const getValuationInputs = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ValuationInputs> => {
    const { collectValuationInputs } = await import("@/lib/valuation.server");
    const result = await collectValuationInputs(data.ticker, data.token);
    setResponseHeader(
      "cache-control",
      result.error ? "no-store" : "public, s-maxage=21600, stale-while-revalidate=86400",
    );
    return result;
  });
