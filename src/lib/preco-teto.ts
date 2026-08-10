/**
 * Preço teto (método Bazin) — módulo puro.
 * teto = (soma de dividendos + JCP dos 5 anos fechados / 5) / divisor
 */
import type { EventoSocietario } from "@/lib/dividend-intelligence";
import type { DividendYear } from "@/lib/stocks-data";

export interface PrecoTetoCalc {
  /** preço teto em R$, ou null quando não há dado suficiente */
  teto: number | null;
  /** anos (dos 5 fechados) com dado disponível */
  anosComDados: number;
  /** média anual (soma ÷ 5) */
  media: number | null;
}

/** Anos fechados usados no cálculo: ano−5 .. ano−1 */
export function anosFechados(ref = new Date().getFullYear()): number[] {
  return Array.from({ length: 5 }, (_, i) => ref - 5 + i);
}

export function calcPrecoTetoFromYears(
  historico: DividendYear[] | null | undefined,
  divisor: number,
): PrecoTetoCalc {
  const anos = anosFechados();
  let soma = 0;
  let anosComDados = 0;
  for (const year of anos) {
    const y = historico?.find((h) => h.year === year);
    if (!y) continue;
    anosComDados += 1;
    soma += y.dividendo + y.jcp;
  }
  if (anosComDados === 0 || divisor <= 0) return { teto: null, anosComDados, media: null };
  const media = soma / 5;
  return { teto: media > 0 ? media / divisor : null, anosComDados, media };
}

/** Agrega eventos em dinheiro (Dividendo/JCP) por ano de pagamento/COM. */
export function eventosToYears(eventos: EventoSocietario[] | null | undefined): DividendYear[] {
  const map = new Map<number, { dividendo: number; jcp: number }>();
  for (const e of eventos ?? []) {
    if (e.tipo !== "Dividendo" && e.tipo !== "JCP") continue;
    const iso = e.dataPagamento ?? e.dataCom ?? e.dataEx ?? e.dataAprovacao;
    if (!iso) continue;
    const year = Number.parseInt(iso.slice(0, 4), 10);
    if (!Number.isFinite(year)) continue;
    const cur = map.get(year) ?? { dividendo: 0, jcp: 0 };
    if (e.tipo === "Dividendo") cur.dividendo += e.valor;
    else cur.jcp += e.valor;
    map.set(year, cur);
  }
  return [...map.entries()].map(([year, v]) => ({
    year,
    dividendo: v.dividendo,
    jcp: v.jcp,
    selicMediaPonderada: 0,
    precoMedio: 0,
  }));
}

export function calcPrecoTetoFromEventos(
  eventos: EventoSocietario[] | null | undefined,
  divisor: number,
): PrecoTetoCalc {
  return calcPrecoTetoFromYears(eventosToYears(eventos), divisor);
}

/** Desconto (%) do preço atual em relação ao teto. Positivo = descontada. */
export function descontoTetoPct(teto: number | null, preco: number | undefined): number | null {
  if (teto === null || !preco || preco <= 0) return null;
  return ((teto - preco) / preco) * 100;
}
