import { describe, expect, it } from "vitest";
import { heldTickers } from "./portfolio-holdings";

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
