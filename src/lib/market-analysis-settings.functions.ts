import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MARKET_ANALYSIS_PROMPT_KEY = "market_analysis_prompt";
export const MARKET_ANALYSIS_PROMPT_DEFAULT =
  "Dê preferência a informações recentes e verificáveis, destaque vantagens competitivas, riscos relevantes e mudanças recentes no consenso do mercado.";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Apenas administradores podem alterar este prompt.");
}

function cleanPrompt(value: unknown): string {
  const prompt = String(value ?? "").trim();
  if (prompt.length > 4000) throw new Error("O prompt deve ter no máximo 4.000 caracteres.");
  return prompt;
}

export const getMarketAnalysisPrompt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("value, version, updated_at")
      .eq("key", MARKET_ANALYSIS_PROMPT_KEY)
      .maybeSingle();
    if (error) throw error;
    return {
      prompt: data?.value || MARKET_ANALYSIS_PROMPT_DEFAULT,
      version: data?.version ?? 1,
      updatedAt: data?.updated_at ?? null,
      isDefault: !data?.value,
    };
  });

export const setMarketAnalysisPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string }) => ({ prompt: cleanPrompt(input.prompt) }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: readError } = await supabaseAdmin
      .from("app_settings")
      .select("version")
      .eq("key", MARKET_ANALYSIS_PROMPT_KEY)
      .maybeSingle();
    if (readError) throw readError;
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: MARKET_ANALYSIS_PROMPT_KEY,
      value: data.prompt,
      version: (current?.version ?? 0) + 1,
    });
    if (error) throw error;
    return { ok: true as const };
  });