# Venda de ativos na Carteira

Permitir registrar a venda de um ativo (data, quantidade e preço) na seção **Carteira**, com o saldo atualizado, o resultado realizado do que foi vendido e a manutenção dos proventos a que a pessoa tem direito mesmo depois de vender.

## O que será construído

### 1. Registrar venda
- Dentro de cada ativo da carteira, um botão **Vender** abre um formulário com:
  - Quantidade vendida (limitada ao saldo disponível na data)
  - Preço de venda (R$)
  - Data da venda (padrão: hoje)
- As vendas ficam listadas junto aos lançamentos do ativo, marcadas em vermelho, e podem ser editadas ou excluídas.

### 2. Saldo e resultado
- Quantidade do ativo passa a ser **comprado − vendido**.
- Quando o saldo chega a zero, o ativo sai da lista de posições ativas e vai para um bloco **Posições encerradas** (recolhível), preservando o histórico.
- Por ativo passam a aparecer:
  - Saldo atual e preço médio das compras
  - **Resultado realizado** (o que já foi ganho/perdido nas vendas)
  - Resultado em aberto (posição restante × cotação atual)
- O resumo da carteira soma o realizado e o em aberto.

### 3. Proventos após a venda
- O direito ao provento passa a ser calculado pela quantidade que a pessoa **tinha na Data Com**: compras feitas antes da Data Com menos vendas feitas antes da Data Com.
- Assim, quem vendeu depois da Data Com continua vendo o valor em "Próximos proventos a receber" até a data de pagamento; quem vendeu antes deixa de contar aquela quantidade.
- Uma marcação discreta indica quando o provento se refere a um ativo já vendido.

## Detalhes técnicos

- Nova tabela `public.portfolio_sales`: `portfolio_id`, `ticker`, `price`, `quantity`, `sold_at`, timestamps; GRANTs para `authenticated`/`service_role`, RLS via posse da carteira pai (mesmo padrão de `portfolio_lots`), trigger de `updated_at`, exclusão em cascata.
- `src/lib/portfolio.functions.ts`: `Portfolio` passa a incluir `sales`; novas funções `addSale`, `updateSale`, `deleteSale`; `listPortfolios` carrega as vendas junto.
- Validação no servidor e no cliente: a venda não pode exceder o total comprado até a data informada menos vendas anteriores.
- Resultado realizado por venda usando o **preço médio das compras anteriores à data da venda** (média ponderada), evitando escolha manual de lote.
- `src/hooks/use-portfolio-proventos.ts`: `PosicaoProventos` ganha `sales: Array<{ quantity, soldAt }>`; a quantidade elegível vira `compras(boughtAt < dataCom) − vendas(soldAt < dataCom)`, com piso em zero. Posições com saldo zero continuam sendo enviadas ao hook enquanto houver provento pendente.
- `src/routes/_authenticated/carteira.tsx`: formulário de venda no `PositionRow`, cálculo de saldo/realizado, bloco de posições encerradas e novo resumo.
- `src/components/PortfolioProventos.tsx`: marca eventos de ativos com saldo zero.
