/**
 * Valuation DDM (Modelo de Gordon) — módulo puro, sem I/O.
 *
 *   V0 = D1 / (r − g)
 *   D1 = D0 × (1 + g)
 *   g  = ROE × (1 − payout)          (fundamentalista)
 *   r  = Rf + β × (Rm − Rf) + risco-país   (CAPM adaptado)
 *
 * Aplicável a pagadores estáveis de proventos — tipicamente bancos,
 * financeiras e seguradoras, onde o FCD (EBIT/CAPEX) não faz sentido.
 */
import type { DividendYear } from "@/lib/stocks-data";

export interface PremissasDdm {
  /** taxa livre de risco (decimal) */
  rf: number;
  /** prêmio de risco de mercado, Rm − Rf (decimal) */
  premioMercado: number;
  /** risco-país (decimal) */
  riscoPais: number;
  beta: number;
}

export const PREMISSAS_DDM_PADRAO = {
  premioMercado: 0.05,
  riscoPais: 0.02,
  beta: 1,
  /** g conservador (inflação + PIB nominal aproximado) */
  gConservador: 0.045,
} as const;

/** Setores da base B3 tratados como financeiros (DDM aplicável). */
const SETORES_FINANCEIROS = [
  "intermediários financeiros",
  "serviços financeiros",
  "previdência e seguros",
  "securitizadoras",
  "holdings",
  "bancos",
  "exploração de imóveis", // FIIs/holdings imobiliárias listadas como ações pagadoras
];

export function isSetorFinanceiroNome(setor: string | null | undefined): boolean {
  const s = (setor ?? "").toLowerCase();
  if (s.includes("exploração de imóveis")) return false;
  return SETORES_FINANCEIROS.some((k) => s.includes(k) && k !== "exploração de imóveis");
}

/** r = Rf + β·(Rm − Rf) + risco-país */
export function custoCapitalProprio(p: PremissasDdm): number {
  return p.rf + p.beta * p.premioMercado + p.riscoPais;
}

/** g fundamentalista = ROE × (1 − payout). ROE em decimal. */
export function crescimentoFundamentalista(
  roe: number | null,
  payout: number | null,
): number | null {
  if (roe === null || payout === null) return null;
  if (!Number.isFinite(roe) || !Number.isFinite(payout)) return null;
  if (payout < 0 || payout > 1.5) return null;
  const g = roe * (1 - Math.min(payout, 1));
  return Number.isFinite(g) ? g : null;
}

/** CAGR dos proventos por ação entre o primeiro e o último ano fechado disponível. */
export function cagrDividendos(
  historico: DividendYear[] | null | undefined,
  anoRef = new Date().getFullYear(),
): number | null {
  const anos = (historico ?? [])
    .filter((h) => h.year < anoRef)
    .map((h) => ({ year: h.year, dpa: h.dividendo + h.jcp }))
    .filter((h) => h.dpa > 0)
    .sort((a, b) => a.year - b.year);
  if (anos.length < 2) return null;
  const primeiro = anos[0]!;
  const ultimo = anos[anos.length - 1]!;
  const periodos = ultimo.year - primeiro.year;
  if (periodos <= 0) return null;
  const cagr = Math.pow(ultimo.dpa / primeiro.dpa, 1 / periodos) - 1;
  if (!Number.isFinite(cagr)) return null;
  return Math.max(Math.min(cagr, 0.5), -0.5);
}

/** D0 = proventos por ação dos últimos 12 meses (ano corrente + complemento do ano anterior). */
export function dpaUltimos12m(
  historico: DividendYear[] | null | undefined,
  anoRef = new Date().getFullYear(),
): number | null {
  const atual = historico?.find((h) => h.year === anoRef);
  const anterior = historico?.find((h) => h.year === anoRef - 1);
  const somaAtual = atual ? atual.dividendo + atual.jcp : 0;
  const somaAnterior = anterior ? anterior.dividendo + anterior.jcp : 0;
  const base = somaAtual > 0 ? somaAtual : somaAnterior;
  return base > 0 ? base : null;
}

