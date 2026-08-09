# Preço Justo (valor patrimonial) no detalhe do ativo

Nova janela "Preço Justo (Valor Patrimonial)", posicionada entre o Semáforo de Endividamento e o Preço Teto.

## O que o usuário vê

- **Preço justo** = preço atual ÷ P/VP (o valor patrimonial por ação, onde P/VP = 1).
  - Verde quando o preço atual está abaixo do preço justo (P/VP < 1 — ação descontada).
  - Vermelho quando está acima (P/VP > 1 — negociada acima do valor patrimonial).
  - Selo com o desconto/prêmio em % e o P/VP atual.
- **Múltiplo de ROE** ao lado: ROE ÷ 15 (referência de ROE de 15% a.a.), exibido como `x,xx×`.
  - Verde se o múltiplo for maior que o P/VP da ação (o retorno sobre patrimônio justifica o prêmio pago).
  - Vermelho se for menor ou igual.
- Botão de interrogação (mesmo padrão dos demais indicadores) explicando: valor patrimonial por ação, leitura do P/VP e por que comparar o múltiplo de ROE com o P/VP.
- Quando faltar P/VP, ROE ou preço, o campo correspondente mostra "—" com aviso curto de dado indisponível (sem inventar número).

## Detalhes técnicos

- Novo `src/components/PrecoJustoPanel.tsx`, recebendo `precoAtual`, `pvp` e `roe` (ROE já vem em pontos percentuais, ex.: 18,4 = 18,4%).
  - `precoJusto = precoAtual / pvp` (só quando `pvp > 0`).
  - `diff = (precoJusto - precoAtual) / precoAtual * 100`.
  - `multiploRoe = roe / 15`; cor verde se `multiploRoe > pvp`, vermelha caso contrário.
  - Cores via tokens existentes (`--color-success` / `--color-danger`), como no `PrecoTetoPanel`.
- `src/components/StockDetailModal.tsx`: renderiza `<PrecoJustoPanel />` entre `<DebtSemaphore />` e `<PrecoTetoPanel />`, usando os valores já mesclados de `stock` (que já recebem os dados atualizados do Fundamentus por ticker).
- Sem mudanças de banco de dados e sem chamadas de IA.
