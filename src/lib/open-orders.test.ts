import { describe, expect, it } from "vitest";
import { isOrderFilled } from "./open-orders";

describe("isOrderFilled", () => {
  it("fills when price reaches the order price", () => expect(isOrderFilled(30, 30)).toBe(true));
  it("fills when price is below", () => expect(isOrderFilled(30, 29.5)).toBe(true));
  it("stays open when price is above", () => expect(isOrderFilled(30, 30.01)).toBe(false));
  it("stays open without quote", () => expect(isOrderFilled(30, null)).toBe(false));
});
