/** Mantém o preço manual; só consulta o fechamento quando estiver ausente. */
export async function resolveSimPurchasePrice(
  manualPrice: number | undefined,
  lookupClose: () => Promise<{ price: number }>,
): Promise<number> {
  if (manualPrice !== undefined) return manualPrice;
  const close = await lookupClose();
  return close.price;
}