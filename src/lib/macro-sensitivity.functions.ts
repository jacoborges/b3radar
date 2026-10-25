import { geminiSearch } from "./gemini-search.server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
  nome: z.string().trim().max(120).optional(),
  setor: z.string().trim().max(80).optional(),
});

export interface MacroSensitivityResult {
  content: string | null;
  cached: boolean;
  updatedAt: string;
  error: string | null;
  citations?: string[];
}

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE = new Map<string, { content: string; ts: number; citations: string[] }>();


export const analyzeMacroSensitivity = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<MacroSensitivityResult> => {
    setResponseHeader("cache-control", "no-store");


    const cacheKey = data.ticker;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return {
        content: cached.content,
        cached: true,
        updatedAt: new Date(cached.ts).toISOString(),
        error: null,
        citations: cached.citations,
      };
    }

    const nomeCurto = (data.nome ?? data.ticker).split(" ").slice(0, 3).join(" ");
    const setorTxt = data.setor ? ` do setor de ${data.setor}` : "";

    const systemPrompt = `Você é um analista macroeconômico brasileiro. Explique de forma didática, em português claro e acessível a investidores iniciantes, como uma ação específica pode ser afetada POSITIVAMENTE ou NEGATIVAMENTE por variações de três variáveis macro: DÓLAR, INFLAÇÃO e TAXA SELIC.

Responda em markdown com EXATAMENTE esta estrutura:

### 💵 Dólar
- **Se o dólar sobe:** ...
- **Se o dólar cai:** ...

### 📈 Inflação
- **Se a inflação sobe:** ...
- **Se a inflação cai:** ...

### 🏦 Taxa Selic
- **Se a Selic sobe:** ...
- **Se a Selic cai:** ...

### 🎯 Resumo
Uma frase curta classificando o ativo como "defensivo", "cíclico", "exportador", "consumidor de dólar", "sensível a juros" etc., conforme o caso.

Considere o setor e o modelo de negócio da empresa (exportadora, importadora, endividada em dólar, dependente de crédito, consumo discricionário, commodities, bancos etc.). Cite fontes com marcadores [1], [2] na mesma ordem em que aparecem em citations. Seja objetivo — cada bullet com no máximo 2 linhas.`;

    const userPrompt = `Explique de forma didática como a ação ${data.ticker} (${nomeCurto})${setorTxt} pode ser afetada positivamente ou negativamente com a alta ou a queda do dólar, da inflação e da taxa Selic.`;

    try {
      const g = await geminiSearch(systemPrompt, userPrompt, "macro-sensitivity");
      const text = g.text;
      const citations = g.citations;
      const json = { error: g.error ? { message: g.error } : undefined };

      if (!text) {
        return {
          content: null,
          cached: false,
          updatedAt: new Date().toISOString(),
          error: json.error?.message ?? "Resposta vazia da IA.",
        };
      }

      CACHE.set(cacheKey, { content: text, ts: Date.now(), citations });
      return {
        content: text,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: null,
        citations,
      };
    } catch (err) {
      console.error("[analyzeMacroSensitivity] failed", data.ticker, err);
      return {
        content: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: "Não foi possível contatar o Gemini agora.",
      };
    }
  });
