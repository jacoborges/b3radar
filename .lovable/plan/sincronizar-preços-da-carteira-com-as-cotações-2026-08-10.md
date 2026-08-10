# Sincronizar preços da Carteira com as Cotações

Sim, é possível. Hoje as duas telas buscam cotação ao vivo, mas cada uma faz a própria consulta, com listas de tickers diferentes e horários de atualização diferentes — por isso um mesmo ativo pode aparecer com preço distinto na Carteira e na tela de cotações.

## O que muda

- Um único "cofre" de cotações compartilhado pelo app inteiro: toda cotação recebida (por qualquer tela) é guardada por ticker e reaproveitada pelas demais telas.
- A Carteira passa a mostrar exatamente o mesmo preço da tela de cotações para o mesmo ativo, no mesmo momento.
- Se a tela de cotações ainda não trouxe determinado ativo (a lista principal tem limite de tickers por consulta), a Carteira continua buscando esse ativo e o valor obtido também alimenta o cofre — então a sincronia vale nos dois sentidos.
- Enquanto uma nova atualização não chega, permanece o último preço conhecido em vez de voltar para o preço do snapshot — evita o número "pular" ao trocar de página.
- A Carteira exibe o horário da última atualização de cotações, igual ao indicador já usado na tela principal.

## Detalhes técnicos

- `src/hooks/use-live-quotes.ts`: manter o polling de 15s, mas ao receber a resposta gravar cada `LiveQuote` num cache por ticker no `QueryClient` (chave `["quote", TICKER]`). O retorno do hook passa a ser a fusão do cache global com o resultado da própria consulta.
- Como o `QueryClient` é único (`src/router.tsx`), o cache atravessa as rotas sem estado global extra.
- `src/routes/_authenticated/carteira.tsx`: `priceOf` passa a ler do cache compartilhado (com fallback para o `preco` do snapshot apenas quando nunca houve cotação ao vivo) e a página mostra `updatedAt`/estado de atualização.
- `src/routes/_authenticated/index.tsx` continua igual — apenas passa a se beneficiar do cache compartilhado.
- Sem mudança de banco, de tabelas ou da fonte de dados (brapi permanece).
