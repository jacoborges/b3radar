import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SectorPreference {
  selected: string[];
  known: string[];
}

function cleanSectorList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 200);
}

function parseSectorPreference(value: unknown): SectorPreference | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    selected: cleanSectorList(record.selected),
    known: cleanSectorList(record.known),
  };
}

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

export const getMySectorPreference = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ preference: SectorPreference | null }> => {
    const { data, error } = await context.supabase
      .from("user_settings")
      .select("selected_sectors")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return { preference: parseSectorPreference(data?.selected_sectors) };
  });

export const setMySectorPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SectorPreference) => ({
    selected: cleanSectorList(input?.selected),
    known: cleanSectorList(input?.known),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_settings").upsert(
      {
        user_id: context.userId,
        selected_sectors: data,
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return { ok: true as const };
  });
