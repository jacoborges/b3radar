## Objetivo

Sempre que o app carregar, tentar buscar os dados mais recentes do Fundamentus no servidor (com cache HTTP de 1h). Se o scrape falhar, cair para o snapshot embarcado (`src/lib/stocks-fundamentus.json`) — o app nunca fica vazio.

## Como vai funcionar

```text
Browser ──▶ Loader da rota "/" ──▶ ensureQueryData("stocks-all")
                                        │
                                        ▼
                              getAllStocks (server fn)
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                                       ▼
      fetch fundamentus.com.br/resultado.php     catch → snapshot local
      + parse + normaliza para Stock[]           (stocks-fundamentus.json)
                    │
                    ▼
      setResponseHeader("cache-control",
        "public, s-maxage=3600, stale-while-revalidate=86400")
```

- 1ª visita depois de 1h: paga o scrape (~2–4s) e popula o cache do worker.
- Visitas seguintes na mesma hora: resposta instantânea do cache.
- Fundamentus fora do ar: cai para o snapshot local, app segue funcionando.

## Arquivos

### 1. Nova server function — `src/lib/stocks.functions.ts`
- `getAllStocks = createServerFn({ method: "GET" }).handler(...)`
- Faz `fetch("https://www.fundamentus.com.br/resultado.php")` com `user-agent` de browser.
- Reaproveita a mesma lógica de parse que já uso quando você pede "atualize os dados" (converte a tabela HTML em objetos `Stock`, aplica setor via mapa `ticker → setor`, calcula `debtSemaphore`, `dividendosRecorrentes` etc. — a mesma normalização que hoje produz o JSON).
- Em caso de erro (HTTP != 200, parse falha, timeout): retorna `{ stocks: SNAPSHOT, fonte: "snapshot", updatedAt: <mtime do build> }`.
- Em sucesso: retorna `{ stocks, fonte: "fundamentus", updatedAt: new Date().toISOString() }`.
- `setResponseHeader("cache-control", "public, s-maxage=3600, stale-while-revalidate=86400")`.
- Endpoint público e read-only, sem secrets, ok como `createServerFn` sem auth.

### 2. Snapshot embarcado vira fallback — `src/lib/stocks-data.ts`
- Mantém o `stocks-fundamentus.json` importado e a função de normalização exportada (para a server fn reusar).
- Exporta `SNAPSHOT_STOCKS` como fallback puro.
- Nenhum consumidor client-side importa mais o JSON direto para render — todos passam pelo hook novo.

### 3. Hook de leitura — `src/hooks/use-all-stocks.ts`
- `stocksQueryOptions` com `queryKey: ["stocks-all"]`, `queryFn` chamando `getAllStocks` via `useServerFn`, `staleTime: 60 * 60 * 1000`.
- Exporta `useAllStocks()` que retorna `{ stocks, fonte, updatedAt, isFetching }`.

### 4. Rota `/` — `src/routes/index.tsx`
- Adiciona `loader: ({ context }) => context.queryClient.ensureQueryData(stocksQueryOptions)` para SSR/prefetch.
- Substitui o `import` direto do snapshot pelo `useAllStocks()`.
- Adiciona `errorComponent` e `notFoundComponent` (obrigatórios quando a rota tem loader).
- No header, mostra um selo pequeno: "Dados: Fundamentus · atualizado há Xmin" (ou "snapshot offline" quando o fallback foi usado).

### 5. Modal — `src/components/StockDetailModal.tsx`
- Continua recebendo o `Stock` já resolvido via props (sem mudança de assinatura).
- O `baseStock` que ele consome agora vem da lista atualizada, não mais do JSON estático.
- Proventos (B3) e badge de fonte permanecem como estão.

### 6. Limpeza
- Remove a chamada morta a `getTickerFundamentals` dentro de `src/hooks/use-ticker-data.ts` (o modal já ignora o resultado desde a última mudança). Uma requisição a menos por modal aberto.

## O que **não** muda

- Proventos continuam vindos da B3 sob demanda no modal.
- Preço ao vivo da listagem continua via brapi.dev a cada 15s (independente do scrape do Fundamentus).
- Gráfico do TradingView, filtros, `/configuracoes` e o restante da UI ficam idênticos.
- `stocks-fundamentus.json` continua versionado no repo como fallback — não precisa mais ser atualizado manualmente para o app funcionar, mas mantê-lo fresco de vez em quando ajuda no primeiro carregamento pós-deploy.

## Riscos e mitigação

- **Fundamentus muda o HTML**: parse quebra → server fn cai no snapshot automaticamente; app não fica vazio, só desatualiza até eu ajustar o parser.
- **Latência da 1ª visita após expirar cache**: `stale-while-revalidate=86400` serve o cache antigo enquanto revalida em background, então o usuário raramente espera o scrape.
- **Bloqueio por user-agent**: se o Fundamentus bloquear o IP do worker Cloudflare, migramos para a opção "cron diário" sem refazer a UI (o hook continua igual).
