import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDataMode, maskKey, tickersForAlt, type DataMode } from "@/lib/providers/merge";
import { bolsaiFundamentals, bolsaiQuote, hgQuote, type AltFundamentals } from "@/lib/providers/alt.server";
import type { LiveQuote } from "@/lib/quotes.functions";

export interface ProviderSettings {
  mode: DataMode;
  keys: { bolsai: string; hgbrasil: string; partnr: string }; // mascaradas
}

type Ctx = { supabase: any; userId: string };
async function loadRow(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("user_settings").select("bolsai_key, hgbrasil_key, partnr_key, data_mode")
    .eq("user_id", ctx.userId).maybeSingle();
  return {
    mode: (isDataMode(data?.data_mode) ? data.data_mode : "hybrid") as DataMode,
    bolsai: (data?.bolsai_key ?? "").trim(),
    hgbrasil: (data?.hgbrasil_key ?? "").trim(),
    partnr: (data?.partnr_key ?? "").trim(),
  };
}

export const getMyProviderSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProviderSettings> => {
    const r = await loadRow(context);
    return { mode: r.mode, keys: { bolsai: maskKey(r.bolsai), hgbrasil: maskKey(r.hgbrasil), partnr: maskKey(r.partnr) } };
  });

const setSchema = z.object({
  mode: z.enum(["brapi", "hybrid", "alt_first"]).optional(),
  provider: z.enum(["bolsai", "hgbrasil", "partnr"]).optional(),
  key: z.string().trim().max(200).optional(),
});

export const setMyProviderSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => setSchema.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { user_id: context.userId };
    if (data.mode) patch.data_mode = data.mode;
    if (data.provider && data.key !== undefined) patch[`${data.provider}_key`] = data.key === "" ? null : data.key;
    const { error } = await context.supabase.from("user_settings").upsert(patch as never, { onConflict: "user_id" });
    if (error) throw new Error("Não foi possível salvar.");
    return { ok: true as const };
  });

export const testMyProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ provider: z.enum(["bolsai", "hgbrasil", "partnr"]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    const r = await loadRow(context);
    const key = r[data.provider];
    if (!key) return { ok: false, message: "Nenhuma chave salva." };
    if (data.provider === "partnr")
      return { ok: false, message: "Chave guardada. A Partnr ainda não tem documentação pública verificada; será usada quando a integração for liberada." };
    const res = data.provider === "hgbrasil" ? await hgQuote("PETR4", key) : await bolsaiQuote("PETR4", key);
    if (res.quote) return { ok: true, message: `Chave válida — PETR4 R$ ${res.quote.price.toFixed(2)}` };
    if (res.status === 401 || res.status === 403) return { ok: false, message: "Chave inválida ou sem permissão." };
    if (res.status === 429) return { ok: false, message: "Limite diário atingido nesta fonte." };
    return { ok: false, message: "A fonte não respondeu agora; tente mais tarde." };
  });

const MAX_ALT = 25;

/** Busca cotações nas fontes alternativas configuradas pelo usuário (HG Brasil → Bolsai). */
export const fetchAltQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tickers: z.array(z.string().min(1).max(10)).max(200), got: z.array(z.string().max(10)).max(200).default([]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ quotes: LiveQuote[]; mode: DataMode }> => {
    const r = await loadRow(context);
    if (r.mode === "brapi" || (!r.hgbrasil && !r.bolsai)) return { quotes: [], mode: r.mode };
    const all = Array.from(new Set(data.tickers.map((t) => t.toUpperCase())));
    const tickers = tickersForAlt(r.mode, all, new Set(data.got.map((t) => t.toUpperCase()))).slice(0, MAX_ALT);
    if (tickers.length === 0) return { quotes: [], mode: r.mode };
    const quotes: LiveQuote[] = [];
    let hgDown = !r.hgbrasil, bolsaiDown = !r.bolsai;
    for (const t of tickers) {
      if (!hgDown) {
        const h = await hgQuote(t, r.hgbrasil);
        if (h.quote) { quotes.push(h.quote); continue; }
        if (h.status === 401 || h.status === 403 || h.status === 429) hgDown = true;
      }
      if (!bolsaiDown) {
        const b = await bolsaiQuote(t, r.bolsai);
        if (b.quote) { quotes.push(b.quote); continue; }
        if (b.status === 401 || b.status === 403 || b.status === 429) bolsaiDown = true;
      }
      if (hgDown && bolsaiDown) break;
    }
    return { quotes, mode: r.mode };
  });

/** Fundamentos complementares (Bolsai) para preencher campos vazios na ficha do ativo. */
export const fetchAltFundamentals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ticker: z.string().trim().min(4).max(7).toUpperCase() }).parse(d))
  .handler(async ({ data, context }): Promise<{ fields: AltFundamentals | null; source: "bolsai" | null }> => {
    const r = await loadRow(context);
    if (r.mode === "brapi" || !r.bolsai) return { fields: null, source: null };
    const { f } = await bolsaiFundamentals(data.ticker, r.bolsai);
    return { fields: f, source: f ? "bolsai" : null };
  });
