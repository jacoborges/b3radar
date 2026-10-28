/** Preço que a ação teria com P/VP = 1 (equivale ao VPA): cotação ÷ P/VP. */
export function fairPriceAtPvp1(preco: number | null | undefined, pvp: number | null | undefined): number | null {
  if (typeof preco !== "number" || typeof pvp !== "number" || !Number.isFinite(preco) || !Number.isFinite(pvp) || pvp <= 0 || preco <= 0) return null;
  return preco / pvp;
}

export const PVP_FAIR_TIP = "Preço que a ação teria se fosse negociada exatamente pelo seu valor patrimonial (P/VP = 1). Equivale ao valor patrimonial por ação (VPA).";

export function pvpFairCell(preco?: number, pvp?: number) {
  const v = fairPriceAtPvp1(preco, pvp);
  if (v == null || preco == null) return { text: "—", cls: "" };
  const diff = (v / preco - 1) * 100;
  const text = `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${diff >= 0 ? "↑" : "↓"}${Math.abs(diff).toFixed(0)}%`;
  return { text, cls: diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "" };
}
