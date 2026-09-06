import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
  nome: z.string().trim().max(120).optional(),
  force: z.boolean().optional(),
});

export interface ProjecaoLucroResult {
  /** lucro líquido projetado para o próximo ano, em R$ (valor absoluto) */
  lucroProjetado: number | null;
  /** ano de referência da projeção */
  ano: number | null;
  /** payout declarado/estimado (decimal, ex.: 0.4) quando encontrado */
  payout: number | null;
  content: string | null;
  citations: string[];
  cached: boolean;
  updatedAt: string;
  error: string | null;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE = new Map<
  string,
  {
    lucroProjetado: number | null;
    ano: number | null;
    payout: number | null;
    content: string;
    citations: string[];
    ts: number;
  }
>();

interface GatewayResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function parseNum(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function grab(text: string, label: string): string | null {
  const m = text.match(new RegExp(`${label}\\s*[:=]\\s*([^\\n|]+)`, "i"));
  return m?.[1]?.trim() ?? null;
}

export const projetarLucro = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ProjecaoLucroResult> => {
    setResponseHeader("cache-control", "no-store");
    const now = new Date().toISOString();

    const fail = (error: string): ProjecaoLucroResult => ({
      lucroProjetado: null,
      ano: null,
      payout: null,
      content: null,
      citations: [],
      cached: false,
      updatedAt: now,
      error,
    });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return fail("IA indisponível (chave de acesso não configurada).");

    const cacheKey = `v1:${data.ticker}`;
    const cached = CACHE.get(cacheKey);
    if (!data.force && cached && Date.now() - cached.ts < TTL_MS) {
      return {
        lucroProjetado: cached.lucroProjetado,
        ano: cached.ano,
        payout: cached.payout,
        content: cached.content,
        citations: cached.citations,
        cached: true,
        updatedAt: new Date(cached.ts).toISOString(),
        error: null,
      };
    }

    type StoredProj = {
      lucroProjetado: number | null;
      ano: number | null;
      payout: number | null;
      content: string | null;
      citations: string[];
    };
    const { readCache, writeCache, CACHE_TTL } = await import("./market-cache.server");
    const stored = data.force
      ? null
      : await readCache<StoredProj>("ai-preco-teto-projetivo", data.ticker, CACHE_TTL.ai);
    if (stored) {
      return {
        ...stored.payload,
        citations: stored.payload.citations ?? [],
        cached: true,
        updatedAt: stored.fetchedAt,
        error: null,
      };
    }

    const nomeCurto = (data.nome ?? data.ticker).split(" ").slice(0, 3).join(" ");
    const anoAlvo = new Date().getFullYear() + 1;

    const systemPrompt = `Você é um analista de renda variável brasileira.

FONTES PERMITIDAS: relatórios de casas de análise (BTG Pactual Research — https://content.btgpactual.com/research/home/acoes —, XP, Itaú BBA, Santander, Bradesco BBI, Genial, Safra) e o site de Relações com Investidores (RI) da própria empresa, incluindo guidance e política de dividendos. Não use fóruns, redes sociais nem blogs.

Responda em português, markdown curto e objetivo:
1. Estimativa de lucro líquido consolidado projetado para ${anoAlvo} (em R$ bilhões), citando as casas que sustentam o número.
2. Faixa de projeções encontradas (mínimo e máximo), se houver divergência.
3. Payout praticado/declarado na política de dividendos (em %), com a fonte.
4. Seção "Fontes" com nome e URL completa de cada referência.

Nunca invente números. Se não encontrar, diga "sem dado nas fontes permitidas".

OBRIGATÓRIO: termine com um bloco exatamente neste formato, uma linha cada, usando ponto como separador decimal:
DADOS
LUCRO_PROJETADO_BRL: <lucro líquido projetado para ${anoAlvo} em reais, número inteiro sem separadores, ou vazio>
ANO: ${anoAlvo}
PAYOUT_PCT: <payout em porcentagem, ex.: 40, ou vazio>`;

    const userPrompt = `Qual o lucro líquido projetado para ${anoAlvo} da empresa da ação ${data.ticker} (${nomeCurto}) segundo as casas de análise e o RI da companhia? Informe também o payout praticado ou declarado e as fontes com links.`;

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
          temperature: 0.2,
        }),
      });

      if (res.status === 429) return fail("Limite momentâneo da IA atingido. Tente de novo em instantes.");
      if (res.status === 402) return fail("Créditos de IA esgotados no workspace.");
      if (!res.ok) {
        const body = await res.text();
        console.error("[preco-teto-projetivo] http", res.status, body);
        return fail(`Falha na IA (HTTP ${res.status}).`);
      }

      const json = (await res.json()) as GatewayResponse;
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) return fail(json.error?.message ?? "Resposta vazia da IA.");

      const lucroProjetado = parseNum(grab(text, "LUCRO_PROJETADO_BRL"));
      const anoRaw = parseNum(grab(text, "ANO"));
      const payoutPct = parseNum(grab(text, "PAYOUT_PCT"));
      const visible = text.replace(/\n?DADOS[\s\S]*$/i, "").trim();
      const citations = Array.from(
        new Set((visible.match(/https?:\/\/[^\s)\]]+/g) ?? []).map((u) => u.replace(/[.,;]+$/, ""))),
      ).slice(0, 10);

      const payout =
        payoutPct !== null && payoutPct > 0 && payoutPct <= 150 ? payoutPct / 100 : null;
      const lucro = lucroProjetado !== null && lucroProjetado > 0 ? lucroProjetado : null;
      const ano = anoRaw && anoRaw > 2000 ? Math.round(anoRaw) : anoAlvo;

      CACHE.set(cacheKey, {
        lucroProjetado: lucro,
        ano,
        payout,
        content: visible,
        citations,
        ts: Date.now(),
      });

      return {
        lucroProjetado: lucro,
        ano,
        payout,
        content: visible,
        citations,
        cached: false,
        updatedAt: now,
        error: null,
      };
    } catch (err) {
      console.error("[projetarLucro] failed", data.ticker, err);
      return fail("Não foi possível contatar a IA agora.");
    }
  });
