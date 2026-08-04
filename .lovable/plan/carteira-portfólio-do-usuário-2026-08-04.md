# Carteira (portfólio do usuário)

Nova seção "Carteira" no cabeçalho, com ícone de carteira de dinheiro, onde cada usuário gerencia suas próprias carteiras e posições, com lucro/prejuízo calculado em tempo real.

## O que será construído

### 1. Acesso pelo cabeçalho
- Botão com ícone de carteira ao lado dos botões atuais (Proventos, Configurações, Usuários, Sair), levando à nova página `/carteira`.

### 2. Gestão de carteiras
- Criar carteira com nome livre.
- Renomear e excluir (com confirmação).
- Lista lateral/seletor das carteiras do usuário; cada carteira mostra valor investido, valor atual e resultado total em R$ e %.
- Cada usuário só vê e edita as próprias carteiras.

### 3. Adicionar compras (botão "+")
- Botão "+" dentro da carteira abre, logo abaixo, um formulário inline com três campos:
  - Ativo: busca/seleção entre os tickers da base do app.
  - Preço de compra (R$).
  - Quantidade.
  - Opcional: data da compra (default hoje).
- Cada clique no "+" registra uma nova compra. Comprar de novo o mesmo ativo cria outro lançamento; o app agrupa por ticker e calcula automaticamente quantidade total e preço médio ponderado.

### 4. Cálculo de lucro/prejuízo
- Preço em tempo real vem do mesmo mecanismo já usado no app (cotações a cada 15s).
- Por ativo: quantidade total, preço médio, preço atual, valor investido, valor atual, resultado em R$ e em %.
- Verde para lucro, vermelho para prejuízo, seguindo o tema atual.
- Rodapé/resumo da carteira com o total consolidado.

### 5. Edição das posições
- Expandir um ativo para ver os lançamentos individuais (preço, quantidade, data).
- Editar ou excluir um lançamento; a média e os totais se recalculam na hora.

## Detalhes técnicos

- Banco: duas tabelas novas no backend.
  - `portfolios`: `user_id`, `name`, timestamps.
  - `portfolio_lots`: `portfolio_id`, `ticker`, `price`, `quantity`, `bought_at`, timestamps.
  - RLS escopada por `auth.uid()` (dono lê/cria/edita/apaga), com GRANTs para `authenticated`; `portfolio_lots` valida a posse via a carteira pai. Exclusão de carteira remove os lançamentos em cascata.
- Server functions em `src/lib/portfolio.functions.ts` com `requireSupabaseAuth`: listar/criar/renomear/excluir carteira, criar/editar/excluir lançamento.
- Nova rota `src/routes/_authenticated/carteira.tsx` (com `head()` próprio) + componentes `PortfolioManager` / `PortfolioPositions` / `AddLotForm`.
- Preço atual reaproveita `useLiveQuotes`; seleção de ativo reaproveita a lista de `useAllStocks`.
- Preço médio ponderado = soma(preço × qtd) / soma(qtd); resultado % = (preço atual / preço médio − 1) × 100.
- Layout responsivo (cards no mobile, tabela no desktop), como no resto do app.
