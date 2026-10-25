/** Preço justo de Benjamin Graham — módulo puro: √(22,5 × LPA × VPA). */
export const GRAHAM_CONSTANTE = 22.5;

export interface GrahamCalc {
  lpa: number | null;
  vpa: number | null;
  precoJusto: number | null;
  /** margem de segurança (%) = (justo − preço) / preço */
  margem: number | null;
  aplicavel: boolean;
}

export function grahamFairPrice({ lpa, vpa, preco }: { lpa: number | null; vpa: number | null; preco?: number | null }): GrahamCalc {
  const ok = lpa != null && vpa != null && Number.isFinite(lpa) && Number.isFinite(vpa) && lpa > 0 && vpa > 0;
  if (!ok) return { lpa, vpa, precoJusto: null, margem: null, aplicavel: false };
  const precoJusto = Math.sqrt(GRAHAM_CONSTANTE * lpa * vpa);
  const margem = preco && preco > 0 ? ((precoJusto - preco) / preco) * 100 : null;
  return { lpa, vpa, precoJusto, margem, aplicavel: true };
}

/** Deriva LPA = preço ÷ P/L e VPA = preço ÷ P/VP dos indicadores da lista. */
export function grahamFromMultiples(s: { preco?: number; pl?: number; pvp?: number }): GrahamCalc {
  const preco = s.preco;
  const lpa = preco && s.pl && s.pl > 0 ? preco / s.pl : s.pl != null && s.pl < 0 ? -1 : null;
  const vpa = preco && s.pvp && s.pvp > 0 ? preco / s.pvp : s.pvp != null && s.pvp < 0 ? -1 : null;
  return grahamFairPrice({ lpa, vpa, preco });
}
