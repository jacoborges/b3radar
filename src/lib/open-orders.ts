/** A buy limit order is taken when the market trades at or below the order price. */
export function isOrderFilled(orderPrice: number, marketPrice: number | null | undefined): boolean {
  return typeof marketPrice === "number" && marketPrice > 0 && marketPrice <= orderPrice;
}

/** Amount contributed by an open order: quantity × order price. */
export function orderAmount(order: { price: number; quantity: number }): number {
  return order.price * order.quantity;
}

/** Sum of open order amounts grouped by the date each order was placed (created_at, ascending). */
export function sumOpenOrdersByDate<
  T extends { price: number; quantity: number; created_at: string },
>(orders: T[]): { date: string; amount: number }[] {
  const byDate = new Map<string, number>();
  for (const o of orders) {
    const date = o.created_at.slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + orderAmount(o));
  }
  return Array.from(byDate, ([date, amount]) => ({ date, amount })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
