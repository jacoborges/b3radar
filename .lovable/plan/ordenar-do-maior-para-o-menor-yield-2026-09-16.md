# Ordenar do maior para o menor Yield

## Objetivo
Adicionar à Inteligência de Proventos uma opção de ordenação que coloque no topo as ações com maior **DY dos últimos 12 meses**.

## Alterações
- Incluir um seletor de ordenação próximo aos controles atuais da Inteligência de Proventos.
- Oferecer pelo menos as opções:
  - **Maior Score** — mantém a ordem atual.
  - **Maior Yield (DY 12m)** — ordena do maior para o menor.
- Manter os ativos agrupados por setor; a ordenação escolhida será aplicada dentro de cada setor.
- Colocar ativos sem Yield calculado no final de cada grupo.
- Preservar todos os filtros atuais, a seleção de setores e a abertura do detalhe do ativo.

## Validação
- Confirmar que “Maior Yield” exibe valores de DY 12m em ordem decrescente dentro de cada setor.
- Confirmar que voltar para “Maior Score” restaura a classificação atual.
- Verificar o seletor e as tabelas em telas grandes e celulares.

## Detalhes técnicos
A ordenação será aplicada sobre os resultados já carregados, sem gerar novas consultas de dados financeiros. Em caso de empate no Yield, o Score será usado como desempate.
