import { useProviderUsage } from "@/hooks/use-provider-usage";
import type { ProviderId } from "@/lib/providers/merge";

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  brapi: "BRAPI",
  hgbrasil: "HG Brasil",
  bolsai: "Bolsai",
  partnr: "Partnr",
};

/** Informativo de consultas do dia, por fonte de dados. */
export function ProviderUsageLine() {
  const usage = useProviderUsage();
  if (!usage) return null;
  const order: ProviderId[] = ["brapi", "hgbrasil", "bolsai"];
  const parts = order
    .filter((p) => (usage.counts[p] ?? 0) > 0 || usage.remaining[p] != null)
    .map((p) => {
      const n = usage.counts[p] ?? 0;
      const rem = usage.remaining[p];
      return `${PROVIDER_LABEL[p]} ${n}${rem != null ? ` (restam ${rem})` : ""}`;
    });
  return (
    <p className="mt-1 text-xs text-muted-foreground" title="Consultas feitas hoje neste navegador, por fonte de dados">
      Consultas hoje: {parts.length ? parts.join(" · ") : "nenhuma ainda"}
    </p>
  );
}
