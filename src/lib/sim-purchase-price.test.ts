import { expect, it, vi } from "vitest";
import { resolveSimPurchasePrice } from "./sim-purchase-price";

it("consulta o fechamento quando o preço não foi informado", async () => {
  const lookup = vi.fn().mockResolvedValue({ price: 32.57 });
  expect(await resolveSimPurchasePrice(undefined, lookup)).toBe(32.57);
  expect(lookup).toHaveBeenCalledOnce();
});

it("mantém o preço manual sem consultar o fechamento", async () => {
  const lookup = vi.fn().mockResolvedValue({ price: 32.57 });
  expect(await resolveSimPurchasePrice(28.4, lookup)).toBe(28.4);
  expect(lookup).not.toHaveBeenCalled();
});

it("não inventa um preço quando a consulta falha", async () => {
  const lookup = vi.fn().mockRejectedValue(new Error("Sem fechamento"));
  await expect(resolveSimPurchasePrice(undefined, lookup)).rejects.toThrow("Sem fechamento");
});