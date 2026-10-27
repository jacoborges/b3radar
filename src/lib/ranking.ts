import { parseFatorEvento } from "./sim-portfolio";
import type { EventoSocietario } from "./dividend-intelligence";

export const RANKING_PERIODS = [
  { value: "1y", label: "1 ano", months: 12 },
  { value: "6m", label: "6 meses", months: 6 },
  { value: "1m", label: "1 mês", months: 1 },
] as const;
export type RankingPeriod = (typeof RANKING_PERIODS)[number]["value"];
export const RANKING_SHARES = 100;

/** Data inicial do prazo (ISO), contada a partir de hoje. */
export function periodStart(today: string, period: RankingPeriod): string {
  const months = RANKING_PERIODS.find((p) => p.value === period)!.months;
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

/** Último fechamento até a data (inclusive). */
export function closeOnOrBefore(
  series: Array<{ date: string; close: number }>,
  date: string,
): { date: string; close: number } | null {
  let found: { date: string; close: number } | null = null;
  for (const p of series) {
    if (p.date <= date) found = p;
    else break;
  }
  return found;
}

export interface RankingRow {
  ticker: string;
  dataInicial: string | null;
  precoInicial: number | null;
  precoAtual: number | null;
  quantidadeFinal: number;
  valorizacao: number | null;
  proventos: number;
  retorno: number | null;
  retornoPct: number | null;
}

/**
 * Simula 100 ações compradas no fechamento inicial: aplica eventos societários
 * e soma proventos cuja Data Com cai dentro de (dataInicial, hoje].
 */
export function computeRankingRow(
  ticker: string,
  start: { date: string; close: number } | null,
  precoAtual: number | null,
  eventos: EventoSocietario[],
  today: string,
): RankingRow {
  if (!start || !precoAtual || !(start.close > 0)) {
    return {
      ticker, dataInicial: start?.date ?? null, precoInicial: start?.close ?? null,
      precoAtual, quantidadeFinal: RANKING_SHARES, valorizacao: null,
      proventos: 0, retorno: null, retornoPct: null,
    };
  }
  let qtd = RANKING_SHARES;
  let proventos = 0;
  const janela = eventos
    .filter((e) => e.dataCom && e.dataCom > start.date && e.dataCom <= today)
    .sort((a, b) => (a.dataCom! < b.dataCom! ? -1 : 1));
  for (const e of janela) {
    if (e.tipo === "Dividendo" || e.tipo === "JCP") {
      if (e.valor > 0) proventos += e.valor * qtd;
    } else {
      const { fator, ok } = parseFatorEvento(e.tipo, e.ratio);
      if (ok) qtd = qtd * fator;
    }
  }
  qtd = Math.floor(qtd + 1e-9);
  const custo = start.close * RANKING_SHARES;
  const valorizacao = precoAtual * qtd - custo;
  const retorno = valorizacao + proventos;
  return {
    ticker, dataInicial: start.date, precoInicial: start.close, precoAtual,
    quantidadeFinal: qtd,
    valorizacao: round2(valorizacao), proventos: round2(proventos),
    retorno: round2(retorno), retornoPct: round2((retorno / custo) * 100),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Melhor retorno primeiro; sem dados no fim. */
export function sortRanking(rows: RankingRow[]): RankingRow[] {
  return [...rows].sort((a, b) => {
    if (a.retornoPct == null || b.retornoPct == null)
      return Number(a.retornoPct == null) - Number(b.retornoPct == null) || a.ticker.localeCompare(b.ticker);
    return b.retornoPct - a.retornoPct || a.ticker.localeCompare(b.ticker);
  });
}
