import { useEffect, useState } from "react";
import { PROVIDER_USAGE_EVENT, readUsage, type UsageState } from "@/lib/provider-usage";

/** Consultas de hoje por fonte, contadas neste navegador. */
export function useProviderUsage(): UsageState | null {
  const [state, setState] = useState<UsageState | null>(null);
  useEffect(() => {
    const update = () => setState(readUsage());
    update();
    window.addEventListener(PROVIDER_USAGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(PROVIDER_USAGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return state;
}
