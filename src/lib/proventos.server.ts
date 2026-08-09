import type {
  DividendYear,
  ProventoProvisionado,
  ProventoTipo,
} from "./stocks-data";
import type { EventoSocietario, EventoTipo } from "./dividend-intelligence";

const B3 =
  "https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall";

const UA =
  "Mozilla/5.0 (compatible; B3Radar/1.0; +https://b3radar.lovable.app)";

const SELIC: Record<number, number> = {
  2016: 14.08,
  2017: 9.93,
  2018: 6.44,
  2019: 5.96,
  2020: 2.77,
  2021: 4.42,
  2022: 12.38,
  2023: 13.25,
  2024: 10.75,
  2025: 11.15,
  2026: 14.75,
};


/* ------------------------------- helpers ------------------------------- */

function parseNumber(v: string | number | undefined | null): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const cleaned = v.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseB3Date(d: string | undefined | null): string | null {
  if (!d) return null;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  return null;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeTipoCash(raw: string | undefined): ProventoTipo | null {
  const s = (raw ?? "").toUpperCase();
  if (
    s.includes("JCP") ||
    s.includes("JUROS") ||
    s.includes("JRS") ||
    s.includes("CAP PROPRIO") ||
    s.includes("CAPITAL PRÓPRIO")
  )
    return "JCP";
  if (s.includes("DIVIDENDO") || s.includes("RENDIMENTO")) return "Dividendo";
  if (!s) return "Dividendo";
  // Subscrição, restituição de capital etc. não são proventos em dinheiro.
  return null;
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

async function b3Get<T>(endpoint: string, payload: unknown): Promise<T | null> {
  const url = `${B3}/${endpoint}/${b64(JSON.stringify(payload))}`;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    let json: unknown = JSON.parse(text);
    // Alguns endpoints da B3 devolvem uma string JSON dentro do JSON.
    if (typeof json === "string") {
      try {
        json = JSON.parse(json);
      } catch {
        return null;
      }
    }
    return json as T;
  } catch {
    return null;
  }
}

/* ------------------------------ B3 shapes ------------------------------ */

interface SupplementCash {
  typeStock?: string;
  assetIssued?: string;
  paymentDate?: string;
  rate?: string | number;
  relatedTo?: string;
  approvedOn?: string;
  isinCode?: string;
  label?: string;
  lastDatePrior?: string;
  remarks?: string;
}

interface SupplementStock {
  typeStock?: string;
  assetIssued?: string;
  factor?: string | number;
  approvedOn?: string;
  isinCode?: string;
  label?: string;
  lastDatePrior?: string;
  remarks?: string;
}

interface SupplementEntry {
  tradingName?: string;
  code?: string;
  codeCVM?: string;
  cashDividends?: SupplementCash[];
  stockDividends?: SupplementStock[];
}

interface ListedCashRow {
  typeStock?: string;
  dateApproval?: string;
  valueCash?: string | number;
  ratio?: string;
  corporateAction?: string;
  lastDatePriorEx?: string;
  closingPricePriorExDate?: string;
}

interface ListedCashResponse {
  page?: { totalPages?: number; pageNumber?: number };
  results?: ListedCashRow[];
}

interface InitialCompaniesResponse {
  results?: Array<{ issuingCompany?: string; tradingName?: string }>;
}

/* ------------------------------- fetchers ------------------------------ */

const tradingNameCache = new Map<string, string | null>();

async function resolveTradingName(
  issuingCompany: string,
): Promise<string | null> {
  const cached = tradingNameCache.get(issuingCompany);
  if (cached !== undefined) return cached;
  const json = await b3Get<InitialCompaniesResponse>("GetInitialCompanies", {
    language: "pt-br",
    pageNumber: 1,
    pageSize: 20,
    company: issuingCompany,
  });
  const hit =
    json?.results?.find(
      (r) => (r.issuingCompany ?? "").toUpperCase() === issuingCompany,
    ) ?? json?.results?.[0];
  const name = hit?.tradingName?.trim() || null;
  tradingNameCache.set(issuingCompany, name);
  return name;
}

/** Supplement por ano: traz cashDividends (com data de pagamento) e stockDividends. */
async function fetchSupplementYears(
  issuingCompany: string,
  years: number[],
): Promise<{ cash: SupplementCash[]; stock: SupplementStock[] }> {
  const responses = await Promise.all(
    years.map((year) =>
      b3Get<SupplementEntry[] | SupplementEntry>("GetListedSupplementCompany", {
        issuingCompany,
        language: "pt-br",
        year,
      }),
    ),
  );
  const cash: SupplementCash[] = [];
  const stock: SupplementStock[] = [];
  for (const r of responses) {
    if (!r) continue;
    const entries = Array.isArray(r) ? r : [r];
    for (const e of entries) {
      if (e?.cashDividends?.length) cash.push(...e.cashDividends);
      if (e?.stockDividends?.length) stock.push(...e.stockDividends);
    }
  }
  return { cash, stock };
}

/** Histórico longo por tradingName (sem data de pagamento). */
async function fetchListedCash(tradingName: string): Promise<ListedCashRow[]> {
  const first = await b3Get<ListedCashResponse>("GetListedCashDividends", {
    language: "pt-br",
    pageNumber: 1,
    pageSize: 99,
    tradingName,
  });
  if (!first?.results?.length) return [];
  const rows = [...first.results];
  const totalPages = Math.min(first.page?.totalPages ?? 1, 4);
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        b3Get<ListedCashResponse>("GetListedCashDividends", {
          language: "pt-br",
          pageNumber: i + 2,
          pageSize: 99,
          tradingName,
        }),
      ),
    );
    for (const r of rest) if (r?.results?.length) rows.push(...r.results);
  }
  return rows;
}

