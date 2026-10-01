/**
 * Camada de persistência dos proventos no Google Drive.
 * Guarda o resultado da coleta na B3 para que a página abra instantaneamente
 * com TODOS os ativos, sem depender da B3 no momento do acesso.
 */
import type { EventoSocietario } from "./dividend-intelligence";
import type { ProventoProvisionado } from "./stocks-data";
import {
  buildProventosForTicker,
  mapLimit,
  type TickerProventosResult,
} from "./proventos.server";

const DOCUMENT = "dividend-cache.json";

/** Evento em dinheiro compacto: t = tipo (D/J), v = valor, c = data com. */
export interface CompactCash {
  t: "D" | "J";
  v: number;
  c: string | null;
}

export interface CachedProventoRow {
  ticker: string;
  eventosCash: CompactCash[];
  fonte: "B3" | null;
  error: string | null;
  fetchedAt: string;
}

interface StoredTicker extends CachedProventoRow {
  historico: TickerProventosResult["historico"];
  historicoCompleto: EventoSocietario[] | null;
  provisionados: ProventoProvisionado[] | null;
}

type StoredDividendCache = Record<string, StoredTicker>;

export function toCompact(eventos: EventoSocietario[] | null): CompactCash[] {
  if (!eventos) return [];
  const out: CompactCash[] = [];
  for (const e of eventos) {
    if (e.tipo !== "Dividendo" && e.tipo !== "JCP") continue;
    if (!(e.valor > 0)) continue;
    out.push({ t: e.tipo === "JCP" ? "J" : "D", v: e.valor, c: e.dataCom });
  }
  return out;
}

export function fromCompact(rows: CompactCash[]): EventoSocietario[] {
  return rows.map((r) => ({
    tipo: r.t === "J" ? "JCP" : "Dividendo",
    valor: r.v,
    ratio: null,
    dataCom: r.c ?? null,
    dataEx: null,
    dataPagamento: null,
    dataAprovacao: null,
  }));
}

/** Lista compacta de todos os ativos já coletados. */
export async function listCachedProventos(): Promise<CachedProventoRow[]> {
  const { readSystemDocument } = await import("./drive-storage.server");
  const stored = await readSystemDocument<StoredDividendCache>(DOCUMENT, {});
  return Object.values(stored).map(({ ticker, eventosCash, fonte, error, fetchedAt }) => ({ ticker, eventosCash, fonte, error, fetchedAt })).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/** Resultado completo de um ticker, se presente no cache e ainda válido. */
export async function readCachedTicker(
  ticker: string,
  maxAgeMs: number,
): Promise<TickerProventosResult | null> {
  const { readSystemDocument } = await import("./drive-storage.server");
  const stored = await readSystemDocument<StoredDividendCache>(DOCUMENT, {});
  const row = stored[ticker.toUpperCase()];
  if (!row || row.fonte !== "B3") return null;
  const age = Date.now() - new Date(row.fetchedAt).getTime();
  if (age > maxAgeMs) return null;
  return {
    historico: row.historico ?? null,
    historicoCompleto: row.historicoCompleto ?? null,
    provisionados: row.provisionados ?? null,
    fonte: "B3",
    error: null,
  };
}

async function writeTicker(ticker: string, value: TickerProventosResult) {
  const { updateSystemDocument } = await import("./drive-storage.server");
  const key = ticker.toUpperCase();
  await updateSystemDocument<StoredDividendCache>(DOCUMENT, {}, (stored) => ({
    ...stored,
    [key]: {
      ticker: key,
      eventosCash: toCompact(value.historicoCompleto),
      historicoCompleto: value.historicoCompleto,
      provisionados: value.provisionados,
      historico: value.historico,
      fonte: value.fonte,
      error: value.error,
      fetchedAt: new Date().toISOString(),
    },
  }));
}

export interface RefreshResult {
  processed: number;
  comDados: number;
}

/** Coleta na B3 e grava no banco. Concorrência limitada para não estourar a B3. */
export async function refreshTickers(
  tickers: string[],
  concurrency = 6,
): Promise<RefreshResult> {
  let comDados = 0;
  await mapLimit(tickers, concurrency, async (ticker) => {
    const value = await buildProventosForTicker(ticker);
    if (value.fonte === "B3") comDados++;
    await writeTicker(ticker, value);
  });
  return { processed: tickers.length, comDados };
}

export async function refreshOneTicker(
  ticker: string,
): Promise<TickerProventosResult> {
  const value = await buildProventosForTicker(ticker);
  await writeTicker(ticker, value);
  return value;
}

/** Tickers mais desatualizados (ou nunca coletados) dentre a lista informada. */
export async function pickStaleTickers(
  universe: string[],
  limit: number,
  maxAgeMs: number,
): Promise<string[]> {
  const cached = await listCachedProventos();
  const byTicker = new Map(cached.map((r) => [r.ticker, r]));
  const now = Date.now();
  const never: string[] = [];
  const stale: Array<{ ticker: string; at: number }> = [];
  for (const t of universe) {
    const row = byTicker.get(t);
    if (!row) {
      never.push(t);
      continue;
    }
    const at = new Date(row.fetchedAt).getTime();
    if (now - at > maxAgeMs) stale.push({ ticker: t, at });
  }
  stale.sort((a, b) => a.at - b.at);
  return [...never, ...stale.map((s) => s.ticker)].slice(0, limit);
}
