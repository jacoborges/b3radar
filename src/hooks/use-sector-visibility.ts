import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDriveSession } from "@/lib/drive-auth.functions";
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

function storageKey(userId: string | null): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function readLocal(userId: string | null): SectorPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    if (!Array.isArray(record.selected) || !Array.isArray(record.known)) return null;
    return { selected: clean(record.selected.map(String)), known: clean(record.known.map(String)) };
  } catch {
    return null;
  }
}

function writeLocal(preference: SectorPreference, userId: string | null) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(preference));
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
  const [userId, setUserId] = useState<string | null>(null);
  const loadRemote = useServerFn(getMySectorPreference);
  const saveRemote = useServerFn(setMySectorPreference);
  const getSession = useServerFn(getDriveSession);

  useEffect(() => {
    let cancelled = false;
    let currentUserId: string | null = null;
    const applyLocal = () => setPreference(reconcile(readLocal(currentUserId), available));
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey(currentUserId)) applyLocal();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, applyLocal);

    void (async () => {
      try {
        const { user } = await getSession();
        if (!user) return;
        currentUserId = user.id;
        if (!cancelled) {
          setUserId(currentUserId);
          applyLocal();
        }
        const remote = (await loadRemote()).preference;
        if (cancelled) return;
        const next = reconcile(remote, available);
        writeLocal(next, currentUserId);
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
  }, [availableKey, getSession, loadRemote, saveRemote]);

  const selectedSectors = preference?.selected ?? available;
  const selectedSet = useMemo(() => new Set(selectedSectors), [selectedSectors]);

  const setSelectedSectors = useCallback(
    (selected: string[]) => {
      const next: SectorPreference = {
        selected: available.filter((sector) => selected.includes(sector)),
        known: clean([...(preference?.known ?? []), ...available]),
      };
      setPreference(next);
      writeLocal(next, userId);
      void saveRemote({ data: next }).catch(() => {});
    },
    [available, preference?.known, saveRemote, userId],
  );

  return { selectedSectors, selectedSet, setSelectedSectors };
}