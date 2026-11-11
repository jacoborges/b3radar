import type { LiveQuote } from "@/lib/quotes.functions";

export interface AltFundamentals {
  pl: number | null; pvp: number | null; dy: number | null; roe: number | null; roic: number | null;
  margemLiquida: number | null; margemEbit: number | null; divBrutaPatrimonio: number | null;
  liquidezCorrente: number | null; valorMercado: number | null; evEbitda: number | null;
}

function n(v: unknown): number | null {
  const x = typeof v === "string" ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}
function pick(o: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) { const v = n(o[k]); if (v != null) return v; }
  return null;
}
/** Bolsai devolve margens/ROE às vezes em fração (0.15); padroniza para %. */
function pctOf(v: number | null): number | null {
  if (v == null) return null;
  return Math.abs(v) <= 2 ? v * 100 : v;
}

export async function hgQuote(ticker: string, key: string): Promise<{ quote: LiveQuote | null; status: number }> {
  try {
    const url = `https://api.hgbrasil.com/finance/stock_price?key=${encodeURIComponent(key)}&symbol=${encodeURIComponent(ticker)}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return { quote: null, status: res.status };
    const json = (await res.json()) as { valid_key?: boolean; results?: Record<string, Record<string, unknown>> };
    if (json.valid_key === false) return { quote: null, status: 401 };
    const r = json.results?.[ticker.toUpperCase()];
    const price = r ? n(r.price) : null;
    if (!r || price == null || r.error) return { quote: null, status: 404 };
    const change = n(r.change_percent) ?? 0;
    return {
      status: 200,
      quote: {
        ticker: ticker.toUpperCase(), price, changePercent: change,
        previousClose: change !== -100 ? price / (1 + change / 100) : null,
        updatedAt: new Date().toISOString(), source: "hgbrasil",
      },
    };
  } catch { return { quote: null, status: 0 }; }
}

/** Último saldo de consultas informado pela Bolsai (header X-RateLimit-Remaining). */
export let bolsaiRemaining: number | null = null;

async function bolsaiRaw(path: string, key: string): Promise<{ body: unknown; status: number }> {
  try {
    const res = await fetch(`https://api.usebolsai.com/api/v1${path}`, { headers: { "X-API-Key": key, accept: "application/json" } });
    const rem = Number(res.headers.get("x-ratelimit-remaining"));
    if (res.headers.has("x-ratelimit-remaining") && Number.isFinite(rem)) bolsaiRemaining = rem;
    if (!res.ok) return { body: null, status: res.status };
    return { body: await res.json(), status: 200 };
  } catch { return { body: null, status: 0 }; }
}

async function bolsaiGet(path: string, key: string): Promise<{ json: Record<string, unknown> | null; status: number }> {
  const { body, status } = await bolsaiRaw(path, key);
  if (!body || typeof body !== "object") return { json: null, status };
  const j = body as Record<string, unknown>;
  const inner = (j && typeof j.data === "object" && j.data && !Array.isArray(j.data) ? j.data : j) as Record<string, unknown>;
  return { json: inner, status };
}

function str(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
}

/** Histórico de proventos da Bolsai (até 20 anos), normalizado. */
export async function bolsaiDividends(
  ticker: string, key: string, years = 6,
): Promise<{ events: Array<{ tipo: "Dividendo" | "JCP"; valor: number; data: string | null }> | null; status: number }> {
  const { body, status } = await bolsaiRaw(`/dividends/${encodeURIComponent(ticker)}?years=${years}`, key);
  if (!body) return { events: null, status };
  const o = body as Record<string, unknown>;
  const list = (Array.isArray(body) ? body
    : Array.isArray(o.dividends) ? o.dividends
    : Array.isArray(o.data) ? o.data
    : Array.isArray(o.history) ? o.history
    : Array.isArray(o.items) ? o.items : []) as Array<Record<string, unknown>>;
  const events = list.map((r) => {
    const t = String(r.type ?? r.tipo ?? r.label ?? "").toLowerCase();
    const tipo: "Dividendo" | "JCP" = t.includes("jcp") || t.includes("juros") || t.includes("interest") ? "JCP" : "Dividendo";
    const valor = pick(r, "value", "valor", "amount", "rate", "cash_amount") ?? 0;
    const data = str(r.payment_date) ?? str(r.data_pagamento) ?? str(r.ex_date) ?? str(r.data_ex) ?? str(r.com_date) ?? str(r.date);
    return { tipo, valor, data };
  });
  return { events, status };
}

/** Selic meta (% a.a.) pela HG Brasil — reserva quando o Banco Central não responde. */
export async function hgSelic(key: string): Promise<{ date: string; value: number } | null> {
  try {
    const res = await fetch(`https://api.hgbrasil.com/finance/taxes?key=${encodeURIComponent(key)}`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const j = (await res.json()) as { results?: Array<Record<string, unknown>> | Record<string, unknown> };
    const first = Array.isArray(j.results) ? j.results[0] : j.results;
    if (!first) return null;
    const value = n(first.selic);
    const date = str(first.date) ?? new Date().toISOString().slice(0, 10);
    return value != null && value > 0 && value < 100 ? { date, value } : null;
  } catch { return null; }
}

export async function bolsaiQuote(ticker: string, key: string): Promise<{ quote: LiveQuote | null; status: number }> {
  const { json, status } = await bolsaiGet(`/stocks/${encodeURIComponent(ticker)}/quote`, key);
  if (!json) return { quote: null, status };
  const price = pick(json, "close", "price");
  if (price == null) return { quote: null, status: 404 };
  const open = pick(json, "previous_close", "open");
  return {
    status: 200,
    quote: {
      ticker: ticker.toUpperCase(), price,
      changePercent: open ? ((price - open) / open) * 100 : 0,
      previousClose: open, updatedAt: new Date().toISOString(), source: "bolsai",
    },
  };
}

export async function bolsaiFundamentals(ticker: string, key: string): Promise<{ f: AltFundamentals | null; status: number }> {
  const { json, status } = await bolsaiGet(`/fundamentals/${encodeURIComponent(ticker)}`, key);
  if (!json) return { f: null, status };
  const o = (typeof json.indicators === "object" && json.indicators ? json.indicators : json) as Record<string, unknown>;
  return {
    status: 200,
    f: {
      pl: pick(o, "pl", "p_l", "pe", "price_earnings"),
      pvp: pick(o, "pvp", "p_vp", "pb", "price_to_book"),
      dy: pctOf(pick(o, "dy", "dividend_yield")),
      roe: pctOf(pick(o, "roe")),
      roic: pctOf(pick(o, "roic")),
      margemLiquida: pctOf(pick(o, "net_margin", "margem_liquida")),
      margemEbit: pctOf(pick(o, "ebit_margin", "margem_ebit", "operating_margin")),
      divBrutaPatrimonio: pick(o, "gross_debt_equity", "debt_to_equity", "div_bruta_patrimonio"),
      liquidezCorrente: pick(o, "current_ratio", "liquidez_corrente"),
      valorMercado: pick(o, "market_cap", "valor_mercado"),
      evEbitda: pick(o, "ev_ebitda", "ev_to_ebitda"),
    },
  };
}
