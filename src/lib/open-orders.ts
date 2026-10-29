/** A buy limit order is taken when the market trades at or below the order price. */
export function isOrderFilled(orderPrice: number, marketPrice: number | null | undefined): boolean {
  return typeof marketPrice === "number" && marketPrice > 0 && marketPrice <= orderPrice;
}