export interface ResultadoDdm {
  d0: number;
  g: number;
  d1: number;
  r: number;
  precoJusto: number | null;
  /** desconto (+) ou prêmio (−) em % sobre o preço atual */
  margem: number | null;
  /** g ≥ r torna Gordon inválido */
  invalido: boolean;
}

export function precoJustoGordon(
  d0: number | null,
  g: number | null,
  r: number,
  precoAtual?: number | null,
): ResultadoDdm | null {
  if (d0 === null || d0 <= 0 || g === null || !Number.isFinite(r)) return null;
  const d1 = d0 * (1 + g);
  if (g >= r - 0.001) {
    return { d0, g, d1, r, precoJusto: null, margem: null, invalido: true };
  }
  const precoJusto = d1 / (r - g);
  const margem =
    precoAtual && precoAtual > 0 ? ((precoJusto - precoAtual) / precoAtual) * 100 : null;
  return { d0, g, d1, r, precoJusto, margem, invalido: false };
}

export interface MatrizDdm {
  taxas: number[];
  crescimentos: number[];
  celulas: (number | null)[][];
  min: number | null;
  max: number | null;
}

/** Grade 5×5 em torno de r e g, passos de ±0,5 p.p. */
export function matrizSensibilidadeDdm(
  d0: number,
  rBase: number,
  gBase: number,
  passo = 0.005,
): MatrizDdm {
  const taxas = [-2, -1, 0, 1, 2].map((k) => rBase + k * passo);
  const crescimentos = [-2, -1, 0, 1, 2].map((k) => gBase + k * passo);
  const celulas = taxas.map((r) =>
    crescimentos.map((g) => precoJustoGordon(d0, g, r)?.precoJusto ?? null),
  );
  const vals = celulas.flat().filter((v): v is number => v != null && Number.isFinite(v));
  return {
    taxas,
    crescimentos,
    celulas,
    min: vals.length ? Math.min(...vals) : null,
    max: vals.length ? Math.max(...vals) : null,
  };
}

export interface VereditoDdm {
  label: string;
  desc: string;
  color: "success" | "warning" | "danger" | "muted";
}

export function classificarDdm(
  precoJusto: number | null,
  precoAtual: number | null | undefined,
): VereditoDdm {
  if (precoJusto === null || !precoAtual || precoAtual <= 0) {
    return {
      label: "Sem dados suficientes",
      desc: "Faltam proventos, ROE ou beta para concluir o DDM.",
      color: "muted",
    };
  }
  const m = ((precoJusto - precoAtual) / precoAtual) * 100;
  if (m >= 20)
    return {
      label: "Descontada pelo DDM",
      desc: "O valor presente dos dividendos supera com folga a cotação atual.",
      color: "success",
    };
  if (m >= 0)
    return {
      label: "Próxima do valor justo",
      desc: "Preço justo levemente acima da cotação — pouca margem.",
      color: "warning",
    };
  return {
    label: "Acima do valor justo",
    desc: "O fluxo projetado de dividendos não sustenta a cotação atual.",
    color: "danger",
  };
}

/**
 * Estimativa rápida do DDM usando só os campos da lista (para filtros):
 * D0 = preço × DY, LPA = preço ÷ P/L, payout = D0 ÷ LPA, g = ROE × (1 − payout).
 * Retorna a margem (%) sobre o preço atual, ou null quando não calculável.
 */
export function margemDdmRapida(
  s: { preco: number; dy: number; pl: number; roe: number; setor: string },
  rf = 0.15,
): number | null {
  if (!isSetorFinanceiroNome(s.setor)) return null;
  if (!(s.preco > 0) || !(s.dy > 0) || !(s.pl > 0) || !Number.isFinite(s.roe)) return null;
  const d0 = s.preco * (s.dy / 100);
  const lpa = s.preco / s.pl;
  if (!(lpa > 0)) return null;
  const payout = Math.min(d0 / lpa, 1);
  const g = crescimentoFundamentalista(s.roe / 100, payout);
  const r = custoCapitalProprio({
    rf,
    premioMercado: PREMISSAS_DDM_PADRAO.premioMercado,
    riscoPais: PREMISSAS_DDM_PADRAO.riscoPais,
    beta: PREMISSAS_DDM_PADRAO.beta,
  });
  return precoJustoGordon(d0, g, r, s.preco)?.margem ?? null;
}
