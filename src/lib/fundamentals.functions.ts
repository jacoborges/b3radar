import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
  token: z.string().trim().min(1).max(120).optional(),
});

export interface TickerFundamentals {
  pl: number | null;
  pvp: number | null;
  dy: number | null;
  roe: number | null;
  margemLiquida: number | null;
  margemEbit: number | null;
  divBrutaPatrimonio: number | null;
  liquidezCorrente: number | null;
  valorMercado: number | null;
  liquidezDiaria: number | null;
  preco: number | null;
}

export interface TickerFundamentalsResult {
  fundamentals: TickerFundamentals | null;
  fonte: "brapi" | null;
  error: string | null;
}

interface BrapiQuote {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  priceEarnings?: number;
  earningsPerShare?: number;
  defaultKeyStatistics?: {
    priceToBook?: number;
    forwardPE?: number;
    trailingPE?: number;
    enterpriseToEbitda?: number;
  };
  financialData?: {
    returnOnEquity?: number;
    profitMargins?: number;
    operatingMargins?: number;
    debtToEquity?: number;
    currentRatio?: number;
    dividendYield?: number;
  };
  summaryProfile?: {
    dividendYield?: number;
  };
  dividendsData?: {
    yield?: number;
    cashDividends?: unknown[];
  };
}

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function pct(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  // brapi returns some ratios as fractions (0.15 = 15%), others já em %
  return Math.abs(n) < 3 ? n * 100 : n;
}

export const getTickerFundamentals = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<TickerFundamentalsResult> => {
    const ticker = data.ticker;
    const token = data.token ?? process.env.BRAPI_TOKEN;

    try {
      const url = new URL(`https://brapi.dev/api/quote/${ticker}`);
      url.searchParams.set(
        "modules",
        "defaultKeyStatistics,financialData,summaryProfile,balanceSheetHistory",
      );
      url.searchParams.set("fundamental", "true");
      url.searchParams.set("dividends", "false");
      if (token) url.searchParams.set("token", token);

      const res = await fetch(url.toString(), {
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        let message = `brapi HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { message?: string };
          if (body?.message) message = body.message;
        } catch {
          /* corpo não-JSON */
        }
        if (res.status === 401 || res.status === 403)
          message = "Token brapi inválido ou sem permissão — confira em Ajustes.";
        if (res.status === 429)
          message = "Limite de consultas da brapi atingido — tente em alguns minutos.";
        return { fundamentals: null, fonte: null, error: message };
      }
      const json = (await res.json()) as { results?: BrapiQuote[] };
      const q = json.results?.[0];
      if (!q) {
        return { fundamentals: null, fonte: null, error: "Ticker não encontrado" };
      }

      const keyStats = q.defaultKeyStatistics ?? {};
      const fin = q.financialData ?? {};

      const pl = num(q.priceEarnings) ?? num(keyStats.trailingPE) ?? num(keyStats.forwardPE);
      const pvp = num(keyStats.priceToBook);
      const dy =
        pct(fin.dividendYield) ??
        pct(q.summaryProfile?.dividendYield) ??
        pct(q.dividendsData?.yield);
      const roe = pct(fin.returnOnEquity);
      const margemLiquida = pct(fin.profitMargins);
      const margemEbit = pct(fin.operatingMargins);
      // debtToEquity da brapi é % (ex: 120 significa 1.2x). Convertendo para múltiplo:
      const dpRaw = num(fin.debtToEquity);
      const divBrutaPatrimonio = dpRaw == null ? null : dpRaw > 5 ? dpRaw / 100 : dpRaw;
      const liquidezCorrente = num(fin.currentRatio);
      const valorMercadoBi = num(q.marketCap);
      const valorMercado =
        valorMercadoBi == null ? null : Number((valorMercadoBi / 1_000_000_000).toFixed(2));
      const preco = num(q.regularMarketPrice);
      // volume × preço → liquidez diária em R$; convertendo para "milhões"
      const volume = num(q.regularMarketVolume);
      const liquidezDiaria =
        volume != null && preco != null
          ? Number(((volume * preco) / 1_000_000).toFixed(2))
          : null;

      setResponseHeader(
        "cache-control",
        "public, s-maxage=3600, stale-while-revalidate=86400",
      );

      return {
        fundamentals: {
          pl,
          pvp,
          dy,
          roe,
          margemLiquida,
          margemEbit,
          divBrutaPatrimonio,
          liquidezCorrente,
          valorMercado,
          liquidezDiaria,
          preco,
        },
        fonte: "brapi",
        error: null,
      };
    } catch (err) {
      console.error("[getTickerFundamentals] failed", err);
      return { fundamentals: null, fonte: null, error: "Falha ao consultar brapi" };
    }
  });
