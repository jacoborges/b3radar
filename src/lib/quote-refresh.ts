/** Portfolio assets come first; no manual-refresh ticker is dropped by the polling cap. */
export function quoteRefreshBatches(priority: string[], displayed: string[], size = 40): string[][] {
  const tickers = [...new Set([...priority, ...displayed].map(t => t.trim().toUpperCase()).filter(Boolean))];
  const batches: string[][] = [];
  for (let i = 0; i < tickers.length; i += size) batches.push(tickers.slice(i, i + size));
  return batches;
}

const norm = (list: string[]) => [...new Set(list.map(t => t.trim().toUpperCase()).filter(Boolean))];

export interface QuoteTiers {
  /** Nível 1+2: carteira ativa e grupos — atualizados sempre. */
  priority: string[];
  /** Nível 3 + demais exibidos — segundo plano (ou imediato na busca). */
  background: string[];
}

/**
 * Escala de prioridade: carteira ativa → grupos → vendidos → demais.
 * Só os tickers pedidos pela tela entram no segundo plano; os vendidos vêm antes dos demais.
 */
export function quoteTiers(input: { held: string[]; groups: string[]; sold: string[]; requested: string[] }): QuoteTiers {
  const priority = norm([...input.held, ...input.groups]);
  const prioSet = new Set(priority);
  const requested = norm(input.requested).filter(t => !prioSet.has(t));
  const reqSet = new Set(requested);
  const sold = norm(input.sold).filter(t => reqSet.has(t));
  const soldSet = new Set(sold);
  const rest = requested.filter(t => !soldSet.has(t)).sort();
  return { priority, background: [...sold, ...rest] };
}

/** Pregão B3 (horário de Brasília, UTC-3): dias úteis das 10:00 às 18:15. */
export function isMarketOpen(now: Date): boolean {
  const brt = new Date(now.getTime() - 3 * 3600_000);
  const day = brt.getUTCDay();
  if (day === 0 || day === 6) return false;
  const min = brt.getUTCHours() * 60 + brt.getUTCMinutes();
  return min >= 600 && min <= 18 * 60 + 15;
}
