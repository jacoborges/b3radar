/**
 * Preço Teto Projetivo (Bazin sobre projeção):
 *   LPA projetivo = lucro líquido projetado / nº total de ações
 *   DPA projetivo = LPA projetivo × payout
 *   Preço teto    = DPA projetivo / divisor Bazin
 */
import type { DividendYear } from "@/lib/stocks-data";
import { anosFechados } from "@/lib/preco-teto";

export interface ProjetivoCalc {
  lpa: number | null;
  dpa: number | null;
  teto: number | null;
}

export function calcLpa(lucro: number | null, acoes: number | null): number | null {
  if (lucro === null || acoes === null || !Number.isFinite(lucro) || !acoes || acoes <= 0) {
    return null;
  }
  return lucro / acoes;
}

export function calcProjetivo(
  lucro: number | null,
  acoes: number | null,
  payout: number | null,
  divisor: number,
): ProjetivoCalc {
  const lpa = calcLpa(lucro, acoes);
  if (lpa === null || payout === null || payout <= 0) return { lpa, dpa: null, teto: null };
  const dpa = lpa * payout;
  if (dpa <= 0 || divisor <= 0) return { lpa, dpa, teto: null };
  return { lpa, dpa, teto: dpa / divisor };
}

/**
 * Payout histórico aproximado: proventos médios por ação dos anos fechados
 * disponíveis ÷ LPA atual (lucro líquido dos últimos 12 meses ÷ nº de ações).
 */
export function payoutHistorico(
  historico: DividendYear[] | null | undefined,
  lucroAtual: number | null,
  acoes: number | null,
  anos = 3,
): number | null {
  const lpa = calcLpa(lucroAtual, acoes);
  if (lpa === null || lpa <= 0) return null;
  const alvo = anosFechados().slice(-anos);
  const valores = alvo
    .map((year) => historico?.find((h) => h.year === year))
    .filter((y): y is DividendYear => !!y)
    .map((y) => y.dividendo + y.jcp)
    .filter((v) => v > 0);
  if (valores.length === 0) return null;
  const mediaDpa = valores.reduce((a, b) => a + b, 0) / valores.length;
  const payout = mediaDpa / lpa;
  if (!Number.isFinite(payout) || payout <= 0) return null;
  return Math.min(payout, 1.5);
}

export function descontoPct(teto: number | null, preco: number | undefined | null): number | null {
  if (teto === null || !preco || preco <= 0) return null;
  return ((teto - preco) / preco) * 100;
}
