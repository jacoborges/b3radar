export interface PayoutEvent { tipo: string; valor: number; dataCom: string | null; dataPagamento: string | null }

/** Years (distinct) with a cash payout in each month (0-11), using payment date, else data com. */
export function payoutMonthYears(events: PayoutEvent[]): Array<Set<number>> {
  const seen = Array.from({ length: 12 }, () => new Set<number>());
  for (const e of events) {
    if ((e.tipo !== "Dividendo" && e.tipo !== "JCP") || !(e.valor > 0)) continue;
    const d = e.dataPagamento || e.dataCom;
    if (!d) continue;
    const m = Number(d.slice(5, 7)) - 1;
    if (m >= 0 && m < 12) seen[m]!.add(Number(d.slice(0, 4)));
  }
  return seen;
}

/** Number of distinct years with a cash payout in each month (1-12). */
export function payoutMonthCounts(events: PayoutEvent[]): number[] {
  return payoutMonthYears(events).map((s) => s.size);
}

export interface PayoutMonthState {
  /** anos (crescentes) em que houve pagamento no mês */
  anos: number[];
  /** total de anos distintos com pagamento */
  totalAnos: number;
  /** pagou no ano corrente */
  atual: boolean;
  /** pagou no ano anterior */
  anterior: boolean;
  /** recorrente: pago em >= 2 anos distintos dentro dos últimos 5 anos */
  recorrente: boolean;
}

/**
 * Estado de cada mês (0-11) para a linha do tempo de proventos:
 * - ano atual -> aceso em verde
 * - ano anterior -> cinza
 * - recorrente nos últimos anos -> marcação mesclada (pisca)
 */
export function payoutMonthStates(
  events: PayoutEvent[],
  anoAtual = new Date().getUTCFullYear(),
): PayoutMonthState[] {
  const years = payoutMonthYears(events);
  return years.map((set) => {
    const anos = [...set].sort((a, b) => a - b);
    const recentes = anos.filter((y) => y >= anoAtual - 4);
    return {
      anos,
      totalAnos: anos.length,
      atual: set.has(anoAtual),
      anterior: set.has(anoAtual - 1),
      recorrente: recentes.length >= 2,
    };
  });
}
