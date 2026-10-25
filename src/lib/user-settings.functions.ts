import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_MONTHLY_SALES_LIMIT, validateMonthlySalesLimit } from "./portfolio-sales-control";

/** Token brapi.dev salvo na conta do usuário (RLS: só o próprio dono lê/grava). */
export const getMyBrapiToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ token: string }> => {
    const { data } = await context.supabase
      .from("user_settings")
      .select("brapi_token")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { token: (data?.brapi_token ?? "").trim() };
  });

export const setMyBrapiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => {
    const token = String(input?.token ?? "").trim();
    if (token.length > 200) throw new Error("Token inválido.");
    return { token };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_settings").upsert(
      {
        user_id: context.userId,
        brapi_token: data.token === "" ? null : data.token,
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return { ok: true as const };
  });

/** Setores do filtro "Visualizar somente" salvos na conta. */
export const getMySelectedSectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sectors: string[] }> => {
    const { data } = await context.supabase
      .from("user_settings")
      .select("selected_sectors")
      .eq("user_id", context.userId)
      .maybeSingle();
    const v = data?.selected_sectors;
    return { sectors: Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [] };
  });

export const setMySelectedSectors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sectors: string[] }) => {
    const arr = Array.isArray(input?.sectors) ? input.sectors : [];
    return { sectors: arr.filter((s) => typeof s === "string" && s.length < 120).slice(0, 100) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_settings")
      .upsert({ user_id: context.userId, selected_sectors: data.sectors }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true as const };
  });

/** Preferência do cabeçalho de ativos (indicadores + valuation) salva na conta. */
export const getMyStockColumns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ columns: string[] | null; valuation: boolean | null }> => {
    const { data } = await context.supabase.from("user_settings").select("stock_columns").eq("user_id", context.userId).maybeSingle();
    const v = data?.stock_columns as { columns?: unknown; valuation?: unknown } | null | undefined;
    if (!v || typeof v !== "object") return { columns: null, valuation: null };
    return {
      columns: Array.isArray(v.columns) ? v.columns.filter((x): x is string => typeof x === "string") : null,
      valuation: typeof v.valuation === "boolean" ? v.valuation : null,
    };
  });

export const setMyStockColumns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { columns: string[]; valuation: boolean }) => ({
    columns: (Array.isArray(input?.columns) ? input.columns : []).filter((s) => typeof s === "string" && s.length < 60).slice(0, 80),
    valuation: input?.valuation === true,
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_settings").upsert({ user_id: context.userId, stock_columns: data }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true as const };
  });

export const getMyMonthlySalesLimit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("user_settings")
      .select("monthly_sales_limit").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Não foi possível carregar o limite mensal.");
    return { limit: Number(data?.monthly_sales_limit ?? DEFAULT_MONTHLY_SALES_LIMIT) };
  });

export const setMyMonthlySalesLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit: number }) => ({ limit: validateMonthlySalesLimit(input.limit) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_settings").upsert(
      { user_id: context.userId, monthly_sales_limit: data.limit }, { onConflict: "user_id" },
    );
    if (error) throw new Error("Não foi possível salvar o limite mensal.");
    return { limit: data.limit };
  });
