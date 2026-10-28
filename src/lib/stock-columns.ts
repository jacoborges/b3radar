import { FUNDAMENTAL_KEYS, INDICATORS, type IndicatorKey } from "./indicators";

/** Coluna derivada do cabeçalho: preço justo com P/VP = 1 (cotação ÷ P/VP). */
export const PVP_FAIR_KEY = "pvpFair" as const;
export type StockColumnKey = IndicatorKey | typeof PVP_FAIR_KEY;

const ALLOWED_KEYS: readonly string[] = [...FUNDAMENTAL_KEYS, PVP_FAIR_KEY];

/** Opções do seletor de cabeçalho: os fundamentais, com "Justo P/VP=1" logo depois de P/VP. */
const PVP_AT = FUNDAMENTAL_KEYS.indexOf("pvp");
export const STOCK_COLUMN_KEYS: StockColumnKey[] = [
  ...FUNDAMENTAL_KEYS.slice(0, PVP_AT + 1),
  PVP_FAIR_KEY,
  ...FUNDAMENTAL_KEYS.slice(PVP_AT + 1),
];

/**
 * Cabeçalho padrão: preço, dia, bloco de valuation (Graham, Teto Bazin, DDM),
 * justo P/VP=1, DY, P/VP, variações de 7/30 dias e free float.
 * "Justo P/VP=1" vem logo após o bloco de valuation (onde está o Preço Teto de Bazin).
 */
export const DEFAULT_STOCK_COLUMNS: StockColumnKey[] = [
  "preco",
  "variacaoDia",
  PVP_FAIR_KEY,
  "dy",
  "pvp",
  "varD7",
  "varD30",
  "freeFloat",
];

export function normalizeStockColumns(value: unknown): StockColumnKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_STOCK_COLUMNS];
  return [
    ...new Set(
      value.filter((key): key is StockColumnKey => typeof key === "string" && ALLOWED_KEYS.includes(key)),
    ),
  ];
}

/**
 * Migração única: preferências salvas antes desta coluna não a contêm.
 * Inserimos "Justo P/VP=1" na mesma posição do cabeçalho padrão (após o bloco de valuation).
 */
export function withPvpFairColumn(columns: StockColumnKey[]): StockColumnKey[] {
  if (columns.includes(PVP_FAIR_KEY)) return columns;
  const next = [...columns];
  const at = next.indexOf("variacaoDia");
  next.splice(at >= 0 ? at + 1 : next.length, 0, PVP_FAIR_KEY);
  return next;
}

export function stockColumnLabel(key: StockColumnKey): string {
  if (key === PVP_FAIR_KEY) return "Justo P/VP=1";
  if (key === "variacaoDia") return "Dia";
  if (key === "valorMercado") return "Valor de mercado";
  if (key === "liquidezDiaria") return "Liquidez diária";
  return INDICATORS[key].label;
}

export function stockColumnValue(stock: Partial<Record<IndicatorKey, number>>, key: IndicatorKey): string {
  const value = stock[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (key === "valorMercado") return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  if (key === "liquidezDiaria") return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  return INDICATORS[key].format(value);
}
