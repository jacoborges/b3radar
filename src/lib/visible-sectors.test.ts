import { describe, it, expect } from "vitest";
import { filterBySectors } from "./visible-sectors";
const items = [{ setor: "Bancos" }, { setor: "Energia" }, { setor: "Varejo" }];
describe("filterBySectors", () => {
  it("lista vazia mostra todos", () => expect(filterBySectors(items, [])).toHaveLength(3));
  it("mostra só os setores escolhidos", () =>
    expect(filterBySectors(items, ["Bancos", "Varejo"]).map((s) => s.setor)).toEqual(["Bancos", "Varejo"]));
});
