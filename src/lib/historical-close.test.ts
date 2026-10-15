import { describe, expect, it } from "vitest";
import { selectExactHistoricalClose } from "./historical-close.server";

describe("selectExactHistoricalClose", () => {
  it("usa o fechamento da data de compra solicitada", () => {
    expect(
      selectExactHistoricalClose(
        "2026-10-14",
        [Date.parse("2026-10-13T13:00:00Z") / 1000, Date.parse("2026-10-14T13:00:00Z") / 1000],
        [31.1, 32.567],
      ),
    ).toEqual({ price: 32.57, date: "2026-10-14" });
  });

  it("não substitui a data por outro pregão", () => {
    expect(
      selectExactHistoricalClose(
        "2026-10-11",
        [Date.parse("2026-10-09T13:00:00Z") / 1000],
        [31.1],
      ),
    ).toBeNull();
  });
});