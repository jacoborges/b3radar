export type ConsensusRating =
  | "compra-forte"
  | "compra"
  | "neutro"
  | "venda"
  | "venda-forte";

export interface ConsensusMonth {
  /** Yahoo period label, ex: "-1m", "-2m" */
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  total: number;
}

export interface ConsensusData {
  ticker: string;
  /** Score agregado 0-5 (5 = melhor) */
  score: number;
  rating: ConsensusRating;
  totalAnalysts: number;
  /** Percentuais 0-100 */
  distribution: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  };
  /** Diferença do score mais recente vs. média dos anteriores */
  trend: number;
  months: ConsensusMonth[];
  updatedAt: string;
}

export interface ConsensusUnavailable {
  ticker: string;
  available: false;
  reason: string;
}

export type ConsensusResult = ConsensusData | ConsensusUnavailable;

export function isConsensusAvailable(
  r: ConsensusResult | null | undefined,
): r is ConsensusData {
  return !!r && (r as ConsensusUnavailable).available !== false;
}

export function scoreToRating(score: number): ConsensusRating {
  if (score >= 4.3) return "compra-forte";
  if (score >= 3.5) return "compra";
  if (score >= 2.5) return "neutro";
  if (score >= 1.7) return "venda";
  return "venda-forte";
}

export const RATING_META: Record<
  ConsensusRating,
  { label: string; short: string; color: string; bg: string; border: string; order: number }
> = {
  "compra-forte": {
    label: "Compra Forte",
    short: "C.Forte",
    color: "var(--color-success)",
    bg: "color-mix(in oklab, var(--color-success) 18%, transparent)",
    border: "color-mix(in oklab, var(--color-success) 55%, transparent)",
    order: 5,
  },
  compra: {
    label: "Compra",
    short: "Compra",
    color: "var(--color-success)",
    bg: "color-mix(in oklab, var(--color-success) 10%, transparent)",
    border: "color-mix(in oklab, var(--color-success) 40%, transparent)",
    order: 4,
  },
  neutro: {
    label: "Neutro",
    short: "Neutro",
    color: "var(--color-warning)",
    bg: "color-mix(in oklab, var(--color-warning) 12%, transparent)",
    border: "color-mix(in oklab, var(--color-warning) 45%, transparent)",
    order: 3,
  },
  venda: {
    label: "Venda",
    short: "Venda",
    color: "var(--color-danger)",
    bg: "color-mix(in oklab, var(--color-danger) 10%, transparent)",
    border: "color-mix(in oklab, var(--color-danger) 40%, transparent)",
    order: 2,
  },
  "venda-forte": {
    label: "Venda Forte",
    short: "V.Forte",
    color: "var(--color-danger)",
    bg: "color-mix(in oklab, var(--color-danger) 20%, transparent)",
    border: "color-mix(in oklab, var(--color-danger) 60%, transparent)",
    order: 1,
  },
};

export const RATING_KEYS: ConsensusRating[] = [
  "compra-forte",
  "compra",
  "neutro",
  "venda",
  "venda-forte",
];

export function formatScore(score: number): string {
  return score.toFixed(2);
}
