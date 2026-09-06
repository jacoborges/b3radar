import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
  nome: z.string().trim().max(120).optional(),
  force: z.boolean().optional(),
});

export interface DadosDdmResult {
  /** payout declarado na política de dividendos (decimal) */
  payout: number | null;
  /** dividendo por ação projetado para o próximo ano (R$) */
  dpaProjetado: number | null;
  /** ROE projetado (decimal) */
  roeProjetado: number | null;
  /** beta da ação */
  beta: number | null;
  ano: number | null;
  content: string | null;
  citations: string[];
  cached: boolean;
  updatedAt: string;
  error: string | null;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE = new Map<string, { value: Omit<DadosDdmResult, "cached" | "updatedAt">; ts: number }>();

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

export const buscarDadosDdm = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<DadosDdmResult> => {
    setResponseHeader("cache-control", "no-store");
    const now = new Date().toISOString();

    const fail = (error: string): DadosDdmResult => ({
      payout: null,
      dpaProjetado: null,
      roeProjetado: null,
      beta: null,
      ano: null,
      content: null,
      citations: [],
      cached: false,
      updatedAt: now,
      error,
    });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return fail("IA indisponível (chave de acesso não configurada).");

    const cacheKey = `ddm-v1:${data.ticker}`;
    const hit = CACHE.get(cacheKey);
    if (!data.force && hit && Date.now() - hit.ts < TTL_MS) {
      return { ...hit.value, cached: true, updatedAt: new Date(hit.ts).toISOString() };
    }

    const { readCache, writeCache, CACHE_TTL } = await import("./market-cache.server");
    const stored = data.force
      ? null
      : await readCache<(typeof hit)["value"]>("ai-valuation-ddm", data.ticker, CACHE_TTL.ai);
    if (stored) {
      CACHE.set(cacheKey, { value: stored.payload, ts: new Date(stored.fetchedAt).getTime() });
      return { ...stored.payload, cached: true, updatedAt: stored.fetchedAt };
    }

    const nomeCurto = (data.nome ?? data.ticker).split(" ").slice(0, 3).join(" ");
    const anoAlvo = new Date().getFullYear() + 1;

    const systemPrompt = `Você é um analista de renda variável brasileira especializado em bancos e instituições financeiras.

FONTES PERMITIDAS: casas de análise (BTG Pactual Research, XP, Itaú BBA, Santander, Bradesco BBI, Genial, Safra), o site de RI da companhia (política de dividendos, estatuto social, guidance, releases) e plataformas de dados de mercado (TradingView, Yahoo Finance, Investing) apenas para o beta. Não use fóruns, redes sociais nem blogs.

Responda em português, markdown curto e objetivo:
1. Payout declarado na política de dividendos / estatuto social (em %), com a fonte.
2. Dividendo + JCP por ação projetado para ${anoAlvo} (em R$ por ação), citando as casas que sustentam o número.
3. ROE projetado para ${anoAlvo} (em %).
4. Beta da ação (5 anos, mensal, contra o Ibovespa).
5. Seção "Fontes" com nome e URL completa de cada referência.

Nunca invente números. Se não encontrar, diga "sem dado nas fontes permitidas".

OBRIGATÓRIO: termine com um bloco exatamente neste formato, uma linha cada, usando ponto como separador decimal:
DADOS
PAYOUT_PCT: <payout em %, ex.: 40, ou vazio>
DPA_PROJETADO_BRL: <dividendo por ação projetado em reais, ex.: 2.35, ou vazio>
ROE_PCT: <ROE projetado em %, ou vazio>
BETA: <beta, ex.: 0.95, ou vazio>
ANO: ${anoAlvo}`;

    const userPrompt = `Para a ação ${data.ticker} (${nomeCurto}): qual o payout da política de dividendos, o dividendo por ação projetado para ${anoAlvo}, o ROE projetado e o beta da ação? Informe as fontes com links.`;

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

      if (res.status === 429)
        return fail("Limite momentâneo da IA atingido. Tente de novo em instantes.");
      if (res.status === 402) return fail("Créditos de IA esgotados no workspace.");
      if (!res.ok) {
        const body = await res.text();
        console.error("[valuation-ddm] http", res.status, body);
        return fail(`Falha na IA (HTTP ${res.status}).`);
      }

      const json = (await res.json()) as GatewayResponse;
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) return fail(json.error?.message ?? "Resposta vazia da IA.");

      const payoutPct = parseNum(grab(text, "PAYOUT_PCT"));
      const dpaRaw = parseNum(grab(text, "DPA_PROJETADO_BRL"));
      const roePct = parseNum(grab(text, "ROE_PCT"));
      const betaRaw = parseNum(grab(text, "BETA"));
      const anoRaw = parseNum(grab(text, "ANO"));
      const visible = text.replace(/\n?DADOS[\s\S]*$/i, "").trim();
      const citations = Array.from(
        new Set(
          (visible.match(/https?:\/\/[^\s)\]]+/g) ?? []).map((u) => u.replace(/[.,;]+$/, "")),
        ),
      ).slice(0, 10);

      const value = {
        payout: payoutPct !== null && payoutPct > 0 && payoutPct <= 150 ? payoutPct / 100 : null,
        dpaProjetado: dpaRaw !== null && dpaRaw > 0 && dpaRaw < 1000 ? dpaRaw : null,
        roeProjetado: roePct !== null && roePct > -100 && roePct < 100 ? roePct / 100 : null,
        beta: betaRaw !== null && betaRaw > 0 && betaRaw < 4 ? betaRaw : null,
        ano: anoRaw && anoRaw > 2000 ? Math.round(anoRaw) : anoAlvo,
        content: visible,
        citations,
        error: null as string | null,
      };

      CACHE.set(cacheKey, { value, ts: Date.now() });
      return { ...value, cached: false, updatedAt: now };
    } catch (err) {
      console.error("[buscarDadosDdm] failed", data.ticker, err);
      return fail("Não foi possível contatar a IA agora.");
    }
  });
