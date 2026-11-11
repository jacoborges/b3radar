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
