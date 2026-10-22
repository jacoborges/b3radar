import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface MacroSeries {
  code: string;
  name: string;
  unit: string;
  frequency: string;
  category: string;
  description: string;
  source: string;
  sortOrder: number;
  lastValue: number | null;
  lastDate: string | null;
  updatedAt: string | null;
}

const STALE_MS = 12 * 60 * 60 * 1000;

export const listMacroSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MacroSeries[]> => {
    const { data, error } = await context.supabase
      .from("macro_series")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      code: r.code,
      name: r.name,
      unit: r.unit,
      frequency: r.frequency,
      category: r.category,
      description: r.description,
      source: r.source,
      sortOrder: r.sort_order,
      lastValue: r.last_value == null ? null : Number(r.last_value),
      lastDate: r.last_date,
      updatedAt: r.updated_at,
    }));
  });

export const getMacroHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ code: z.string().min(1).max(60), years: z.number().int().min(1).max(10) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const from = new Date();
    from.setFullYear(from.getFullYear() - data.years);
    const rows: Array<{ date: string; value: number }> = [];
    // paginação: séries diárias de 10 anos passam de 2.500 pontos
    for (let page = 0; page < 10; page++) {
      const { data: chunk, error } = await context.supabase
        .from("macro_observations")
        .select("date, value")
        .eq("series_code", data.code)
        .gte("date", from.toISOString().slice(0, 10))
        .order("date")
        .range(page * 1000, page * 1000 + 999);
      if (error) throw new Error(error.message);
      rows.push(...(chunk ?? []).map((r) => ({ date: r.date, value: Number(r.value) })));
      if (!chunk || chunk.length < 1000) break;
    }
    return rows;
  });

/** Atualiza do Banco Central/Ipeadata. Sem `force`, só executa se os dados tiverem mais de 12h. */
export const refreshMacro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ force: z.boolean().optional(), codes: z.array(z.string().min(1).max(60)).min(1).max(2).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase.from("macro_series").select("code, updated_at, last_value");
    if (data.codes) query = query.in("code", data.codes);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const stale = (rows ?? []).filter((r) => data.force || r.last_value == null || !r.updated_at || Date.now() - new Date(r.updated_at).getTime() >= STALE_MS);
    if (stale.length === 0) return { skipped: true, updated: 0, failed: [] as string[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refreshAllMacro } = await import("@/lib/macro.server");
    const r = await refreshAllMacro(supabaseAdmin, stale.map((r) => r.code));
    return { skipped: false, ...r };
  });
