export interface ContributionLot {
  ticker: string;
  boughtAt: string;
  quantity: number;
  price: number;
}

/** Gross registered purchases, without netting sales or revaluing original lots. */
export function monthlyContributions(lots: ContributionLot[], year: number) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    total: 0,
    purchases: [] as ContributionLot[],
  }));
  for (const lot of lots) {
    if (Number(lot.boughtAt.slice(0, 4)) !== year) continue;
    const month = months[Number(lot.boughtAt.slice(5, 7)) - 1];
    if (!month) continue;
    month.total += lot.quantity * lot.price;
    month.purchases.push(lot);
  }
  return months;
}