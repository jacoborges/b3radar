/** Regra do filtro "Visualizar somente": lista vazia = mostra todos os setores. */
export function filterBySectors<T extends { setor: string }>(items: T[], sectors: string[]): T[] {
  if (!sectors.length) return items;
  const set = new Set(sectors);
  return items.filter((s) => set.has(s.setor));
}
