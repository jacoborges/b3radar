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
  const div5 = (n: number | null) => (n === null ? null : n / 5);

  // A média ponderada é SEMPRE calculada aqui: somatório dos 5 anos ÷ 5.
  const soma = grab("SOMA");
  const somaMin = grab("SOMA_MINIMO");
  const somaMax = grab("SOMA_MAXIMO");

  return {
    media: div5(soma) ?? grab("MEDIA"),
    minimo: div5(somaMin) ?? grab("MINIMO"),
    maximo: div5(somaMax) ?? grab("MAXIMO"),
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
    const anoAtual = new Date().getFullYear();
    const anoIni = anoAtual - 5;
    const anoFim = anoAtual - 1;

    const systemPrompt = `Você é um analista de renda variável brasileira. Consulte fontes oficiais e confiáveis: B3, CVM, o site de Relações com Investidores (RI) da própria empresa e, como apoio, Status Invest e Fundamentus.

Responda em português brasileiro, em markdown, de forma objetiva:
1. Uma tabela com um ano por linha, de ${anoIni} a ${anoFim}, com dividendos, JCP e TOTAL por ação em R$ X,XX (duas casas decimais, arredondando para cima).
2. O somatório dos 5 anos (R$ X,XX).
3. A média ponderada = somatório dos 5 anos dividido por 5 (R$ X,XX).
4. Se as fontes divergirem, informe explicitamente o valor mínimo e o valor máximo da média encontrados.
5. Uma seção final "Fontes" listando cada fonte usada com o nome e o link completo (URL) para conferência.

Cite as fontes no texto com marcadores numéricos [1], [2] na mesma ordem em que aparecem em citations. Nunca invente valores; se um ano não tiver dados, informe R$ 0,00 e explique.

OBRIGATÓRIO: termine a resposta com um bloco exatamente neste formato, em uma linha cada, usando ponto como separador decimal e apenas números (informe SOMATÓRIOS, não médias):
DADOS
SOMA: <somatório dos ${anoIni}-${anoFim}>
SOMA_MINIMO: <somatório mínimo em caso de divergência entre fontes, ou vazio>
SOMA_MAXIMO: <somatório máximo em caso de divergência entre fontes, ou vazio>`;

    const userPrompt = `Consulte na B3, na CVM e no RI da ação ${data.ticker} (${nomeCurto}) os proventos (dividendos + JCP) por ação pagos de ${anoIni} a ${anoFim}. Informe o valor de cada ano individualmente no formato R$ X,XX (arredondando para cima), o somatório desses cinco anos e a média ponderada (somatório dividido por 5). Entregue também as fontes da pesquisa com os links para conferência.`;


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
          max_tokens: 1200,
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
