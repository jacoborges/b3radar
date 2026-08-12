import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface LiveQuote {
  ticker: string;
  price: number;
  changePercent: number;
  previousClose: number | null;
  updatedAt: string; // ISO
}

const inputSchema = z.object({
  tickers: z.array(z.string().min(1).max(10)).max(200),
  token: z.string().trim().min(1).max(120).optional(),
});

const BRAPI_BASE = "https://brapi.dev/api/quote";
const DEFAULT_BATCH_SIZE = 15;
const CONCURRENCY = 6;

interface BrapiFailure {
  code: string;
  message: string;
  status: number;
  /** Max assets per request allowed by the plan, when the API tells us. */
  maxPerRequest?: number;
}

interface BatchResult {
  quotes: LiveQuote[];
  failure: BrapiFailure | null;
}

function parseMaxPerRequest(message: string): number | undefined {
  const m = /máximo\s+(\d+)\s+ativo/i.exec(message);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function fetchBatch(batch: string[], token: string | undefined): Promise<BatchResult> {
  const url = new URL(`${BRAPI_BASE}/${batch.join(",")}`);
  if (token) url.searchParams.set("token", token);

  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });

  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    let message = `A fonte de cotações respondeu ${res.status}.`;
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      if (body?.code) code = body.code;
      if (body?.message) message = body.message;
    } catch {
      /* corpo não-JSON */
    }
    return {
      quotes: [],
      failure: { code, message, status: res.status, maxPerRequest: parseMaxPerRequest(message) },
    };
  }

  const json = (await res.json()) as {
    results?: Array<{
      symbol?: string;
      regularMarketPrice?: number;
      regularMarketChangePercent?: number;
      regularMarketPreviousClose?: number;
    }>;
  };
  const now = new Date().toISOString();
  const quotes = (json.results ?? [])
    .filter((r) => typeof r?.symbol === "string" && typeof r.regularMarketPrice === "number")
    .map((r) => ({
      ticker: r.symbol as string,
      price: r.regularMarketPrice as number,
      changePercent: r.regularMarketChangePercent ?? 0,
      previousClose: r.regularMarketPreviousClose ?? null,
      updatedAt: now,
    }));
  return { quotes, failure: null };
}

function chunk(items: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Executa em fila, com no máximo `limit` requisições simultâneas. */
async function runPool(batches: string[][], token: string | undefined): Promise<BatchResult[]> {
  const results: BatchResult[] = new Array(batches.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, batches.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= batches.length) return;
      try {
        results[i] = await fetchBatch(batches[i]!, token);
      } catch {
        results[i] = {
          quotes: [],
          failure: { code: "NETWORK", message: "Falha de rede ao consultar cotações.", status: 0 },
        };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function friendlyError(f: BrapiFailure): string {
  switch (f.code) {
    case "QUOTES_PER_REQUEST_EXCEEDED":
      return `Seu plano brapi limita a ${f.maxPerRequest ?? 1} ativo(s) por consulta.`;
    case "NETWORK":
      return f.message;
    default:
      break;
  }
  if (f.status === 401 || f.status === 403)
    return "Token brapi inválido ou sem permissão — confira em Ajustes.";
  if (f.status === 429)
    return "Limite de consultas da brapi atingido — tente novamente em alguns minutos.";
  return f.message;
}

export const fetchLiveQuotes = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ quotes: LiveQuote[]; error: string | null }> => {
    const tickers = Array.from(new Set(data.tickers.map((t) => t.toUpperCase())));
    if (tickers.length === 0) return { quotes: [], error: null };

    const token = data.token ?? process.env.BRAPI_TOKEN;

    try {
      // 1ª tentativa: lotes grandes (planos que permitem vários ativos por requisição).
      let batches = chunk(tickers, DEFAULT_BATCH_SIZE);
      let results = await runPool(batches, token);

      // Plano restrito: refaz tudo respeitando o limite informado pela própria API.
      const limitFailure = results.find(
        (r) => r?.failure?.code === "QUOTES_PER_REQUEST_EXCEEDED",
      )?.failure;
      if (limitFailure && tickers.length > 1) {
        const size = Math.max(1, limitFailure.maxPerRequest ?? 1);
        batches = chunk(tickers, size);
        results = await runPool(batches, token);
      }

      const quotes = results.flatMap((r) => r?.quotes ?? []);
      const failure = results.find((r) => r?.failure)?.failure ?? null;

      if (quotes.length === 0 && failure) {
        return { quotes: [], error: friendlyError(failure) };
      }
      return { quotes, error: null };
    } catch (err) {
      console.error("[fetchLiveQuotes] failed", err);
      return { quotes: [], error: "Falha ao consultar cotações ao vivo." };
    }
  });
