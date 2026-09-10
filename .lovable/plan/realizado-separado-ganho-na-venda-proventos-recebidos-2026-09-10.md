# Realizado separado: ganho na venda + proventos recebidos

Hoje o "Realizado" da Carteira mostra só a diferença entre compra e venda. A ideia é separar em duas parcelas e somar as duas no total realizado.

## O que muda

### Resumo da carteira
No lugar de um único "Realizado", passa a aparecer:

- **Ganho na venda** — preço de venda menos o preço médio de compra, como já é calculado hoje.
- **Proventos recebidos** — dividendos e JCP já pagos, referentes ao período em que os ativos estiveram em custódia.
- **Realizado total** — a soma das duas parcelas, com cor verde/vermelha conforme o resultado.

### Por ativo
Cada ativo (ativo ou encerrado) mostra as mesmas duas parcelas na sua linha de resumo: ganho na venda e proventos recebidos no período de custódia.

### Como o provento de custódia é contado
Para cada provento já pago (data de pagamento até hoje):

- quantidade com direito = comprada antes da data com − vendida antes da data com;
- valor = valor por ação × essa quantidade;
- proventos com data com anterior à primeira compra não entram.

Assim, quem comprou depois da data com não recebe, e quem vendeu depois da data com continua contando aquele provento.

### Estados
- Enquanto o histórico de proventos carrega, a parcela de proventos aparece como "—" e o total é marcado como parcial.
- Sem provento no período, a parcela mostra R$ 0,00.

## Detalhes técnicos

- Novo hook `src/hooks/use-portfolio-proventos-recebidos.ts`, no mesmo padrão de `use-sim-proventos.ts`: `useQueries` sobre `getTickerProventos` com a queryKey já existente `["proventos", ticker]` (reaproveita o cache), lendo `historicoCompleto` e filtrando `tipo` Dividendo/JCP com `dataPagamento <= hoje`.
- Entrada: as mesmas `posicoesResumo` já montadas em `carteira.tsx` (lots + sales por ticker); saída: `Map<ticker, number>` com o total recebido e o total geral.
- `src/routes/_authenticated/carteira.tsx`: `Position` ganha `proventosRecebidos` e `realizadoTotal = realized + proventosRecebidos`; `totals` ganha `proventos` e `realizadoTotal`. O rodapé do resumo e a linha de cada posição passam a exibir as duas parcelas.
- Sem alteração de banco de dados nem de server functions; nenhuma chamada extra à B3 além das já feitas pelo painel de próximos proventos.
