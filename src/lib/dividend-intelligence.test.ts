import { describe, expect, it } from "vitest";
import { classifyDividendQuality } from "./dividend-intelligence";

const datas = (anos: number[]) => anos.map((y) => `${y}-03-15`);

describe("classifyDividendQuality — regra por anos de pagamento", () => {
  const ATUAL = 2026;

  it("Elite: pagou em todos os últimos 10 anos", () => {
    expect(classifyDividendQuality(datas([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]), ATUAL)).toBe("Elite");
  });

  it("Elite: ano corrente em aberto não quebra a série", () => {
    expect(classifyDividendQuality(datas([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]), ATUAL)).toBe("Elite");
  });

  it("Consistente: pagou em todos os últimos 5 anos (fora dos 10)", () => {
    expect(classifyDividendQuality(datas([2018, 2019, 2022, 2023, 2024, 2025, 2026]), ATUAL)).toBe("Consistente");
  });

  it("Consistente: 5 anos até o ano anterior, corrente em aberto", () => {
    expect(classifyDividendQuality(datas([2020, 2021, 2022, 2023, 2024, 2025]), ATUAL)).toBe("Consistente");
  });

  it("Regular: série contínua de menos de 5 anos", () => {
    expect(classifyDividendQuality(datas([2010, 2024, 2025, 2026]), ATUAL)).toBe("Regular");
  });

  it("Regular: série contínua encerrada no ano anterior, corrente em aberto", () => {
    expect(classifyDividendQuality(datas([2023, 2024, 2025]), ATUAL)).toBe("Regular");
  });

  it("Irregular: pagou, mas passou um ano sem pagar", () => {
    expect(classifyDividendQuality(datas([2024, 2026]), ATUAL)).toBe("Irregular");
    expect(classifyDividendQuality(datas([2023, 2025, 2026]), ATUAL)).toBe("Irregular");
  });

  it("Irregular: único ano de pagamento não é Regular", () => {
    expect(classifyDividendQuality(datas([2026]), ATUAL)).toBe("Irregular");
  });

  it("Sem cobertura: não pagou nos últimos 2 anos", () => {
    expect(classifyDividendQuality(datas([2019, 2020, 2021, 2022, 2023, 2024]), ATUAL)).toBe("Sem cobertura");
    expect(classifyDividendQuality(datas([2020]), ATUAL)).toBe("Sem cobertura");
    expect(classifyDividendQuality([], ATUAL)).toBe("Sem cobertura");
  });

  it("Regular: pago apenas no ano anterior conta com o ano corrente em aberto", () => {
    // 2025 pago + 2026 em aberto (grace) -> série contínua de 2 anos -> Regular
    expect(classifyDividendQuality(datas([2025]), ATUAL)).toBe("Regular");
  });
});
