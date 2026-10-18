import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMacroSeries, type MacroSeries } from "@/lib/macro.functions";
import { buildMacroContext } from "@/lib/macro-context";

export function useMacroSeries() {
  const call = useServerFn(listMacroSeries);
  return useQuery<MacroSeries[]>({
    queryKey: ["macro-series"],
    queryFn: () => call(),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/** Premissas macro prontas para os valuations (Selic, risco-país, Focus). */
export function useMacroContext() {
  const q = useMacroSeries();
  return buildMacroContext(q.data ?? null);
}
