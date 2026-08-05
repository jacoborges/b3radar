import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
  nome: z.string().trim().max(120).optional(),
});

export interface PrecoTetoResult {
  content: string | null;
  /** média ponderada anual de dividendos + JCP (R$/ação) */
  media: number | null;
  minimo: number | null;
  maximo: number | null;
  cached: boolean;
  updatedAt: string;
  error: string | null;
  citations?: string[];
}

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE = new Map<
  string,
  {
    content: string;
    media: number | null;
    minimo: number | null;
    maximo: number | null;
    citations: string[];
    ts: number;
  }
>();

interface PerplexityResponse {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: string[];
  error?: { message?: string };
}

function parseNum(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractValues(text: string): {
  media: number | null;
  minimo: number | null;
  maximo: number | null;
} {
  const grab = (label: string) => {
    const re = new RegExp(`${label}\\s*[:=]\\s*([^\\n|]+)`, "i");
    const m = text.match(re);
    return parseNum(m?.[1]);
  };
  return {
    media: grab("MEDIA"),
    minimo: grab("MINIMO"),
    maximo: grab("MAXIMO"),
  };
}

export const analyzePrecoTeto = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<PrecoTetoResult> => {
    setResponseHeader("cache-control", "no-store");

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return {
        content: null,
        media: null,
        minimo: null,
        maximo: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error:
          "Conector Perplexity não está linkado ao projeto. Peça ao Lovable para conectar Perplexity.",
      };
    }

    const cacheKey = data.ticker;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return {
        content: cached.content,
        media: cached.media,
        minimo: cached.minimo,
        maximo: cached.maximo,
        cached: true,
        updatedAt: new Date(cached.ts).toISOString(),
        error: null,
        citations: cached.citations,
      };
    }

    const nomeCurto = (data.nome ?? data.ticker).split(" ").slice(0, 3).join(" ");

    const systemPrompt = `Você é um analista de renda variável brasileira. Pesquise em fontes confiáveis (RI da empresa, CVM, B3, Status Invest, Fundamentus) o histórico de proventos (dividendos + JCP) por ação dos últimos cinco anos completos.

Responda em português brasileiro, em markdown, de forma objetiva:
1. Uma tabela ano a ano com dividendos, JCP e total por ação (R$).
2. A média ponderada anual do somatório de dividendos + JCP dos últimos cinco anos.
3. Se as fontes divergirem, informe explicitamente o valor mínimo e o valor máximo encontrados.

Cite as fontes com marcadores numéricos [1], [2] na mesma ordem em que aparecem em citations. Nunca invente valores.

OBRIGATÓRIO: termine a resposta com um bloco exatamente neste formato, em uma linha cada, usando ponto como separador decimal e apenas números:
DADOS
MEDIA: <número>
MINIMO: <número ou vazio se não houver divergência>
MAXIMO: <número ou vazio se não houver divergência>`;

    const userPrompt = `Informe a média ponderada do somatório de dividendos e JCP dos últimos cinco anos da ação ${data.ticker} (${nomeCurto}). Após a sua análise, caso encontre valores divergentes, informe o mínimo e o máximo em sua resposta.`;

    try {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 900,
          search_domain_filter: [
            "-reddit.com",
            "-twitter.com",
            "-x.com",
            "-facebook.com",
            "-instagram.com",
          ],
        }),
      });

      const fail = (error: string): PrecoTetoResult => ({
        content: null,
        media: null,
        minimo: null,
        maximo: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error,
      });

      if (res.status === 429) {
        return fail("Limite momentâneo da Perplexity atingido. Tente novamente em alguns segundos.");
      }
      if (res.status === 401) {
        const body = await res.text();
        if (body.includes("insufficient_quota")) {
          return fail(
            "Créditos da Perplexity esgotados. Adicione crédito em console.perplexity.ai (créditos de API são separados do Perplexity Pro).",
          );
        }
        return fail("Chave da Perplexity inválida. Reconecte o conector.");
      }
      if (!res.ok) {
        const body = await res.text();
        console.error("[preco-teto] http", res.status, body);
        return fail(`Falha na API da Perplexity (HTTP ${res.status}).`);
      }

      const json = (await res.json()) as PerplexityResponse;
      const text = json.choices?.[0]?.message?.content?.trim();
      const citations = Array.isArray(json.citations) ? json.citations.slice(0, 10) : [];

      if (!text) {
        return fail(json.error?.message ?? "Resposta vazia da Perplexity.");
      }

      const { media, minimo, maximo } = extractValues(text);
      const visible = text.replace(/\n?DADOS[\s\S]*$/i, "").trim();

      CACHE.set(cacheKey, {
        content: visible,
        media,
        minimo,
        maximo,
        citations,
        ts: Date.now(),
      });

      return {
        content: visible,
        media,
        minimo,
        maximo,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: null,
        citations,
      };
    } catch (err) {
      console.error("[analyzePrecoTeto] failed", data.ticker, err);
      return {
        content: null,
        media: null,
        minimo: null,
        maximo: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: "Não foi possível contatar a Perplexity agora.",
      };
    }
  });
