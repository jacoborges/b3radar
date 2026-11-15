import { describe, expect, it } from "vitest";
import { escapeAction, type EscapeContext } from "./escape-nav";

const base: EscapeContext = {
  key: "Escape",
  repeat: false,
  defaultPrevented: false,
  modifier: false,
  overlayOpen: false,
  editableFocused: false,
  pathname: "/carteira",
};

describe("escapeAction", () => {
  it("não navega quando o Esc já fechou uma janela", () => {
    expect(escapeAction({ ...base, defaultPrevented: true })).toBe("ignore");
  });
  it("não navega com janela ainda aberta", () => {
    expect(escapeAction({ ...base, overlayOpen: true })).toBe("ignore");
  });
  it("primeiro sai do campo de texto", () => {
    expect(escapeAction({ ...base, editableFocused: true })).toBe("blur");
  });
  it("sem janelas abertas volta para a tela inicial", () => {
    expect(escapeAction(base)).toBe("home");
  });
  it("na tela inicial apenas sobe ao topo", () => {
    expect(escapeAction({ ...base, pathname: "/" })).toBe("top");
  });
  it("ignora outras teclas e Esc segurado", () => {
    expect(escapeAction({ ...base, key: "Enter" })).toBe("ignore");
    expect(escapeAction({ ...base, repeat: true })).toBe("ignore");
  });
});
