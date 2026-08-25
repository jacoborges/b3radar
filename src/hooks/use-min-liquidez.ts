import { useEffect, useState } from "react";

export const MIN_LIQUIDEZ_STORAGE_KEY = "b3radar:min-liquidez";
/** Padrão: exclui apenas ativos sem liquidez (0 mi) */
export const MIN_LIQUIDEZ_DEFAULT = 0;
export const MIN_LIQUIDEZ_MIN = 0;
export const MIN_LIQUIDEZ_MAX = 100;
const EVENT = "b3radar:min-liquidez-changed";

function readStored(): number {
  if (typeof window === "undefined") return MIN_LIQUIDEZ_DEFAULT;
  try {
    const raw = window.localStorage.getItem(MIN_LIQUIDEZ_STORAGE_KEY);
    if (!raw) return MIN_LIQUIDEZ_DEFAULT;
    const n = Number.parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < MIN_LIQUIDEZ_MIN || n > MIN_LIQUIDEZ_MAX) {
      return MIN_LIQUIDEZ_DEFAULT;
    }
    return n;
  } catch {
    return MIN_LIQUIDEZ_DEFAULT;
  }
}

/** Liquidez diária mínima (em R$ milhões) para um ativo aparecer no app. */
export function useMinLiquidez(): [number, (v: number | null) => void] {
  const [value, setValue] = useState<number>(MIN_LIQUIDEZ_DEFAULT);

  useEffect(() => {
    setValue(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === MIN_LIQUIDEZ_STORAGE_KEY) setValue(readStored());
    };
    const onCustom = () => setValue(readStored());
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, onCustom);
    };
  }, []);

  const setMinLiquidez = (v: number | null) => {
    const valid =
      v !== null && Number.isFinite(v) && v >= MIN_LIQUIDEZ_MIN && v <= MIN_LIQUIDEZ_MAX;
    try {
      if (valid) window.localStorage.setItem(MIN_LIQUIDEZ_STORAGE_KEY, String(v));
      else window.localStorage.removeItem(MIN_LIQUIDEZ_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    setValue(valid ? (v as number) : MIN_LIQUIDEZ_DEFAULT);
    window.dispatchEvent(new Event(EVENT));
  };

  return [value, setMinLiquidez];
}

export const formatLiquidez = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
