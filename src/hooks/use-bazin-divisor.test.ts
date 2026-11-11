import { describe, expect, it } from "vitest";
import {
  BAZIN_DIVISOR_DEFAULT,
  BAZIN_DIVISOR_MAX,
  BAZIN_DIVISOR_MIN,
  formatDivisor,
} from "./use-bazin-divisor";

describe("divisor do preço teto Bazin", () => {
  it("padrão é 0,07 (yield mínimo de 7% ao ano)", () => {
    expect(BAZIN_DIVISOR_DEFAULT).toBe(0.07);
  });

  it("limites aceitos permanecem entre 0,01 e 0,5", () => {
    expect(BAZIN_DIVISOR_MIN).toBe(0.01);
    expect(BAZIN_DIVISOR_MAX).toBe(0.5);
    expect(BAZIN_DIVISOR_DEFAULT).toBeGreaterThanOrEqual(BAZIN_DIVISOR_MIN);
    expect(BAZIN_DIVISOR_DEFAULT).toBeLessThanOrEqual(BAZIN_DIVISOR_MAX);
  });

  it("formata o padrão como 0,07 em pt-BR", () => {
    expect(formatDivisor(BAZIN_DIVISOR_DEFAULT)).toBe("0,07");
  });
});
