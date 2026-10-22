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
    expect(result).toEqual({ updated: 0, failed: ["unknown"] });
    expect(writes).toBe(0);
  });
});