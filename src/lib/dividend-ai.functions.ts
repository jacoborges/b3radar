import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
  nome: z.string().trim().max(120).optional(),
  setor: z.string().trim().max(80).optional(),
  ultimosEventos: z
    .array(
      z.object({
        tipo: z.string(),
        valor: z.number(),
        dataCom: z.string().nullable(),
      }),
    )
    .max(12)
    .optional(),
  proximaDataComEstimada: z.string().nullable().optional(),
  frequencia: z.string().optional(),
  score: z.number().optional(),
  classificacao: z.string().optional(),
});

export interface DividendAiResult {
  content: string | null;
  cached: boolean;
  updatedAt: string;
  error: string | null;
  citations?: string[];
}

const TTL_MS = 24 * 60 * 60 * 1000;

// =============================================================
// Perplexity — busca real em RI da empresa, CVM e B3
// =============================================================

const PPLX_CACHE = new Map<string, { content: string; ts: number; citations: string[] }>();

interface PerplexityResponse {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: string[];
  error?: { message?: string };
}

export const analyzeDividendsWithPerplexity = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<DividendAiResult> => {
    setResponseHeader("cache-control", "no-store");

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return {
        content: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error:
          "Conector Perplexity não está linkado ao projeto. Peça ao Lovable para conectar Perplexity.",
      };
    }

    const anoAtual = new Date().getFullYear();
    const anoProximo = anoAtual + 1;
    const cacheKey = `${data.ticker}:${anoAtual}`;

    const cached = PPLX_CACHE.get(cacheKey);
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
    const userPrompt = `"${data.ticker}" "${nomeCurto}" RI dividendos JCP ${anoAtual}`;

    const systemPrompt = `Você é um analista de renda variável brasileira. Pesquise nas fontes oficiais (site de RI da empresa, CVM, B3) sobre política de dividendos, proventos aprovados (dividendos e JCP) e fatos relevantes recentes do ticker informado.

REGRA TEMPORAL OBRIGATÓRIA: liste APENAS proventos cuja Data COM, Data EX ou Data de Pagamento esteja entre 01/01/${anoAtual} e 31/12/${anoProximo} (ano corrente + próximos 12 meses). Inclua proventos já anunciados/provisionados para pagamento futuro nessa janela. Descarte completamente qualquer provento com datas anteriores a 01/01/${anoAtual} — não os cite, nem em resumo, nem em tabela.

Responda em português brasileiro, em markdown, de forma clara e organizada. Cite as fontes usando marcadores numéricos [1], [2], [3] etc. no texto, na mesma ordem em que aparecem em citations. Nunca invente datas ou valores.`;

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
          search_after_date_filter: `01/01/${anoAtual}`,
          search_domain_filter: [
            "-reddit.com",
            "-twitter.com",
            "-x.com",
            "-facebook.com",
            "-instagram.com",
          ],
        }),
      });


      if (res.status === 429) {
        return {
          content: null,
          cached: false,
          updatedAt: new Date().toISOString(),
          error: "Limite momentâneo da Perplexity atingido. Tente novamente em alguns segundos.",
        };
      }
      if (res.status === 401) {
        const body = await res.text();
        if (body.includes("insufficient_quota")) {
          return {
            content: null,
            cached: false,
            updatedAt: new Date().toISOString(),
            error:
              "Créditos da Perplexity esgotados. Adicione crédito em console.perplexity.ai (créditos de API são separados do Perplexity Pro).",
          };
        }
        return {
          content: null,
          cached: false,
          updatedAt: new Date().toISOString(),
          error: "Chave da Perplexity inválida. Reconecte o conector.",
        };
      }
      if (!res.ok) {
        const body = await res.text();
        console.error("[perplexity] http", res.status, body);
        return {
          content: null,
          cached: false,
          updatedAt: new Date().toISOString(),
          error: `Falha na API da Perplexity (HTTP ${res.status}).`,
        };
      }

      const json = (await res.json()) as PerplexityResponse;
      const text = json.choices?.[0]?.message?.content?.trim();
      const citations = Array.isArray(json.citations) ? json.citations.slice(0, 10) : [];

      if (!text) {
        return {
          content: null,
          cached: false,
          updatedAt: new Date().toISOString(),
          error: json.error?.message ?? "Resposta vazia da Perplexity.",
        };
      }

      PPLX_CACHE.set(data.ticker, { content: text, ts: Date.now(), citations });
      return {
        content: text,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: null,
        citations,
      };
    } catch (err) {
      console.error("[analyzeDividendsWithPerplexity] failed", data.ticker, err);
      return {
        content: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: "Não foi possível contatar a Perplexity agora.",
      };
    }
  });

