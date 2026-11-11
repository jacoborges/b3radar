import { describe, expect, it } from "vitest";
import { normalizeObservations, refreshAllMacro } from "./macro.server";

describe("macro observations", () => {
  it("deduplicates overlapping monthly dates before saving", () => {
    expect(normalizeObservations([
      { date: "2026-01-01", value: 0.33 },
      { date: "2026-02-01", value: 0.7 },
      { date: "2026-01-01", value: 0.34 },
    ], "2026-01-01", "2026-10-22")).toEqual([
      { date: "2026-01-01", value: 0.34 },
      { date: "2026-02-01", value: 0.7 },
    ]);
  });
  it("ignores future, out-of-range and invalid values and sorts chronologically", () => {
    expect(normalizeObservations([
      { date: "2026-10-21", value: 5.0277 },
      { date: "2026-11-04", value: 13.75 },
      { date: "2026-10-20", value: 5.01 },
      { date: "2025-12-31", value: 1 },
      { date: "2026-10-22", value: NaN },
    ], "2026-01-01", "2026-10-22")).toEqual([
      { date: "2026-10-20", value: 5.01 },
      { date: "2026-10-21", value: 5.0277 },
    ]);
  });
  it("does not mark empty provider responses as successful imports", async () => {
    let writes = 0;
    const query = {
      select: () => Promise.resolve({ data: [{ code: "unknown", source: "missing", source_id: "0", last_date: null }], error: null }),
      upsert: () => { writes++; return Promise.resolve({ error: null }); },
      update: () => { writes++; return { eq: () => Promise.resolve({ error: null }) }; },
    };
    const result = await refreshAllMacro({ from: () => query });
    expect(result).toEqual({ updated: 0, failed: ["unknown"], fallbackUsed: [] });
    expect(writes).toBe(0);
  });
  it("usa a HG Brasil como reserva da Selic meta quando o Banco Central falha", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (String(url).includes("hgbrasil")) return new Response(JSON.stringify({ results: [{ date: "2026-11-10", selic: 15 }] }), { status: 200 });
      return new Response("erro", { status: 500 });
    }) as typeof fetch;
    const upserts: unknown[] = [];
    const query = {
      select: () => ({ in: () => Promise.resolve({ data: [{ code: "selic_meta", source: "sgs", source_id: "432", last_date: "2026-11-01" }], error: null }) }),
      upsert: (rows: unknown) => { upserts.push(rows); return Promise.resolve({ error: null }); },
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    };
    try {
      const result = await refreshAllMacro({ from: () => query }, ["selic_meta"], { hgbrasilKey: "k" });
      expect(result).toEqual({ updated: 1, failed: [], fallbackUsed: ["selic_meta"] });
      expect(upserts).toEqual([[{ series_code: "selic_meta", date: "2026-11-10", value: 15 }]]);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
