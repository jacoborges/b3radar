# Yield on cost como coluna própria em "Comparar setor"

Hoje o yield on cost aparece só como um número pequeno embaixo dos proventos. Ele passa a ter uma coluna própria, logo depois de "Retorno total".

## O que muda

- Na lista ranqueada do "Comparar setor", cada linha ganha a coluna **Yield on cost** à direita de "Retorno total", com o percentual em destaque e, abaixo, o valor em reais dos proventos.
- O bloco "Proventos" volta a mostrar apenas o valor recebido em reais, sem o percentual duplicado.
- No detalhe expandido do ativo, o yield on cost também aparece junto de "Valorização", para leitura rápida.
- Em telas pequenas a nova coluna continua visível; a coluna "Investido" segue oculta no celular, como já é hoje.

## Detalhes técnicos

- Alteração apenas de apresentação em `src/components/SectorCompare.tsx` (cabeçalho da linha do ranking e grade do conteúdo expandido). O valor já vem de `SimPosition.yieldOnCost`; nenhum cálculo, hook ou banco muda.
