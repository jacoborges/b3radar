import { FUNDAMENTAL_KEYS, INDICATORS, type IndicatorKey } from "./indicators";

export const DEFAULT_STOCK_COLUMNS: IndicatorKey[] = ["preco", "variacaoDia", "valorMercado", "liquidezDiaria", "pl", "pvp", "dy"];

export function normalizeStockColumns(value: unknown): IndicatorKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_STOCK_COLUMNS];
  return [...new Set(value.filter((key): key is IndicatorKey => FUNDAMENTAL_KEYS.some((allowed) => allowed === key)))];
}

export function stockColumnLabel(key: IndicatorKey): string {
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