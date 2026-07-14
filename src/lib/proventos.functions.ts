import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import type { DividendYear, ProventoProvisionado, ProventoTipo } from "./stocks-data";
import type { EventoSocietario, EventoTipo } from "./dividend-intelligence";

const inputSchema = z.object({
  ticker: z.string().trim().min(4).max(7).toUpperCase(),
});

const batchInputSchema = z.object({
  tickers: z.array(z.string().trim().min(4).max(7).toUpperCase()).min(1).max(120),
});

interface B3CashDividend {
  typeStock?: string;
  paymentDate?: string;
  rate?: string | number;
  approvedOn?: string;
  label?: string;
  lastDatePrior?: string;
  dateApproval?: string;
  ratio?: string;
  corporateAction?: string;
  valueCash?: string | number;
}

interface B3StockDividend {
  typeStock?: string;
  assetIssued?: string;
  factor?: string | number;
  approvedOn?: string;
  isinCode?: string;
  label?: string;
  lastDatePrior?: string;
  remarks?: string;
  corporateAction?: string;
}

interface B3CashResponse {
  results?: B3CashDividend[];
  cashDividends?: B3CashDividend[];
}

interface B3SupplementResponse {
  cashDividends?: B3CashDividend[];
  stockDividends?: B3StockDividend[];
  subscriptions?: unknown[];
}

const SELIC: Record<number, number> = {
  2022: 12.38,
  2023: 13.25,
  2024: 10.75,
  2025: 11.15,
  2026: 14.75,
};

function parseNumber(v: string | number | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const cleaned = v.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseB3Date(d: string | undefined): string | null {
  if (!d) return null;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  return null;
}

function normalizeTipoCash(raw: string | undefined): ProventoTipo {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("JCP") || s.includes("JUROS")) return "JCP";
  return "Dividendo";
}

function normalizeTipoStock(raw: string | undefined): EventoTipo | null {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("BONIF")) return "Bonificacao";
  if (s.includes("DESDOB") || s.includes("SPLIT")) return "Desdobramento";
  if (s.includes("GRUP") || s.includes("REVERSE")) return "Grupamento";
  return null;
}

function classMatches(ticker: string, typeStock: string | undefined): boolean {
  if (!typeStock) return true;
  const t = typeStock.toUpperCase();
  const suffix = ticker.match(/(\d+)$/)?.[1];
  if (!suffix) return true;
  if (suffix === "3") return t.includes("ON");
  if (suffix === "4") return t.includes("PN");
  if (suffix === "11") return t.includes("UNT") || t.includes("UNIT");
  if (["5", "6", "7", "8"].includes(suffix)) return t.includes("PN");
  return true;
}

function b64(payload: string): string {
  return typeof Buffer !== "undefined"
    ? Buffer.from(payload, "utf-8").toString("base64")
    : btoa(unescape(encodeURIComponent(payload)));
}

async function fetchCash(issuingCompany: string): Promise<B3CashDividend[]> {
  const url = `https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedCashDividends/${b64(
    JSON.stringify({ issuingCompany, language: "pt-br" }),
  )}`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (compatible; B3Radar/1.0; +https://b3radar.lovable.app)",
      },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as B3CashResponse;
    return json.cashDividends ?? json.results ?? [];
  } catch {
    return [];
  }
}

async function fetchSupplement(
  issuingCompany: string,
  year: number,
): Promise<B3SupplementResponse | null> {
  const url = `https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedSupplementCompany/${b64(
    JSON.stringify({ issuingCompany, language: "pt-br", year }),
  )}`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (compatible; B3Radar/1.0; +https://b3radar.lovable.app)",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as B3SupplementResponse;
  } catch {
    return null;
  }
}

