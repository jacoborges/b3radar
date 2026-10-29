import { describe, expect, it } from "vitest";
import { isOrderFilled, orderAmount, sumOpenOrdersByDate } from "./open-orders";

describe("isOrderFilled", () => {
  it("fills when price reaches the order price", () => expect(isOrderFilled(30, 30)).toBe(true));
  it("fills when price is below", () => expect(isOrderFilled(30, 29.5)).toBe(true));
  it("stays open when price is above", () => expect(isOrderFilled(30, 30.01)).toBe(false));
  it("stays open without quote", () => expect(isOrderFilled(30, null)).toBe(false));
});

describe("orderAmount", () => {
  it("multiplies quantity by order price", () =>
    expect(orderAmount({ price: 12.5, quantity: 400 })).toBe(5000));
});

describe("sumOpenOrdersByDate", () => {
  it("sums all open orders of each date and sorts ascending", () => {
    const totals = sumOpenOrdersByDate([
      { price: 10, quantity: 100, created_at: "2026-10-28T14:00:00Z" },
      { price: 20, quantity: 50, created_at: "2026-10-27T10:00:00Z" },
      { price: 5, quantity: 40, created_at: "2026-10-28T18:30:00Z" },
    ]);
    expect(totals).toEqual([
      { date: "2026-10-27", amount: 1000 },
      { date: "2026-10-28", amount: 1200 },
    ]);
  });
  it("returns empty for no orders", () => expect(sumOpenOrdersByDate([])).toEqual([]));
});
