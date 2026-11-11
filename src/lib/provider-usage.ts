import type { ProviderId } from "@/lib/providers/merge";

export interface UsageState {
  day: string; // yyyy-mm-dd (UTC)
  counts: Partial<Record<ProviderId, number>>;
  /** Consultas restantes informadas pela própria fonte (quando houver). */
  remaining: Partial<Record<ProviderId, number>>;
}

export function emptyUsage(day: string): UsageState {
  return { day, counts: {}, remaining: {} };
}

/** Soma consultas do dia; ao virar o dia (UTC) o contador recomeça. */
export function addUsage(
  state: UsageState | null,
  day: string,
  add: Partial<Record<ProviderId, number>>,
  remaining: Partial<Record<ProviderId, number>> = {},
): UsageState {
  const base = state && state.day === day ? state : emptyUsage(day);
  const counts = { ...base.counts };
  for (const [k, v] of Object.entries(add) as Array<[ProviderId, number]>) {
    if (v > 0) counts[k] = (counts[k] ?? 0) + v;
  }
  return { day, counts, remaining: { ...base.remaining, ...remaining } };
}

const KEY = "b3radar:provider-usage";
const EVENT = "b3radar:provider-usage-changed";

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readUsage(): UsageState {
  const day = todayUtc();
  if (typeof window === "undefined") return emptyUsage(day);
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as UsageState) : null;
    return parsed && parsed.day === day ? parsed : emptyUsage(day);
  } catch {
    return emptyUsage(day);
  }
}

export function recordUsage(
  add: Partial<Record<ProviderId, number>>,
  remaining: Partial<Record<ProviderId, number>> = {},
) {
  if (typeof window === "undefined") return;
  const next = addUsage(readUsage(), todayUtc(), add, remaining);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage indisponível */
  }
  window.dispatchEvent(new Event(EVENT));
}

export const PROVIDER_USAGE_EVENT = EVENT;
