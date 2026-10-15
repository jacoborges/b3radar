/** Portfolio assets come first; no manual-refresh ticker is dropped by the polling cap. */
export function quoteRefreshBatches(priority: string[], displayed: string[], size = 40): string[][] {
  const tickers = [...new Set([...priority, ...displayed].map(t => t.trim().toUpperCase()).filter(Boolean))];
  const batches: string[][] = [];
  for (let i = 0; i < tickers.length; i += size) batches.push(tickers.slice(i, i + size));
  return batches;
}