import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
  nome: z.string().trim().max(120).optional(),
  setor: z.string().trim().max(80).optional(),
  force: z.boolean().optional(),
});

export type Recomendacao = "COMPRA" | "NEUTRO" | "VENDA" | null;

export interface MarketAnalysisResult {
  content: string | null;
  recomendacao: Recomendacao;
  cached: boolean;
  updatedAt: string;
  error: string | null;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE = new Map<
  string,
  { content: string; recomendacao: Recomendacao; ts: number }
>();

interface GatewayResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function extractRecomendacao(text: string): Recomendacao {
  const m = text.match(/RECOMENDACAO\s*:\s*(COMPRA|NEUTRO|VENDA)/i);
  if (!m) return null;
  return m[1].toUpperCase() as Recomendacao;
}

function stripRecomendacao(text: string): string {
  return text.replace(/^\s*RECOMENDACAO\s*:.*$/gim, "").trim();
}

export const analyzeMarketView = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<MarketAnalysisResult> => {
    setResponseHeader("cache-control", "no-store");

    const now = new Date().toISOString();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        content: null,
        recomendacao: null,
        cached: false,
        updatedAt: now,
        error: "IA indisponível: chave do gateway não configurada.",
      };
    }

    const cacheKey = data.ticker;
    const cached = CACHE.get(cacheKey);
    if (!data.force && cached && Date.now() - cached.ts < TTL_MS) {
      return {
        content: cached.content,
        recomendacao: cached.recomendacao,
        cached: true,
        updatedAt: new Date(cached.ts).toISOString(),
        error: null,
      };
    }

    const nomeCurto = (data.nome ?? data.ticker).split(" ").slice(0, 3).join(" ");
    const setorTxt = data.setor ? ` (setor: ${data.setor})` : "";

    const systemPrompt = `Você é um analista de investimentos brasileiro. Responda em português, de forma didática e objetiva, sobre uma empresa listada na B3.

Use EXATAMENTE esta estrutura em markdown:

### 🏭 Modelo de negócio
2 a 3 linhas sobre como a empresa ganha dinheiro e suas vantagens competitivas.

### ⏳ Perenidade
2 a 3 linhas sobre a durabilidade do negócio, riscos estruturais, regulação e ciclos.

### 💰 Lucro e rentabilidade
2 a 3 linhas sobre histórico de lucros, margens, ROE e endividamento.

### ⚙️ Efetividade da operação
2 a 3 linhas sobre eficiência operacional, execução, governança e alocação de capital.

### 🏦 Visão das casas de análise
2 a 3 linhas resumindo o consenso típico do mercado (fundamentalista e técnico), sem inventar números precisos ou preços-alvo específicos.

Ao final, escreva em uma linha isolada, sem markdown:
RECOMENDACAO: COMPRA
(ou NEUTRO, ou VENDA — apenas uma dessas três palavras)

Nunca prometa retorno. Deixe claro quando algo é incerto.`;

    const userPrompt = `Quanto ao modelo de negócio, sua perenidade, seu lucro e efetividade da operação, qual a análise do mercado financeiro referente à empresa da ação ${data.ticker} (${nomeCurto})${setorTxt}? Em um termômetro simples, de acordo com a análise fundamentalista e técnica das principais casas de análise do mercado, qual a recomendação para este ativo (compra, neutro ou venda)?`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (res.status === 429) {
        return {
          content: null,
          recomendacao: null,
          cached: false,
          updatedAt: now,
          error: "Limite de uso da IA atingido. Tente novamente em alguns instantes.",
        };
      }
      if (res.status === 402) {
        return {
          content: null,
          recomendacao: null,
          cached: false,
          updatedAt: now,
          error: "Créditos de IA esgotados no workspace. Adicione créditos para continuar.",
        };
      }
      if (!res.ok) {
        const body = await res.text();
        console.error("[market-analysis] http", res.status, body);
        return {
          content: null,
          recomendacao: null,
          cached: false,
          updatedAt: now,
          error: `Falha na IA (HTTP ${res.status}).`,
        };
      }

      const json = (await res.json()) as GatewayResponse;
      const raw = json.choices?.[0]?.message?.content?.trim();
      if (!raw) {
        return {
          content: null,
          recomendacao: null,
          cached: false,
          updatedAt: now,
          error: "A IA não retornou conteúdo. Tente novamente.",
        };
      }

      const recomendacao = extractRecomendacao(raw);
      const content = stripRecomendacao(raw);
      CACHE.set(cacheKey, { content, recomendacao, ts: Date.now() });

      return { content, recomendacao, cached: false, updatedAt: now, error: null };
    } catch (err) {
      console.error("[market-analysis] error", err);
      return {
        content: null,
        recomendacao: null,
        cached: false,
        updatedAt: now,
        error: "Não foi possível contatar a IA no momento.",
      };
    }
  });
