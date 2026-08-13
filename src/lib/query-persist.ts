import type { QueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

/** Chaves de dados de ativo que valem a pena guardar no cache local do app. */
const PERSISTED_PREFIXES = [
  "proventos",
  "fundamentus-ticker",
  "price-history",
  "consensus",
  "tv-technical",
  "preco-teto",
  "valuation-inputs",
  "macro-sensitivity",
];

const STORAGE_KEY = "b3radar:query-cache";
const CACHE_VERSION = "v1";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 dias

let started = false;

/** Liga a persistência do cache no navegador (idempotente, só no cliente). */
export function startQueryPersistence(queryClient: QueryClient) {
  if (started || typeof window === "undefined") return;
  started = true;

  const persister = createAsyncStoragePersister({
    storage: window.localStorage,
    key: STORAGE_KEY,
    throttleTime: 1000,
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: MAX_AGE,
    buster: CACHE_VERSION,
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query) => {
        if (query.state.status !== "success") return false;
        const head = query.queryKey?.[0];
        return typeof head === "string" && PERSISTED_PREFIXES.includes(head);
      },
    },
  });
}
