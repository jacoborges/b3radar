# Simulador de Carteira

Nova seção no cabeçalho, ao lado de "Carteira", onde o usuário monta carteiras de simulação e vê o rendimento total desde a data de compra: valorização do preço, proventos recebidos (dividendos e JCP) e ajuste automático da quantidade de ações por bonificação, desdobramento e grupamento.

## O que será construído

### 1. Acesso e carteiras
- Novo botão "Simulador" no cabeçalho, rota `/simulador`.
- Múltiplas carteiras de simulação (criar, renomear, excluir), independentes das carteiras da seção "Carteira", para não misturar posição real com simulação.
- Em cada carteira, lançamentos com ativo, preço de compra, quantidade e data da compra (mesmo formulário inline já usado na Carteira).

### 2. Ajuste automático por eventos societários
Para cada lançamento, o app percorre os eventos oficiais da B3 já disponíveis no app (mesma base usada na Inteligência de Proventos) com Data Com posterior à data da compra:
- Bonificação e desdobramento: aumentam a quantidade de ações pelo fator informado.
- Grupamento: reduz a quantidade pelo fator.
- A quantidade ajustada é usada em todos os cálculos e o preço médio por ação é recalculado (custo total dividido pela nova quantidade).

### 3. Proventos recebidos desde a data
- Só entram eventos cujo Data Com seja posterior à data da compra do lote (mesma regra já aplicada em "Próximos proventos a receber").
- Cada provento é multiplicado pela quantidade de ações vigente naquela data (já considerando bonificações/desdobramentos ocorridos antes dele).
- Lista de proventos recebidos por ativo: data com, data de pagamento, tipo (Dividendo/JCP), valor por ação, quantidade elegível e total recebido — em painel expansível, com subtotal por ticker.

### 4. Resultado da simulação
Por ativo e no consolidado da carteira:
- Valor investido, quantidade atual (ajustada), preço médio ajustado, preço atual e valor de mercado.
- Ganho de capital em R$ e %.
- Proventos recebidos em R$ e yield on cost (%).
- Retorno total (capital + proventos) em R$ e %.
- Verde para ganho, vermelho para perda, seguindo o tema atual.

### 5. Histórico ao longo do período
- Gráfico do retorno da carteira por ano desde a data mais antiga de compra: valorização do ano e proventos do ano, em barras empilhadas, no mesmo estilo do gráfico de dividendos já existente.
- Linha de resumo com o retorno acumulado no período.

## Detalhes técnicos

- Banco: duas tabelas novas, `sim_portfolios` e `sim_portfolio_lots`, espelhando o modelo de `portfolios`/`portfolio_lots` (RLS por `auth.uid()`, GRANTs para `authenticated`, exclusão em cascata).
- Server functions em `src/lib/sim-portfolio.functions.ts` com `requireSupabaseAuth` para CRUD de carteiras e lançamentos.
- Cálculo no cliente em `src/lib/sim-portfolio.ts` (funções puras: ajuste por eventos, proventos elegíveis, retorno total), reaproveitando:
  - `getBatchProventos`/cache `dividend_cache` para `historicoCompleto` (inclui Bonificacao, Desdobramento, Grupamento com `ratio` e `dataCom`).
  - `useLiveQuotes` para preço atual (mesmo cache das cotações).
  - `usePriceHistory` para a valorização anual usada no gráfico.
- Nova rota `src/routes/_authenticated/simulador.tsx` com `head()` próprio, e componentes `SimPortfolioManager`, `SimPositionsTable`, `SimProventosList`, `SimReturnChart`.
- Parsing de `ratio` da B3 (formatos como "50%", "1:2", "2") normalizado para fator multiplicador, com fallback seguro (fator 1) e aviso quando o evento não puder ser interpretado.
- Layout responsivo (cards no mobile, tabela no desktop), como no resto do app.