async function fetchStockEvents(issuingCompany: string): Promise<B3StockDividend[]> {
  // O supplement é por ano; buscamos últimos 5 anos em paralelo.
  const anoAtual = new Date().getUTCFullYear();
  const anos = [0, 1, 2, 3, 4].map((i) => anoAtual - i);
  const results = await Promise.all(anos.map((y) => fetchSupplement(issuingCompany, y)));
  const all: B3StockDividend[] = [];
  for (const r of results) {
    if (r?.stockDividends?.length) all.push(...r.stockDividends);
  }
  // dedupe por (label + lastDatePrior + factor)
  const seen = new Set<string>();
  return all.filter((e) => {
    const k = `${e.label ?? ""}|${e.lastDatePrior ?? ""}|${e.factor ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface TickerProventosResult {
  historico: DividendYear[] | null;
  historicoCompleto: EventoSocietario[] | null;
  provisionados: ProventoProvisionado[] | null;
  fonte: "B3" | null;
  error: string | null;
}

async function buildProventosForTicker(ticker: string): Promise<TickerProventosResult> {
  const issuingCompany = ticker.replace(/\d+$/, "").slice(0, 4);
  if (!issuingCompany || issuingCompany.length < 4) {
    return {
      historico: null,
      historicoCompleto: null,
      provisionados: null,
      fonte: null,
      error: "Ticker inválido",
    };
  }

  try {
    const [rawCash, rawStock] = await Promise.all([
      fetchCash(issuingCompany),
      fetchStockEvents(issuingCompany),
    ]);

    if (rawCash.length === 0 && rawStock.length === 0) {
      return {
        historico: null,
        historicoCompleto: null,
        provisionados: null,
        fonte: null,
        error: "Sem retorno da B3",
      };
    }

    const today = new Date().toISOString().slice(0, 10);

    const eventosCash = rawCash
      .filter((r) => classMatches(ticker, r.typeStock))
      .map((r) => {
        const valor = parseNumber(r.rate ?? r.valueCash);
        const dataCom = parseB3Date(r.lastDatePrior);
        const dataPag = parseB3Date(r.paymentDate);
        const dataAprov = parseB3Date(r.dateApproval ?? r.approvedOn);
        const tipo = normalizeTipoCash(r.label ?? r.corporateAction);
        return { valor, dataCom, dataPag, dataAprov, tipo };
      })
      .filter((e) => e.valor > 0);

    // Historico completo (cash + stock)
    const historicoCompleto: EventoSocietario[] = [];
    for (const e of eventosCash) {
      const dataEx = e.dataCom ? addDaysISO(e.dataCom, 1) : null;
      historicoCompleto.push({
        tipo: e.tipo,
        valor: Number(e.valor.toFixed(4)),
        ratio: null,
        dataCom: e.dataCom,
        dataEx,
        dataPagamento: e.dataPag,
        dataAprovacao: e.dataAprov,
      });
    }
    for (const r of rawStock) {
      if (!classMatches(ticker, r.typeStock)) continue;
      const tipo = normalizeTipoStock(r.label ?? r.corporateAction);
      if (!tipo) continue;
      const dataCom = parseB3Date(r.lastDatePrior);
      const dataAprov = parseB3Date(r.approvedOn);
      const ratio = r.factor != null ? String(r.factor) : null;
      historicoCompleto.push({
        tipo,
        valor: 0,
        ratio,
        dataCom,
        dataEx: dataCom ? addDaysISO(dataCom, 1) : null,
        dataPagamento: null,
        dataAprovacao: dataAprov,
      });
    }
    historicoCompleto.sort((a, b) => (b.dataCom ?? "").localeCompare(a.dataCom ?? ""));

    // Provisionados (futuros): cash + stock
    const provisionados: ProventoProvisionado[] = [];
    for (const e of eventosCash) {
      const isFuture =
        (e.dataPag && e.dataPag > today) ||
        (!e.dataPag && e.dataCom && e.dataCom > today);
      if (!isFuture) continue;
      const dataCom = e.dataCom ?? e.dataAprov ?? today;
      const dataEx = addDaysISO(dataCom, 1);
      const dataPagamento = e.dataPag ?? dataEx;
      provisionados.push({
        tipo: e.tipo,
        valorPorAcao: Number(e.valor.toFixed(4)),
        dataCom,
        dataEx,
        dataPagamento,
      });
    }
    provisionados.sort((a, b) => a.dataCom.localeCompare(b.dataCom));

    // Histórico agregado por ano (compat com componentes atuais)
    const anos = [2022, 2023, 2024, 2025, 2026];
    const historico: DividendYear[] = anos.map((y) => {
      const eventosDoAno = eventosCash.filter((e) => {
        const ref = e.dataPag ?? e.dataCom ?? e.dataAprov;
        return ref?.startsWith(String(y));
      });
      let dividendo = 0;
      let jcp = 0;
      for (const e of eventosDoAno) {
        if (e.tipo === "JCP") jcp += e.valor;
        else dividendo += e.valor;
      }
      return {
        year: y,
        dividendo: Number(dividendo.toFixed(4)),
        jcp: Number(jcp.toFixed(4)),
        selicMediaPonderada: SELIC[y] ?? 12,
        precoMedio: 0,
      };
    });

    return {
      historico,
      historicoCompleto,
      provisionados,
      fonte: "B3",
      error: null,
    };
  } catch (err) {
    console.error("[buildProventosForTicker] failed", ticker, err);
    return {
      historico: null,
      historicoCompleto: null,
      provisionados: null,
      fonte: null,
      error: "Falha ao consultar B3",
    };
  }
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const getTickerProventos = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<TickerProventosResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    return buildProventosForTicker(data.ticker);
  });

export interface BatchProventosItem {
  ticker: string;
  historicoCompleto: EventoSocietario[];
  provisionados: ProventoProvisionado[];
  fonte: "B3" | null;
  error: string | null;
}

export interface BatchProventosResult {
  items: BatchProventosItem[];
  updatedAt: string;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export const getProventosBatch = createServerFn({ method: "POST" })
  .inputValidator((data) => batchInputSchema.parse(data))
  .handler(async ({ data }): Promise<BatchProventosResult> => {
    setResponseHeader(
      "cache-control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    const items = await mapLimit(data.tickers, 8, async (ticker) => {
      const r = await buildProventosForTicker(ticker);
      return {
        ticker,
        historicoCompleto: r.historicoCompleto ?? [],
        provisionados: r.provisionados ?? [],
        fonte: r.fonte,
        error: r.error,
      } satisfies BatchProventosItem;
    });
    return {
      items,
      updatedAt: new Date().toISOString(),
    };
  });