/* ------------------------------- builder ------------------------------- */

interface CashEvent {
  valor: number;
  dataCom: string | null;
  dataPag: string | null;
  dataAprov: string | null;
  tipo: ProventoTipo;
}

export interface TickerProventosResult {
  historico: DividendYear[] | null;
  historicoCompleto: EventoSocietario[] | null;
  provisionados: ProventoProvisionado[] | null;
  fonte: "B3" | null;
  error: string | null;
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: TickerProventosResult }>();

export async function buildProventosForTicker(
  ticker: string,
): Promise<TickerProventosResult> {
  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.at < SIX_HOURS) return cached.value;
  const value = await buildUncached(ticker);
  // Só cacheia resultados úteis (evita "congelar" falhas transitórias).
  if (value.fonte === "B3") cache.set(ticker, { at: Date.now(), value });
  return value;
}

function empty(error: string): TickerProventosResult {
  return {
    historico: null,
    historicoCompleto: null,
    provisionados: null,
    fonte: null,
    error,
  };
}

async function buildUncached(ticker: string): Promise<TickerProventosResult> {
  const issuingCompany = ticker.replace(/\d+$/, "").slice(0, 4).toUpperCase();
  if (issuingCompany.length < 4) return empty("Ticker inválido");

  try {
    const anoAtual = new Date().getUTCFullYear();
    const years = [1, 0, -1, -2, -3, -4, -5].map((i) => anoAtual - i);

    const supplement = await fetchSupplementYears(issuingCompany, years);

    const tradingName = await resolveTradingName(issuingCompany);
    const listed = tradingName ? await fetchListedCash(tradingName) : [];

    if (
      supplement.cash.length === 0 &&
      supplement.stock.length === 0 &&
      listed.length === 0
    ) {
      return empty("Sem retorno da B3");
    }

    const today = new Date().toISOString().slice(0, 10);
    const eventosCash: CashEvent[] = [];
    const seen = new Set<string>();

    const push = (e: CashEvent) => {
      if (e.valor <= 0) return;
      const key = `${e.tipo}|${e.dataCom ?? ""}|${e.valor.toFixed(6)}`;
      if (seen.has(key)) return;
      seen.add(key);
      eventosCash.push(e);
    };

    for (const r of supplement.cash) {
      if (!classMatches(ticker, r.typeStock)) continue;
      const tipo = normalizeTipoCash(r.label);
      if (!tipo) continue;
      push({
        valor: parseNumber(r.rate),
        dataCom: parseB3Date(r.lastDatePrior),
        dataPag: parseB3Date(r.paymentDate),
        dataAprov: parseB3Date(r.approvedOn),
        tipo,
      });
    }

    for (const r of listed) {
      if (!classMatches(ticker, r.typeStock)) continue;
      const tipo = normalizeTipoCash(r.corporateAction);
      if (!tipo) continue;
      push({
        valor: parseNumber(r.valueCash),
        dataCom: parseB3Date(r.lastDatePriorEx),
        dataPag: null,
        dataAprov: parseB3Date(r.dateApproval),
        tipo,
      });
    }

    const historicoCompleto: EventoSocietario[] = eventosCash.map((e) => ({
      tipo: e.tipo,
      valor: Number(e.valor.toFixed(4)),
      ratio: null,
      dataCom: e.dataCom,
      dataEx: e.dataCom ? addDaysISO(e.dataCom, 1) : null,
      dataPagamento: e.dataPag,
      dataAprovacao: e.dataAprov,
    }));

    const seenStock = new Set<string>();
    for (const r of supplement.stock) {
      if (!classMatches(ticker, r.typeStock)) continue;
      const tipo = normalizeTipoStock(r.label);
      if (!tipo) continue;
      const dataCom = parseB3Date(r.lastDatePrior);
      const key = `${tipo}|${dataCom ?? ""}|${r.factor ?? ""}`;
      if (seenStock.has(key)) continue;
      seenStock.add(key);
      historicoCompleto.push({
        tipo,
        valor: 0,
        ratio: r.factor != null ? String(r.factor) : null,
        dataCom,
        dataEx: dataCom ? addDaysISO(dataCom, 1) : null,
        dataPagamento: null,
        dataAprovacao: parseB3Date(r.approvedOn),
      });
    }

    historicoCompleto.sort((a, b) =>
      (b.dataCom ?? "").localeCompare(a.dataCom ?? ""),
    );

    const provisionados: ProventoProvisionado[] = [];
    for (const e of eventosCash) {
      const isFuture =
        (e.dataPag && e.dataPag > today) ||
        (!e.dataPag && e.dataCom && e.dataCom > today);
      if (!isFuture) continue;
      const dataCom = e.dataCom ?? e.dataAprov ?? today;
      const dataEx = addDaysISO(dataCom, 1);
      provisionados.push({
        tipo: e.tipo,
        valorPorAcao: Number(e.valor.toFixed(4)),
        dataCom,
        dataEx,
        dataPagamento: e.dataPag ?? dataEx,
      });
    }
    provisionados.sort((a, b) => a.dataCom.localeCompare(b.dataCom));

    // Janela de 10 anos fechados + o ano corrente (parcial).
    const anos = Array.from({ length: 11 }, (_, i) => anoAtual - 10 + i);

    const historico: DividendYear[] = anos.map((y) => {
      let dividendo = 0;
      let jcp = 0;
      for (const e of eventosCash) {
        const ref = e.dataPag ?? e.dataCom ?? e.dataAprov;
        if (!ref?.startsWith(String(y))) continue;
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
    return empty("Falha ao consultar B3");
  }
}

export async function mapLimit<T, R>(
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
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}
