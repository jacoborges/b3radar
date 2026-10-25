import { geminiSearch } from "./gemini-search.server";
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


export const analyzeDividendsWithPerplexity = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<DividendAiResult> => {
    setResponseHeader("cache-control", "no-store");


    const anoAtual = new Date().getFullYear();
    const anoAnterior = anoAtual - 1;
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
    const userPrompt = `"${data.ticker}" "${nomeCurto}" RI dividendos JCP ${anoAnterior} ${anoAtual}`;

    const systemPrompt = `Você é um analista de renda variável brasileira. Pesquise nas fontes oficiais (site de RI da empresa, CVM, B3) sobre política de dividendos, proventos aprovados (dividendos e JCP) e fatos relevantes recentes do ticker informado.

REGRA TEMPORAL OBRIGATÓRIA: liste APENAS proventos cuja Data COM, Data EX ou Data de Pagamento esteja entre 01/01/${anoAnterior} e 31/12/${anoProximo} (ano anterior + ano corrente + próximos 12 meses). Inclua proventos já anunciados/provisionados para pagamento futuro nessa janela. Descarte completamente qualquer provento com datas anteriores a 01/01/${anoAnterior} — não os cite, nem em resumo, nem em tabela.

Responda em português brasileiro, em markdown, de forma clara e organizada. Cite as fontes usando marcadores numéricos [1], [2], [3] etc. no texto, na mesma ordem em que aparecem em citations. Nunca invente datas ou valores.`;


    try {
      const g = await geminiSearch(systemPrompt, userPrompt, "dividend-ai");
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

      PPLX_CACHE.set(cacheKey, { content: text, ts: Date.now(), citations });
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
        error: "Não foi possível contatar o Gemini agora.",
      };
    }
  });

