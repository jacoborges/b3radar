# Cache dos dados do ativo: buscar só ao expandir

Hoje, cada painel do ativo (fundamentos, proventos, consenso, TradingView, macro, preço teto, valuation) tem prazos de validade curtos e alguns ficam se atualizando sozinhos em segundo plano (consenso a cada 5 min, TradingView a cada 1 min). Isso gasta consultas às fontes e faz o mesmo ativo ser buscado de novo sem necessidade.

## O que muda

- **Nada mais se atualiza sozinho** nos painéis do ativo. A busca acontece somente quando você expande o ticker — e apenas se o dado guardado estiver vencido.
- **Cache próprio do app, sempre com a última atualização**: cada resposta recebida é gravada no navegador (armazenamento local do app) sobrescrevendo a versão anterior daquele ativo. Ao reabrir o ativo — inclusive depois de recarregar a página ou fechar o navegador — o conteúdo aparece na hora, a partir do último dado guardado.
- **Janelas de validade por tipo de dado** (quando vence, a próxima abertura do ativo busca de novo e sobrescreve):
  - Fundamentos (Fundamentus): 12 h
  - Proventos / dividendos: 24 h
  - Histórico de preços (10 anos): 7 dias
  - Consenso de mercado + TradingView técnico: 6 h
  - Preço teto e Valuation (FCD): 24 h
  - Macro (IA): 7 dias
- **Botão "Atualizar" no topo do detalhe do ativo**: força a rebusca de todos os painéis daquele ticker e sobrescreve o cache, para quando você quiser o dado do minuto.
- **Carimbo de horário**: o cabeçalho do modal passa a mostrar "Atualizado em dd/mm HH:mm" referente ao dado guardado, para ficar claro que é cache.
- **Cotações continuam ao vivo** na lista e na carteira, como hoje (ciclo de 60 s) — só os dados pesados do ativo passam a ser sob demanda.

## Detalhes técnicos

- Adicionar persistência do TanStack Query com `@tanstack/query-persist-client-core` + `createAsyncStoragePersister` sobre `localStorage`, montado no cliente em `src/routes/__root.tsx` (nunca no SSR), com `maxAge` alto e `buster` de versão.
- Persistir somente chaves de dados de ativo (`proventos`, `ticker-fundamentals`, `price-history`, `consensus`, `tradingview`, `preco-teto`, `valuation-inputs`, `macro`); excluir `live-quotes`, `quote` e dados de sessão/carteira via `dehydrateOptions.shouldDehydrateQuery`.
- Nos hooks (`use-ticker-data`, `use-ticker-fundamentals`, `use-price-history`, `use-consensus`, `use-tradingview`, `use-valuation`, hooks de preço teto/macro): remover `refetchInterval`, manter `refetchOnWindowFocus: false`, `refetchOnMount: false` e ajustar `staleTime`/`gcTime` conforme as janelas acima.
- Todos esses hooks já são `enabled: !!ticker`, ou seja, só disparam quando o modal abre com um ticker — a busca sob demanda vem de graça.
- Novo botão de refresh em `src/components/StockDetailModal.tsx` chamando `queryClient.invalidateQueries` filtrado pelo ticker atual; horário derivado de `dataUpdatedAt` das queries.
- Sem mudanças de banco, de fontes de dados ou de layout dos painéis.
