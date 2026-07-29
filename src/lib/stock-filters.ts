import { FUNDAMENTAL_KEYS, debtLevel } from "@/lib/indicators";
import type { Stock } from "@/lib/stocks-data";

export interface FilterRange {
  min: number | null;
  max: number | null;
}

export type DebtColor = "success" | "warning" | "danger";
export type RecOpt = "ALL" | "YES" | "NO";

export const initialFilters: Record<string, FilterRange> = Object.fromEntries(
  FUNDAMENTAL_KEYS.map((k) => [k, { min: null, max: null }]),
);

/** [min, max, step] de cada slider */
export const FILTER_BOUNDS: Record<string, [number, number, number]> = {
  preco: [0, 500, 1],
  valorMercado: [0, 800, 5],
  liquidezDiaria: [0, 500, 5],
  pl: [0, 60, 0.5],
  pvp: [0, 10, 0.1],
  dy: [0, 20, 0.1],
  roe: [-10, 40, 0.5],
  roic: [-10, 40, 0.5],
  margemLiquida: [-10, 50, 0.5],
  margemEbit: [-10, 70, 0.5],
  divBrutaPatrimonio: [0, 3, 0.05],
  liquidezCorrente: [0, 5, 0.05],
  cagrLucros5a: [-30, 50, 0.5],
  freeFloat: [0, 100, 1],
  variacaoDia: [-30, 30, 0.5],
  varD7: [-30, 30, 0.5],
  varD30: [-30, 30, 0.5],
};

export interface QualitativeFilters {
  debtColors: DebtColor[];
  recFilter: RecOpt;
  minAnosAcimaSelic: number;
  minAnosPrecoAcimaSelic: number;
}

export function activeRanges(filters: Record<string, FilterRange>) {
  return Object.entries(filters).filter(
    ([, r]) => r.min !== null || r.max !== null,
  );
}

/** Aplica os filtros fundamentalistas + qualitativos a um ativo. */
export function matchesStockFilters(
  s: Stock,
  ranges: Array<[string, FilterRange]>,
  q: QualitativeFilters,
): boolean {
  for (const [k, r] of ranges) {
    const val = s[k as keyof Stock] as number;
    if (r.min !== null && val < r.min) return false;
    if (r.max !== null && val > r.max) return false;
  }
  if (
    q.debtColors.length > 0 &&
    !q.debtColors.includes(debtLevel(s.divBrutaPatrimonio).color as DebtColor)
  )
    return false;
  if (q.recFilter === "YES" && !s.dividendosRecorrentes) return false;
  if (q.recFilter === "NO" && s.dividendosRecorrentes) return false;
  if (s.anosYieldAcimaSelic < q.minAnosAcimaSelic) return false;
  if (s.anosPrecoAcimaSelic < q.minAnosPrecoAcimaSelic) return false;
  return true;
}
