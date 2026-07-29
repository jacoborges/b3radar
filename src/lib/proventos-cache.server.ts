/**
 * Camada de persistência dos proventos (Lovable Cloud).
 * Guarda o resultado da coleta na B3 para que a página abra instantaneamente
 * com TODOS os ativos, sem depender da B3 no momento do acesso.
 */
import { createClient } from "@supabase/supabase-js";
import type { EventoSocietario } from "./dividend-intelligence";
import type { ProventoProvisionado } from "./stocks-data";
import {
  buildProventosForTicker,
  mapLimit,
  type TickerProventosResult,
} from "./proventos.server";

const TABLE = "dividend_cache";

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

function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (isNewKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseFetch(key) },
  });
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

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
  const supabase = publicClient();
  const out: CachedProventoRow[] = [];
  const pageSize = 1000;
  for (let page = 0; page < 5; page++) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("ticker, eventos_cash, fonte, error, fetched_at")
      .order("ticker")
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data as Array<Record<string, unknown>>) {
      out.push({
        ticker: String(r.ticker),
        eventosCash: (r.eventos_cash as CompactCash[]) ?? [],
        fonte: (r.fonte as "B3" | null) ?? null,
        error: (r.error as string | null) ?? null,
        fetchedAt: String(r.fetched_at),
      });
    }
    if (data.length < pageSize) break;
  }
  return out;
}

/** Resultado completo de um ticker, se presente no cache e ainda válido. */
export async function readCachedTicker(
  ticker: string,
  maxAgeMs: number,
): Promise<TickerProventosResult | null> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("historico, historico_completo, provisionados, fonte, error, fetched_at")
    .eq("ticker", ticker)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  if (row.fonte !== "B3") return null;
  const age = Date.now() - new Date(String(row.fetched_at)).getTime();
  if (age > maxAgeMs) return null;
  return {
    historico: (row.historico as TickerProventosResult["historico"]) ?? null,
    historicoCompleto:
      (row.historico_completo as EventoSocietario[] | null) ?? null,
    provisionados: (row.provisionados as ProventoProvisionado[] | null) ?? null,
    fonte: "B3",
    error: null,
  };
}

async function writeTicker(ticker: string, value: TickerProventosResult) {
  const supabase = await adminClient();
  const { error } = await supabase.from(TABLE).upsert(
    {
      ticker,
      eventos_cash: toCompact(value.historicoCompleto),
      historico_completo: value.historicoCompleto ?? [],
      provisionados: value.provisionados ?? [],
      historico: value.historico ?? [],
      fonte: value.fonte,
      error: value.error,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "ticker" },
  );
  if (error) console.error("[dividend_cache] upsert falhou", ticker, error.message);
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
