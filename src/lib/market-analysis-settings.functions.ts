import { createServerFn } from "@tanstack/react-start";
import { requireDriveAuth } from "@/integrations/drive-auth-middleware";

export const MARKET_ANALYSIS_PROMPT_KEY = "market_analysis_prompt";
export const MARKET_ANALYSIS_PROMPT_DEFAULT =
  "Dê preferência a informações recentes e verificáveis, destaque vantagens competitivas, riscos relevantes e mudanças recentes no consenso do mercado.";

export interface MarketPromptSetting {
  value: string;
  version: number;
  updatedAt: string | null;
}

const fallback: MarketPromptSetting = { value: "", version: 1, updatedAt: null };

function cleanPrompt(value: unknown) {
  const prompt = String(value ?? "").trim();
  if (prompt.length > 4000) throw new Error("O prompt deve ter no máximo 4.000 caracteres.");
  return prompt;
}

function requireAdmin(role: string) {
  if (role !== "admin") throw new Error("Apenas administradores podem alterar este prompt.");
}

export async function readMarketPromptSetting() {
  const { readSystemDocument } = await import("./drive-storage.server");
  return readSystemDocument<MarketPromptSetting>("market-analysis-prompt.json", fallback);
}

export const getMarketAnalysisPrompt = createServerFn({ method: "GET" })
  .middleware([requireDriveAuth])
  .handler(async ({ context }) => {
    requireAdmin(context.user.role);
    const setting = await readMarketPromptSetting();
    return {
      prompt: setting.value || MARKET_ANALYSIS_PROMPT_DEFAULT,
      version: setting.version,
      updatedAt: setting.updatedAt,
      isDefault: !setting.value,
    };
  });

export const setMarketAnalysisPrompt = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { prompt: string }) => ({ prompt: cleanPrompt(input.prompt) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context.user.role);
    const { updateSystemDocument } = await import("./drive-storage.server");
    await updateSystemDocument<MarketPromptSetting>(
      "market-analysis-prompt.json",
      fallback,
      (current) => ({
        value: data.prompt,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      }),
    );
    return { ok: true as const };
  });