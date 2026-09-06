/**
 * Marca um ticker para busca "ao vivo" na próxima consulta: enquanto a marca
 * estiver válida, as consultas ignoram o cache do servidor e vão à fonte.
 */
const until = new Map<string, number>();
const WINDOW_MS = 30_000;

export function markForceRefresh(ticker: string) {
  until.set(ticker.toUpperCase(), Date.now() + WINDOW_MS);
}

export function isForced(ticker: string | null | undefined): boolean {
  if (!ticker) return false;
  const exp = until.get(ticker.toUpperCase());
  return !!exp && exp > Date.now();
}
