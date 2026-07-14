import type { ConsensusRating } from "./consensus-rating";

export type TvTimeframe = "1" | "15" | "60" | "1D" | "1W";

export const TV_TIMEFRAMES: { key: TvTimeframe; label: string }[] = [
  { key: "1", label: "1m" },
  { key: "15", label: "15m" },
  { key: "60", label: "1h" },
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
];

/** Yahoo/TradingView float [-1..+1] → rating. */
export function tvScoreToRating(score: number): ConsensusRating {
  if (score >= 0.5) return "compra-forte";
  if (score >= 0.1) return "compra";
  if (score > -0.1) return "neutro";
  if (score > -0.5) return "venda";
  return "venda-forte";
}

export interface TvTimeframeSignal {
  timeframe: TvTimeframe;
  /** -1..+1 */
  overall: number;
  ma: number;
  oscillators: number;
  rating: ConsensusRating;
  ratingMA: ConsensusRating;
  ratingOsc: ConsensusRating;
}

export interface TvTechnicalData {
  ticker: string;
  updatedAt: string;
  signals: TvTimeframeSignal[];
}

export interface TvUnavailable {
  ticker: string;
  available: false;
  reason: string;
}

export type TvResult = TvTechnicalData | TvUnavailable;

export function isTvAvailable(r: TvResult | null | undefined): r is TvTechnicalData {
  return !!r && (r as TvUnavailable).available !== false;
}
