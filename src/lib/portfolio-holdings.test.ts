import { describe, expect, it } from "vitest";
import { heldPositions, heldTickers } from "./portfolio-holdings";

const lot = (ticker: string, quantity: number) => ({ ticker, quantity });
const sale = (ticker: string, quantity: number) => ({ ticker, quantity });

describe("heldTickers", () => {
  it("mantém o ativo comprado e ignora quem foi vendido por completo", () => {
    const t = heldTickers([
      {
        lots: [lot("petr4", 100), lot("sapr4", 50)],
        sales: [sale("SAPR4", 50)],
      },
    ]);
    expect(t).toEqual(["PETR4"]);
  });

  it("mantém a sobra quando a venda é parcial", () => {
    const t = heldTickers([
      { lots: [lot("vale3", 100)], sales: [sale("VALE3", 40)] },
    ]);
    expect(t).toEqual(["VALE3"]);
  });

  it("soma posições espalhadas em mais de uma carteira", () => {
    const t = heldTickers([
      { lots: [lot("itub3", 30)], sales: [] },
      { lots: [lot("ITUB3", 20)], sales: [sale("itub3", 50)] },
    ]);
    expect(t).toEqual([]);
  });

  it("devolve vazio sem carteiras", () => {
    expect(heldTickers([])).toEqual([]);
  });
});

describe("heldPositions", () => {
  const pLot = (ticker: string, price: number, quantity: number, boughtAt = "2026-01-10") =>
    ({ ticker, price, quantity, boughtAt });
  const pSale = (ticker: string, price: number, quantity: number, soldAt = "2026-02-10") =>
    ({ ticker, price, quantity, soldAt });

  it("consolida quantidade e preço médio de lotes em carteiras diferentes", () => {
    const pos = heldPositions([
      { lots: [pLot("petr4", 30, 100)], sales: [] },
      { lots: [pLot("PETR4", 40, 100)], sales: [] },
    ], "2026-11-13");
    expect(pos.get("PETR4")).toEqual({ quantity: 200, avgPrice: 35 });
  });

  it("mantém o preço médio após venda parcial e reduz a quantidade", () => {
    const pos = heldPositions([
      { lots: [pLot("vale3", 50, 100)], sales: [pSale("VALE3", 70, 40)] },
    ], "2026-11-13");
    expect(pos.get("VALE3")).toEqual({ quantity: 60, avgPrice: 50 });
  });

  it("omite ativos vendidos por completo", () => {
    const pos = heldPositions([
      { lots: [pLot("itub3", 25, 50)], sales: [pSale("ITUB3", 30, 50)] },
    ], "2026-11-13");
    expect(pos.size).toBe(0);
  });
});
