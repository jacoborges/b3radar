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


const CACHE = new Map<string, { content: string; ts: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

export const analyzeDividendsWithGemini = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<DividendAiResult> => {
    setResponseHeader("cache-control", "no-store");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        content: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error:
          "Chave do Gemini não configurada. Vá em Configurações e cole sua GEMINI_API_KEY (grátis em aistudio.google.com/apikey).",
      };
    }

    const cached = CACHE.get(data.ticker);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return {
        content: cached.content,
        cached: true,
        updatedAt: new Date(cached.ts).toISOString(),
        error: null,
      };
    }

    const eventosTxt =
      data.ultimosEventos && data.ultimosEventos.length
        ? data.ultimosEventos
            .map(
              (e) =>
                `- ${e.dataCom ?? "s/ data"} · ${e.tipo} · R$ ${e.valor.toFixed(4)}`,
            )
            .join("\n")
        : "(sem histórico enviado)";

    const prompt = `Você é um analista de ações da B3 (Bovespa) especializado em proventos.

Ativo: ${data.ticker}${data.nome ? ` (${data.nome})` : ""}
Setor: ${data.setor ?? "não informado"}
Frequência histórica detectada: ${data.frequencia ?? "não informada"}
Classificação de qualidade dos proventos: ${data.classificacao ?? "não informada"} (score ${data.score ?? "n/d"}/100)
Próxima Data COM estimada pelo modelo: ${data.proximaDataComEstimada ?? "n/d"}

Últimos pagamentos em dinheiro (Data COM · Tipo · Valor por ação):
${eventosTxt}

Escreva uma análise objetiva em português brasileiro, em markdown, com EXATAMENTE duas seções nesta ordem:

## Política de dividendos
2 a 4 frases sobre a frequência oficial declarada pela empresa, payout alvo (se conhecido) e padrão histórico recente. Se você não souber com certeza, diga "não localizado publicamente" — nunca invente números.

## Próximos eventos anunciados no RI
Liste até 4 dividendos ou JCP aprovados pela companhia e ainda não pagos que você conheça publicamente, no formato:
- **Tipo** · Data COM · Valor por ação · Pagamento previsto
Se você não tiver certeza de nenhum evento pendente, escreva apenas: "Sem eventos pendentes conhecidos publicamente até a data de corte do meu treinamento."

Regras:
- Não invente datas nem valores. Prefira omitir a chutar.
- Não repita os dados do prompt como se fossem análise nova.
- Seja conciso: no total, no máximo 180 palavras.
- Nada além dessas duas seções.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 600,
          },
        }),
      });

      if (res.status === 429) {
        return {
          content: null,
          cached: false,
          updatedAt: new Date().toISOString(),
          error:
            "Limite gratuito do Gemini atingido. Tente novamente em alguns minutos.",
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          content: null,
          cached: false,
          updatedAt: new Date().toISOString(),
          error: "Chave do Gemini inválida ou sem permissão. Gere uma nova em aistudio.google.com/apikey.",
        };
      }
      if (!res.ok) {
        return {
          content: null,
          cached: false,
          updatedAt: new Date().toISOString(),
          error: `Falha na API do Gemini (HTTP ${res.status}).`,
        };
      }

      const json = (await res.json()) as GeminiResponse;
      const text = json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();

      if (!text) {
        return {
          content: null,
          cached: false,
          updatedAt: new Date().toISOString(),
          error: json.error?.message ?? "Resposta vazia do Gemini.",
        };
      }

      CACHE.set(data.ticker, { content: text, ts: Date.now() });
      return {
        content: text,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: null,
      };
    } catch (err) {
      console.error("[analyzeDividendsWithGemini] failed", data.ticker, err);
      return {
        content: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: "Não foi possível gerar a análise agora.",
      };
    }
  });

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

    const cached = PPLX_CACHE.get(data.ticker);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      return {
        content: cached.content,
        cached: true,
        updatedAt: new Date(cached.ts).toISOString(),
        error: null,
        citations: cached.citations,
      };
    }

    const eventosTxt =
      data.ultimosEventos && data.ultimosEventos.length
        ? data.ultimosEventos
            .map(
              (e) =>
                `- ${e.dataCom ?? "s/ data"} · ${e.tipo} · R$ ${e.valor.toFixed(4)}`,
            )
            .join("\n")
        : "(sem histórico enviado)";

    void eventosTxt;
    const nomeCurto = (data.nome ?? data.ticker).split(" ").slice(0, 3).join(" ");
    const userPrompt = `"${nomeCurto}" (${data.ticker}) RI dividendos fatos relevantes`;

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
            {
              role: "system",
              content:
                "Você é um analista de renda variável brasileira. Pesquise nas fontes oficiais (site de RI da empresa, CVM, B3) sobre política de dividendos, dividendos/JCP aprovados e fatos relevantes recentes. Responda em português brasileiro, em markdown, de forma clara e organizada. Cite as fontes usando marcadores numéricos [1], [2], [3] etc. no texto, na mesma ordem em que aparecem em citations. Nunca invente datas ou valores.",
            },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 900,
          search_domain_filter: [
            "cvm.gov.br",
            "b3.com.br",
            "rad.cvm.gov.br",
            "sistemaswebb3-listados.b3.com.br",
            "-reddit.com",
            "-twitter.com",
            "-x.com",
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

