export type DataMode = "brapi" | "hybrid" | "alt_first";
export type ProviderId = "brapi" | "bolsai" | "hgbrasil" | "partnr";

export const DATA_MODES: DataMode[] = ["brapi", "hybrid", "alt_first"];

export function isDataMode(v: unknown): v is DataMode {
  return typeof v === "string" && (DATA_MODES as string[]).includes(v);
}

/** Ordem das fontes alternativas de preço (BRAPI é tratada à parte). */
export function altQuoteOrder(available: Partial<Record<ProviderId, boolean>>): ProviderId[] {
  return (["hgbrasil", "bolsai"] as ProviderId[]).filter((p) => available[p]);
}

/**
 * Decide quais tickers vão para as fontes alternativas.
 * - brapi: nenhum
 * - hybrid: só os que a BRAPI não devolveu
 * - alt_first: todos (BRAPI completa depois o que faltar)
 */
export function tickersForAlt(mode: DataMode, requested: string[], gotFromBrapi: Set<string>): string[] {
  if (mode === "brapi") return [];
  if (mode === "alt_first") return [...requested];
  return requested.filter((t) => !gotFromBrapi.has(t.toUpperCase()));
}

/** Preenche campos nulos/ausentes da primeira fonte com as seguintes, na ordem dada. */
export function fillMissing<T extends Record<string, unknown>>(...sources: Array<Partial<T> | null | undefined>): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const src of sources) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      if ((out[k] === undefined || out[k] === null) && v !== undefined && v !== null) out[k] = v;
    }
  }
  return out as Partial<T>;
}

/** Erros que justificam pular para a próxima fonte. */
export function shouldFallback(status: number): boolean {
  return status === 0 || status === 401 || status === 403 || status === 404 || status === 429 || status >= 500;
}

export function maskKey(key: string | null | undefined): string {
  const k = (key ?? "").trim();
  if (!k) return "";
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 3)}…${k.slice(-3)}`;
}

export interface AltDividendYear { year: number; dividendo: number; jcp: number }

/** Soma pagamentos de uma fonte alternativa por ano, deduplicando (tipo+data+valor). */
export function aggregateDividendEvents(
  events: Array<{ tipo: "Dividendo" | "JCP"; valor: number; data: string | null }>,
): AltDividendYear[] {
  const seen = new Set<string>();
  const byYear = new Map<number, AltDividendYear>();
  for (const e of events) {
    if (!e.data || !(e.valor > 0)) continue;
    const key = `${e.tipo}|${e.data}|${e.valor.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const year = Number(e.data.slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const row = byYear.get(year) ?? { year, dividendo: 0, jcp: 0 };
    if (e.tipo === "JCP") row.jcp += e.valor; else row.dividendo += e.valor;
    byYear.set(year, row);
  }
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

/**
 * Completa anos sem proventos da fonte oficial (B3) com dados alternativos.
 * Anos que a B3 já tem (com valor > 0) nunca são alterados — evita pagamento duplicado.
 */
export function fillMissingDividendYears<T extends { year: number; dividendo: number; jcp: number }>(
  official: T[] | null | undefined,
  alt: AltDividendYear[],
  makeRow: (a: AltDividendYear) => T,
  years?: number[],
): { rows: T[]; filledYears: number[] } {
  const base = [...(official ?? [])];
  const filledYears: number[] = [];
  const wanted = years ? new Set(years) : null;
  for (const a of alt) {
    if (wanted && !wanted.has(a.year)) continue;
    if (a.dividendo + a.jcp <= 0) continue;
    const i = base.findIndex((r) => r.year === a.year);
    if (i >= 0 && base[i]!.dividendo + base[i]!.jcp > 0) continue;
    const row = makeRow(a);
    if (i >= 0) base[i] = { ...base[i]!, dividendo: row.dividendo, jcp: row.jcp };
    else base.push(row);
    filledYears.push(a.year);
  }
  base.sort((x, y) => x.year - y.year);
  return { rows: base, filledYears };
}
