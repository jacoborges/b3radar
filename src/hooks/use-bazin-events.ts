import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProventosCached } from "@/lib/proventos.functions";
import type { EventoSocietario } from "@/lib/dividend-intelligence";

/** Lê o mesmo cache de proventos B3 usado pelo filtro de Preço Teto. */
export function useBazinEvents(enabled: boolean) {
  const loadCache = useServerFn(getProventosCached);
  const q = useQuery({ queryKey: ["proventos-cache"], queryFn: () => loadCache(), staleTime: 60_000, gcTime: 2 * 60 * 60 * 1000, refetchOnWindowFocus: false, enabled });
  return useMemo(() => {
    const m = new Map<string, EventoSocietario[]>();
    for (const it of q.data?.items ?? []) m.set(it.ticker, it.historicoCompleto);
    return m;
  }, [q.data]);
}
