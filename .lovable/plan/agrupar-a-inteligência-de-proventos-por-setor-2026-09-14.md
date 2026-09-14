# Agrupar a Inteligência de Proventos por setor

## Objetivo

Organizar os resultados da Inteligência de Proventos em blocos por setor econômico, preservando todos os filtros e a classificação já existentes.

## O que muda

- A tabela única será dividida em seções por setor econômico.
- Cada seção mostrará o nome do setor, a quantidade de ativos encontrados e sua própria tabela.
- Dentro de cada setor, os ativos continuarão ordenados pelo score de proventos e, em caso de empate, pelo DY dos últimos 12 meses.
- Busca, classe, frequência, score, DY, anos consecutivos, fundamentos e demais filtros continuarão atuando sobre todos os ativos antes do agrupamento.
- Setores sem resultados para os filtros aplicados não serão exibidos.
- O total geral continuará mostrando quantos ativos foram encontrados; a mensagem de resultado vazio continuará única e clara.
- Clicar em um ativo continuará abrindo seus detalhes normalmente.

## Detalhes técnicos

- Reaproveitar o campo `stock.setor` já presente em cada ativo.
- Criar uma estrutura derivada de `ranked`, agrupada por setor, sem novas consultas nem mudanças no cálculo da Inteligência de Proventos.
- Renderizar uma tabela responsiva por setor, mantendo as colunas e o comportamento atuais.
- Ordenar os grupos alfabeticamente, mantendo o ranking atual dentro de cada grupo.
- Validar a visualização em celular e desktop e corrigir o erro de hidratação existente na página de autenticação antes da verificação final.
