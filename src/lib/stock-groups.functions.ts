import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StockGroup } from "./stock-groups";

const HEX = /^#[0-9a-fA-F]{6}$/;
function validName(n: unknown) {
  const s = String(n ?? "").trim();
  if (s.length < 1 || s.length > 40) throw new Error("Nome deve ter de 1 a 40 caracteres.");
  return s;
}
function validColor(c: unknown) {
  const s = String(c ?? "");
  if (!HEX.test(s)) throw new Error("Cor inválida.");
  return s;
}

export const listStockGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StockGroup[]> => {
    const { data, error } = await context.supabase
      .from("stock_groups")
      .select("id, name, color, stock_group_items(ticker)")
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      tickers: (g.stock_group_items ?? []).map((i) => i.ticker),
    }));
  });

export const createStockGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { name: string; color: string }) => ({ name: validName(i?.name), color: validColor(i?.color) }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("stock_groups")
      .insert({ user_id: context.userId, name: data.name, color: data.color })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const updateStockGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; name: string; color: string }) => ({
    id: String(i?.id ?? ""),
    name: validName(i?.name),
    color: validColor(i?.color),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("stock_groups")
      .update({ name: data.name, color: data.color })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteStockGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => ({ id: String(i?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stock_groups").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

export const toggleStockInGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { groupId: string; ticker: string; on: boolean }) => {
    const ticker = String(i?.ticker ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(ticker)) throw new Error("Ticker inválido.");
    return { groupId: String(i?.groupId ?? ""), ticker, on: !!i?.on };
  })
  .handler(async ({ data, context }) => {
    const q = context.supabase.from("stock_group_items");
    const { error } = data.on
      ? await q.upsert({ group_id: data.groupId, ticker: data.ticker }, { onConflict: "group_id,ticker" })
      : await q.delete().eq("group_id", data.groupId).eq("ticker", data.ticker);
    if (error) throw error;
    return { ok: true as const };
  });
