# Guardar no app o resultado das comparações de setor

Hoje, cada vez que você clica em "Comparar" num setor, o app volta a buscar preço da data e histórico de proventos de todos os ativos. A ideia é guardar o resultado no próprio app e só refazer a busca quando você pedir.

## Como vai funcionar

1. Ao comparar um setor (ex.: Energia) com uma data e quantidade, o resultado do ranking fica guardado no app.
2. Se você repetir a mesma pesquisa (mesmo setor, mesma data, mesma quantidade e mesmo limite de ativos), o ranking aparece na hora, sem novas consultas.
3. O resultado guardado continua disponível mesmo se você fechar e reabrir o app, e vale por 7 dias.
4. Um selo mostra "Resultado de <data/hora>" e, ao lado, o botão **Atualizar comparação** força uma nova busca e substitui o que estava guardado.
5. Só o preço de hoje continua atualizando sozinho (é a única informação que muda durante o dia); preços históricos e proventos ficam guardados.

## Detalhes técnicos

- `src/lib/query-persist.ts`: incluir os prefixos `price-on-date` e `sector-compare` na lista persistida, para que fechamento histórico e o snapshot do ranking sobrevivam ao recarregar a página.
- `src/hooks/use-sector-simulation.ts`:
  - manter as consultas atuais (`price-on-date`, `useSimProventos`, `useLiveQuotes`), mas gravar um snapshot do ranking calculado em `queryClient.setQueryData(["sector-compare", setor, data, quantidade, limite], { ranking, semPreco, computedAt })` sempre que o cálculo terminar com dados completos;
  - ao montar com um snapshot presente e não expirado (7 dias), devolvê-lo imediatamente e manter as consultas de preço/proventos desabilitadas (`enabled: false`), evitando o disparo em massa;
  - expor `computedAt` e um `refetch()` que invalida `["price-on-date", ticker, data]` e `["proventos", ticker]` dos tickers da comparação, limpa o snapshot e reabilita as consultas.
- `src/components/SectorCompare.tsx`: aceitar os parâmetros de setor/data/quantidade/limite como chave do snapshot, exibir "Resultado de <data/hora>" quando vier do cache e trocar o botão atual "Atualizar histórico" por "Atualizar comparação" ligado ao novo `refetch()`.
- Sem mudanças de banco de dados e sem novas chamadas de IA. O cache no servidor (`market_cache`) já existente continua sendo a segunda camada de proteção contra chamadas repetidas.
