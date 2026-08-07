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

interface GatewayResponse {
  choices?: Array<{ message?: { content?: string } }>;
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

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        content: null,
        media: null,
        minimo: null,
        maximo: null,
        cached: false,
        updatedAt: new Date().toISOString(),
        error: "IA indisponível no momento (chave de acesso não configurada).",
      };
    }

    const cacheKey = `v3:${data.ticker}`;
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

    const systemPrompt = `Você é um analista de renda variável brasileira.

REGRA ABSOLUTA DE FONTES: use exclusivamente TRÊS fontes — (1) o site de Relações com Investidores (RI) da própria empresa, (2) a B3 e (3) a CVM. É proibido usar ou citar qualquer outra fonte (Status Invest, Fundamentus, Investidor10, notícias, blogs, redes sociais). Se um ano não constar nessas três fontes, escreva "sem dado nas fontes oficiais" — nunca estime nem preencha com outra origem.

Responda em português brasileiro, em markdown, de forma objetiva:
1. Uma tabela com um ano por linha, de ${anoIni} a ${anoFim}, com colunas: Ano | RI | B3 | CVM | Dividendos | JCP | TOTAL por ação (R$ X,XX, duas casas, arredondando para cima).
2. Confronte as três fontes. Quando houver divergência no total anual, informe explicitamente o valor mínimo e o valor máximo daquele ano.
3. O somatório dos 5 anos (R$ X,XX). Havendo divergência, informe também o somatório mínimo e o somatório máximo.
4. A média ponderada = somatório dos 5 anos dividido por 5 (R$ X,XX).
5. Uma seção final "Fontes" listando cada fonte usada (RI, B3, CVM) com o nome e o link completo (URL) para conferência.

Nunca invente valores.

OBRIGATÓRIO: termine a resposta com um bloco exatamente neste formato, em uma linha cada, usando ponto como separador decimal e apenas números (informe SOMATÓRIOS, não médias):
DADOS
SOMA: <somatório dos ${anoIni}-${anoFim}>
SOMA_MINIMO: <somatório mínimo em caso de divergência entre as três fontes, ou vazio>
SOMA_MAXIMO: <somatório máximo em caso de divergência entre as três fontes, ou vazio>`;

    const userPrompt = `Consulte APENAS o RI da empresa, a B3 e a CVM da ação ${data.ticker} (${nomeCurto}) e levante os proventos (dividendos + JCP) por ação pagos de ${anoIni} a ${anoFim}. Informe o valor de cada ano individualmente no formato R$ X,XX (arredondando para cima), confronte as três fontes e, em caso de divergência, apresente o mínimo e o máximo. Informe o somatório dos cinco anos e a média ponderada (somatório dividido por 5). Entregue as fontes com os links para conferência.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
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
        return fail("Limite momentâneo da IA atingido. Tente novamente em alguns segundos.");
      }
      if (res.status === 402) {
        return fail("Créditos de IA esgotados. Adicione créditos no workspace para continuar.");
      }
      if (!res.ok) {
        const body = await res.text();
        console.error("[preco-teto] http", res.status, body);
        return fail(`Falha na IA (HTTP ${res.status}).`);
      }

      const json = (await res.json()) as GatewayResponse;
      const text = json.choices?.[0]?.message?.content?.trim();

      if (!text) {
        return fail(json.error?.message ?? "Resposta vazia da IA.");
      }

      const { media, minimo, maximo } = extractValues(text);
      const visible = text.replace(/\n?DADOS[\s\S]*$/i, "").trim();
      const citations = Array.from(
        new Set((visible.match(/https?:\/\/[^\s)\]]+/g) ?? []).map((u) => u.replace(/[.,;]+$/, ""))),
      ).slice(0, 10);


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
        error: "Não foi possível contatar a IA agora.",
      };
    }
  });
