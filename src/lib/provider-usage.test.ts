import { describe, expect, it } from "vitest";
import { addUsage } from "./provider-usage";

describe("contador de consultas por fonte", () => {
  it("soma consultas no mesmo dia", () => {
    const a = addUsage(null, "2026-11-11", { brapi: 3 });
    const b = addUsage(a, "2026-11-11", { brapi: 2, bolsai: 1 });
    expect(b.counts).toEqual({ brapi: 5, bolsai: 1 });
  });
  it("recomeça do zero quando o dia muda", () => {
    const a = addUsage(null, "2026-11-11", { brapi: 40 });
    expect(addUsage(a, "2026-11-12", { brapi: 1 }).counts).toEqual({ brapi: 1 });
  });
  it("guarda o saldo restante informado pela fonte", () => {
    expect(addUsage(null, "2026-11-11", { bolsai: 1 }, { bolsai: 199 }).remaining).toEqual({ bolsai: 199 });
  });
});
