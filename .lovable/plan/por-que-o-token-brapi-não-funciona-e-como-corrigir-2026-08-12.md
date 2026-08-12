# Por que o token brapi "não funciona" — e como corrigir

## Diagnóstico (confirmado por teste)

O token está válido. Uma consulta de **1 ativo** com o seu token responde 200 com preço real (PETR4 R$ 41,66).

O problema é o **tamanho do lote**. O app pede 15 tickers por requisição e a brapi responde:

```text
HTTP 400
{"code":"QUOTES_PER_REQUEST_EXCEEDED",
 "message":"Seu plano permite no máximo 1 ativo(s) por requisição. Você enviou 15."}
```

Como o código trata qualquer resposta não-OK devolvendo lista vazia e sem erro, a tela simplesmente não mostra cotação e nenhuma mensagem aparece. É exatamente o que se vê nas chamadas recentes: `quotes: []`, `error: null`.

Ou seja: o plano da sua conta brapi permite **1 ativo por requisição**. Com token ou sem token, qualquer lote falha.

## O que será feito

1. **Consultar 1 ativo por requisição** quando houver token, respeitando o limite do plano, com fila de concorrência limitada (poucas requisições simultâneas) para não estourar o limite por minuto.
2. **Limitar o número de ativos consultados ao vivo**: em vez de 120 tickers a cada 15 segundos (o que consumiria a cota rapidamente), atualizar apenas os ativos visíveis na tela / na carteira, e espaçar o intervalo de atualização.
3. **Mostrar o erro em vez de silenciar**: quando a brapi devolver 400/401/429, exibir a mensagem real ("limite de ativos por requisição", "cota excedida, tente em alguns minutos", "token inválido") com atalho para Ajustes.
4. **Reaproveitar o cache compartilhado** de cotações já existente, para que Cotações, Carteira e Valuation não repitam as mesmas consultas.
5. Aplicar a mesma correção de lote/erro nos demais pontos que consultam a brapi (fundamentos e valuation), que hoje já usam 1 ativo por requisição mas silenciam o erro.

## Detalhes técnicos

- `src/lib/quotes.functions.ts`: `BATCH_SIZE` passa a ser 1 quando há token de plano restrito; `fetchBatch` lê o corpo de erro da brapi e devolve `{code, message}` em vez de `[]`; agregação com `Promise.allSettled` e limite de concorrência (~6).
- `src/hooks/use-live-quotes.ts`: reduzir `MAX_TICKERS`, aumentar `REFRESH_MS` e priorizar tickers visíveis; propagar o erro estruturado.
- UI de cotações/carteira: banner com a mensagem da fonte e link para `/configuracoes`.
- Sem mudanças de banco de dados e sem chamadas de IA.

## Observação sobre o seu plano brapi

Mesmo com o código corrigido, 1 ativo por requisição significa cota consumida muito rápido ao acompanhar centenas de papéis. Se quiser atualização ampla e frequente, vale um plano brapi que permita mais ativos por requisição — o app passará a usar lotes maiores automaticamente quando isso for liberado.
