# Cache no servidor para dados que mudam pouco

Hoje só os proventos têm cache no servidor (tabela própria). Fundamentos, histórico de preços, dados contábeis do valuation, técnico do TradingView, consenso e os painéis de IA ficam apenas no navegador de cada usuário (ou em memória do worker, que se perde a cada reinício). Resultado: o mesmo ativo é consultado de novo na brapi/Fundamentus/Yahoo por cada usuário, cada navegador e cada aba — consumindo cota à toa.

## O que muda

- **Um cache central no banco do app.** Toda informação pesada de ativo passa a ser gravada no servidor, uma vez por ticker, e reaproveitada por todos os usuários. Quem abrir o ativo depois recebe o dado guardado sem nenhuma chamada externa.
- **Ordem de leitura ao expandir um ativo:** cache do navegador → cache do servidor → só então a fonte externa (brapi, Fundamentus, Yahoo, TradingView, IA). A fonte externa só é acionada quando o dado guardado venceu.
- **Prazos de validade por tipo de dado** (após vencer, a primeira abertura do ativo rebusca e regrava):
  - Fundamentos (Fundamentus / brapi): 12 h
  - Lista geral de ativos (Fundamentus): 6 h
  - Proventos: 24 h (já existente, mantido)
  - Histórico de preços 10 anos: 7 dias
  - Linhas contábeis do Valuation FCD/DDM: 7 dias
  - Consenso de mercado e técnico do TradingView: 6 h
  - Preço Teto, Preço Teto Projetivo, Análise de Mercado e Macro (IA): 7 dias
- **Cotação continua ao vivo** (ciclo de 60 s) — é o único dado que precisa ser do minuto.
- **Botão "Atualizar" do detalhe do ativo** passa a forçar também a regravação no servidor, não só no navegador.
- **Nada de resposta com erro entra no cache**: falha da fonte não é guardada, para não "congelar" um ativo sem dados.

## Detalhes técnicos

- Nova tabela `public.market_cache` (`kind text`, `ticker text`, `payload jsonb`, `fetched_at timestamptz`, PK composta `kind+ticker`), com `GRANT SELECT` para `anon`/`authenticated`, `GRANT ALL` para `service_role`, RLS ligada e política pública de leitura. Escrita só pelo servidor (admin client), como já é feito em `proventos-cache.server.ts`.
- Novo helper `src/lib/market-cache.server.ts` com `readCache(kind, ticker, ttlMs)` e `writeCache(kind, ticker, payload)`, usando o mesmo padrão de cliente publishable/admin já presente no projeto (inclusive o shim de `apikey` para chaves `sb_`).
- Envolver com esse helper os handlers de: `fundamentals.functions.ts` (brapi), `stocks.functions.ts` (lista e detalhe Fundamentus), `price-history.functions.ts`, `valuation.server.ts` (bloco brapi/contábil), `consensus.functions.ts`, `tradingview.functions.ts`, `preco-teto.functions.ts`, `preco-teto-projetivo.functions.ts`, `market-analysis.functions.ts`, `macro-sensitivity.functions.ts`, `valuation-ddm.functions.ts`. O cache em memória (`CACHE` de `preco-teto`) é substituído pelo cache de banco.
- Cada server fn ganha um parâmetro opcional `force?: boolean` para o botão Atualizar ignorar o cache do servidor; os hooks do cliente passam esse flag na invalidação manual.
- `src/lib/quotes.functions.ts` (cotação ao vivo) fica como está.
- Sem mudança de layout nem de fontes de dados.
