/** Converte o consenso TradingView (-1..1) em rótulo de sensação de mercado. */
export function sentimentFromScore(score: number | null): { label: string; className: string } {
  if (score == null) return { label: "Sem dados", className: "border-border text-muted-foreground" };
  if (score >= 0.5) return { label: "Compra forte", className: "border-success/50 bg-success/15 text-success" };
  if (score >= 0.1) return { label: "Compra", className: "border-success/40 text-success" };
  if (score > -0.1) return { label: "Neutro", className: "border-border text-muted-foreground" };
  if (score > -0.5) return { label: "Venda", className: "border-destructive/40 text-destructive" };
  return { label: "Venda forte", className: "border-destructive/50 bg-destructive/15 text-destructive" };
}
