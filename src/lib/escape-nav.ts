/**
 * Regras puras da tecla Esc no app:
 * 1) se uma janela/menu já tratou o Esc (fechou como o "x"), não faz mais nada;
 * 2) se há janela/menu aberto que não tratou, também não navega;
 * 3) se o foco está num campo de texto, apenas sai do campo;
 * 4) caso contrário, volta para a tela inicial (ou sobe ao topo se já estiver nela).
 */
export type EscapeAction = "ignore" | "blur" | "home" | "top";

export interface EscapeContext {
  key: string;
  repeat: boolean;
  defaultPrevented: boolean;
  modifier: boolean;
  overlayOpen: boolean;
  editableFocused: boolean;
  pathname: string;
}

export function escapeAction(ctx: EscapeContext): EscapeAction {
  if (ctx.key !== "Escape" || ctx.repeat || ctx.modifier) return "ignore";
  if (ctx.defaultPrevented || ctx.overlayOpen) return "ignore";
  if (ctx.editableFocused) return "blur";
  return ctx.pathname === "/" ? "top" : "home";
}
