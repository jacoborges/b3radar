import { useEffect, useState } from "react";

export const BAZIN_DIVISOR_STORAGE_KEY = "b3radar:bazin-divisor";
export const BAZIN_DIVISOR_DEFAULT = 0.06;
export const BAZIN_DIVISOR_MIN = 0.01;
export const BAZIN_DIVISOR_MAX = 0.5;
const EVENT = "b3radar:bazin-divisor-changed";

function readStored(): number {
  if (typeof window === "undefined") return BAZIN_DIVISOR_DEFAULT;
  try {
    const raw = window.localStorage.getItem(BAZIN_DIVISOR_STORAGE_KEY);
    if (!raw) return BAZIN_DIVISOR_DEFAULT;
    const n = Number.parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < BAZIN_DIVISOR_MIN || n > BAZIN_DIVISOR_MAX) {
      return BAZIN_DIVISOR_DEFAULT;
    }
    return n;
  } catch {
    return BAZIN_DIVISOR_DEFAULT;
  }
}

/** Divisor (yield alvo) usado na fórmula de Bazin: preço teto = proventos médios / divisor. */
export function useBazinDivisor(): [number, (v: number | null) => void] {
  const [divisor, setDivisorState] = useState<number>(BAZIN_DIVISOR_DEFAULT);

  useEffect(() => {
    setDivisorState(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === BAZIN_DIVISOR_STORAGE_KEY) setDivisorState(readStored());
    };
    const onCustom = () => setDivisorState(readStored());
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, onCustom);
    };
  }, []);

  const setDivisor = (v: number | null) => {
    const valid =
      v !== null && Number.isFinite(v) && v >= BAZIN_DIVISOR_MIN && v <= BAZIN_DIVISOR_MAX;
    try {
      if (valid) window.localStorage.setItem(BAZIN_DIVISOR_STORAGE_KEY, String(v));
      else window.localStorage.removeItem(BAZIN_DIVISOR_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    setDivisorState(valid ? (v as number) : BAZIN_DIVISOR_DEFAULT);
    window.dispatchEvent(new Event(EVENT));
  };

  return [divisor, setDivisor];
}

export const formatDivisor = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
