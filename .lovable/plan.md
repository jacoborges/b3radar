# Ranking por setor

## O que o usuário verá
- Novo item **Ranking** no menu, ao lado das outras funções.
- Topo da página: escolha do **setor** (com o nome de exibição do setor) e do **prazo**: 1 ano, 6 meses ou 1 mês. Botão **Gerar ranking**.
- O cálculo usa a data de hoje: simula a compra de **100 ações** pelo preço de fechamento no início do prazo (último pregão até aquela data, mostrando a data usada) e compara com o preço atual.
- Lista em ordem do melhor para o pior retorno total, com: posição (1º, 2º...), marcador de grupo, ticker, preço inicial, preço atual, valorização (R$ e %), proventos recebidos no período (dividendos + JCP com Data Com dentro do prazo, × 100), retorno total (R$ e %) e botão "Ver gráfico".
- Ativos sem preço ou proventos disponíveis aparecem no fim com "sem dados", sem quebrar o ranking.
- Respeita o filtro de liquidez mínima e o "Visualizar somente".

## Regras do cálculo
- Valorização = (preço atual − preço inicial) × 100.
- Proventos = soma dos valores por ação com Data Com entre a data inicial e hoje × 100.
- Retorno total = valorização + proventos; % = retorno total ÷ (preço inicial × 100).
- Desdobramentos/bonificações no período: ajustar quantidade usando os eventos societários já usados no Simulador, para não distorcer o retorno.

## Detalhes técnicos
- Rota `src/routes/_authenticated/ranking.tsx` com head() próprio; link no menu do layout autenticado.
- Função de servidor autenticada `getSectorRanking({ tickers, period })`: busca para cada ticker a série diária não ajustada da Yahoo (uma chamada por ticker cobrindo 1 ano, reaproveitada para os três prazos), escolhe o último fechamento até a data inicial, soma proventos do cache B3 existente e aplica eventos societários. Concorrência limitada e cache de algumas horas por ticker/dia.
- Cálculo em módulo puro `src/lib/ranking.ts` com testes (prazos, proventos fora da janela ignorados, desdobramento, ordenação e itens sem dados no fim).
- Preço atual vem do cache compartilhado de cotações.
- Regra registrada em AGENTS.md.
