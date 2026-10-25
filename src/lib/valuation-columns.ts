/** Colunas de valuation para o cabeçalho (derivadas; não alteram cálculos). */
import { grahamFromMultiples } from "./graham";
import { calcPrecoTetoFromEventos, calcPrecoTetoFromYears } from "./preco-teto";
import type { EventoSocietario } from "./dividend-intelligence";
import { margemDdmRapida } from "./valuation-ddm";
import type { DividendYear } from "./stocks-data";

export type ValuationColumn = "graham" | "grahamMargem" | "bazin" | "bazinMargem" | "ddmMargem";
export const VALUATION_COLUMNS: { key: ValuationColumn; label: string; tip: string }[] = [
  { key: "graham", label: "Graham", tip: "Preço justo de Graham = √(22,5 × LPA × VPA)." },
  { key: "grahamMargem", label: "Margem Graham", tip: "Diferença entre o preço justo de Graham e a cotação atual." },
  { key: "bazin", label: "Teto Bazin", tip: "Média dos proventos dos 5 anos fechados ÷ divisor configurado." },
  { key: "bazinMargem", label: "Margem Bazin", tip: "Diferença entre o preço teto Bazin e a cotação atual." },
  { key: "ddmMargem", label: "Margem DDM", tip: "Estimativa rápida do Modelo de Gordon (somente bancos e seguradoras)." },
];

export type ValuationStock = { preco?: number; pl?: number; pvp?: number; dy?: number; roe?: number; setor?: string; dividendos?: DividendYear[] };

export function valuationValue(s: ValuationStock, key: ValuationColumn, divisor: number, eventosB3?: EventoSocietario[] | null): number | null {
  const preco = s.preco;
  if (key === "graham" || key === "grahamMargem") {
    const g = grahamFromMultiples(s);
    return key === "graham" ? g.precoJusto : g.margem;
  }
  if (key === "bazin" || key === "bazinMargem") {
    // média ponderada dos 5 anos fechados de proventos B3 (mesma base do painel Preço Teto)
    const { teto } = eventosB3 ? calcPrecoTetoFromEventos(eventosB3, divisor) : calcPrecoTetoFromYears(s.dividendos, divisor);
    if (key === "bazin") return teto;
    return teto && preco && preco > 0 ? ((teto - preco) / preco) * 100 : null;
  }
  if (preco == null || s.dy == null || s.pl == null || s.roe == null || !s.setor) return null;
  return margemDdmRapida({ preco, dy: s.dy, pl: s.pl, roe: s.roe, setor: s.setor });
}

export function formatValuation(key: ValuationColumn, v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (key === "graham" || key === "bazin") return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${v >= 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** cor: verde quando valor justo/teto acima do preço */
export function valuationTone(key: ValuationColumn, v: number | null, preco?: number): "up" | "down" | null {
  if (v == null) return null;
  if (key === "graham" || key === "bazin") return preco ? (v >= preco ? "up" : "down") : null;
  return v >= 0 ? "up" : "down";
}
