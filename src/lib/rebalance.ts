export function simulateAveragePrice(qty: number, avg: number, addQty: number, buyPrice: number) {
  const finalQty = qty + addQty;
  const cost = addQty * buyPrice;
  const newAvg = finalQty > 0 ? (qty * avg + cost) / finalQty : 0;
  const changePct = qty > 0 && avg > 0 ? ((newAvg - avg) / avg) * 100 : null;
  return { finalQty, newAvg, cost, changePct };
}
