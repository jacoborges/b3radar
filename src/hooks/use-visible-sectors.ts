import { useEffect, useState } from "react";
import { getMySelectedSectors, setMySelectedSectors } from "@/lib/user-settings.functions";

const KEY = "b3radar:visible-sectors";
const EVENT = "b3radar:visible-sectors-changed";
let synced = false;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(v: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Setores escolhidos no "Visualizar somente" (vazio = todos). Salvo no login. */
export function useVisibleSectors(): [string[], (v: string[]) => void] {
  const [value, setValue] = useState<string[]>([]);

  useEffect(() => {
    setValue(read());
    const on = () => setValue(read());
    window.addEventListener(EVENT, on);
    window.addEventListener("storage", on);
    if (!synced) {
      synced = true;
      getMySelectedSectors()
        .then((r) => write(r.sectors))
        .catch(() => {});
    }
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const set = (v: string[]) => {
    write(v);
    setMySelectedSectors({ data: { sectors: v } }).catch(() => {});
  };
  return [value, set];
}
