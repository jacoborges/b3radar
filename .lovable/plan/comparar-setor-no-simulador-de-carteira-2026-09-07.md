# Comparar setor no Simulador de Carteira

Nova aba dentro do Simulador, ao lado de "Minhas carteiras", para simular de uma só vez todas as ações de um setor (Energia, Saneamento, Seguradoras, Bancos...) e ver qual delas mais devolveu dinheiro em proventos desde a data escolhida.

## Como vai funcionar

1. Você escolhe o **setor**, a **data da compra** e a **quantidade de ações** (a mesma para todos os ativos do setor).
2. O app busca o **preço de fechamento de cada ação naquele dia** e usa esse valor como preço de compra — nada para digitar.
3. Para cada ativo, calcula desde aquela data:
   - dividendos e JCP recebidos (dados oficiais da B3), já corrigindo a quantidade por bonificação, desdobramento e grupamento;
   - **yield on cost acumulado** (proventos ÷ valor investido);
   - valorização da ação até o preço de hoje e o **retorno total** (proventos + valorização).
4. A lista sai **ranqueada pelo yield on cost**, com 1º, 2º e 3º lugar destacados, e o retorno total aparece como coluna extra (com a possibilidade de reordenar por ele).
5. Cada linha expande mostrando os proventos ano a ano daquele ativo e avisos (ex.: ação sem preço na data escolhida, ou sem proventos no período).

Como setores grandes têm muitos papéis, a comparação usa os ativos mais líquidos do setor (limite de 30 por vez, ajustável na própria tela), evitando dezenas de consultas simultâneas às fontes.

Resultado é somente simulação — não cria nem altera as carteiras salvas.

## Detalhes técnicos

- **Preço na data**: novo server fn `getPriceOnDate` (`src/lib/price-history.functions.ts` + helper em `price-history.server.ts`) consultando o Yahoo com `interval=1d` numa janela de ±7 dias em torno da data e devolvendo o fechamento ajustado do pregão igual ou imediatamente anterior. Persistido no cache central (`market_cache`, `kind: "price-on-date"`, ticker `TICKER@AAAA-MM-DD`, TTL longo — dado histórico não muda).
- **Novo hook** `src/hooks/use-sector-simulation.ts`: recebe `{ tickers, data, quantidade }`, dispara `useQueries` para preço na data (concorrência natural do Query) e reaproveita `useSimProventos` para o histórico B3 e `useLiveQuotes` para o preço atual.
- **Cálculo**: reutiliza `simularTicker` de `src/lib/sim-portfolio.ts` com um lote virtual (`price` = fechamento da data, `quantity` informada, `boughtAt` = data), sem gravar nada no banco. Ranking novo em `src/lib/sim-portfolio.ts` (`rankearPosicoes`) ordenando por `yieldOnCost` e, como critério alternativo, `retornoTotalPct`.
- **UI**: `src/routes/_authenticated/simulador.tsx` ganha alternância entre "Minhas carteiras" e "Comparar setor"; o painel do comparador vira `src/components/SectorCompare.tsx` (seletor de setor a partir de `useAllStocks().sectors`, campos de data/quantidade, tabela ranqueada responsiva com cartões no mobile e linhas expansíveis reaproveitando o layout de proventos por ano já existente).
- Sem mudanças de banco de dados e sem chamadas de IA.
