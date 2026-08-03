# Filtros com uma única régua e dois botões (mín. e máx.)

## O que muda
Cada indicador do painel de Filtros passa a ter exatamente o desenho da imagem: **uma linha só**, com um botão redondo em cada ponta — o da esquerda define o valor mínimo, o da direita define o máximo. O trecho entre eles fica destacado, mostrando a faixa selecionada.

Abaixo da linha, alinhados a cada botão: à esquerda o rótulo "mín." com o valor atual, à direita "máx." com o valor atual. Os valores somem de cima da régua para não duplicar informação (fica apenas o nome do indicador e sua interrogação explicativa).

## Por que hoje não aparece assim
O componente de régua do app desenha apenas **um** botão, mesmo quando o filtro trabalha com dois valores. Por isso o ajuste de máximo não tem um botão próprio na linha. A correção é fazer a régua desenhar um botão por valor.

## Detalhes técnicos
- `src/components/ui/slider.tsx`: renderizar um `SliderPrimitive.Thumb` por item de `value`/`defaultValue` (fallback de 1 thumb quando não houver valores). Aumentar levemente a área de toque do thumb (`h-4 w-4` com `ring-offset`) para uso em telas pequenas.
- `src/components/StockFilterSheet.tsx`: para cada indicador em `FUNDAMENTAL_KEYS`, trocar o bloco atual (rótulos "Mín"/"Máx" laterais + valor no cabeçalho) por: título → régua de faixa em largura total → linha de rótulos `mín. {lo}` / `máx. {hi}` com `justify-between`.
- Mantidos: limites de `FILTER_BOUNDS`, o `onValueChange` que grava `{min, max}`, a contagem de filtros ativos e o botão "Limpar todos os filtros".
- Sliders de valor único (Selic, score, etc.) continuam com um botão só e seguem funcionando.
- Sem mudanças em dados, backend ou lógica de filtragem; a tela de Inteligência de Proventos herda o novo visual por usar o mesmo painel.
