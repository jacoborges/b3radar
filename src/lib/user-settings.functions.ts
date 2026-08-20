import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
