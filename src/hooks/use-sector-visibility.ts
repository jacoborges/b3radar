import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMySectorPreference,
  setMySectorPreference,
  type SectorPreference,
} from "@/lib/user-settings.functions";

const STORAGE_KEY = "b3radar:sector-visibility";
const EVENT = "b3radar:sector-visibility-changed";

function clean(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

function readLocal(): SectorPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    if (!Array.isArray(record.selected) || !Array.isArray(record.known)) return null;
    return { selected: clean(record.selected.map(String)), known: clean(record.known.map(String)) };
  } catch {
    return null;
  }
}

function writeLocal(preference: SectorPreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch {
    /* armazenamento local indisponível */
  }
  window.dispatchEvent(new Event(EVENT));
}

function reconcile(preference: SectorPreference | null, available: string[]): SectorPreference {
  const sectors = clean(available);
  if (!preference) return { selected: sectors, known: sectors };
  const known = new Set(preference.known);
  const selected = new Set(preference.selected);
  for (const sector of sectors) {
    if (!known.has(sector)) selected.add(sector);
    known.add(sector);
  }
  return {
    selected: sectors.filter((sector) => selected.has(sector)),
    known: clean([...known]),
  };
}

export function useSectorVisibility(availableSectors: string[]) {
  const availableKey = useMemo(() => clean(availableSectors).join("\u0001"), [availableSectors]);
  const available = useMemo(() => (availableKey ? availableKey.split("\u0001") : []), [availableKey]);
  const [preference, setPreference] = useState<SectorPreference | null>(null);
  const loadRemote = useServerFn(getMySectorPreference);
  const saveRemote = useServerFn(setMySectorPreference);

  useEffect(() => {
    const applyLocal = () => setPreference(reconcile(readLocal(), available));
    applyLocal();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) applyLocal();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, applyLocal);

    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const remote = (await loadRemote()).preference;
        if (cancelled) return;
        const next = reconcile(remote, available);
        writeLocal(next);
        setPreference(next);
        if (!remote || JSON.stringify(next) !== JSON.stringify(remote)) {
          void saveRemote({ data: next }).catch(() => {});
        }
      } catch {
        /* usa o cache local */
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, applyLocal);
    };
  }, [availableKey, loadRemote, saveRemote]);

  const selectedSectors = preference?.selected ?? available;
  const selectedSet = useMemo(() => new Set(selectedSectors), [selectedSectors]);

  const setSelectedSectors = useCallback(
    (selected: string[]) => {
      const next: SectorPreference = {
        selected: available.filter((sector) => selected.includes(sector)),
        known: clean([...(preference?.known ?? []), ...available]),
      };
      setPreference(next);
      writeLocal(next);
      void saveRemote({ data: next }).catch(() => {});
    },
    [available, preference?.known, saveRemote],
  );

  return { selectedSectors, selectedSet, setSelectedSectors };
}