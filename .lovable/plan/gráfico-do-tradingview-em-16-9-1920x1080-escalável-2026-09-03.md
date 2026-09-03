# Gráfico do TradingView em 16:9 (1920x1080) escalável

Objetivo: ao expandir qualquer ativo, o gráfico do TradingView aparece sempre no formato widescreen 16:9 (proporção 1920x1080), ocupando toda a largura disponível e se ajustando à tela.

## O que muda para o usuário

- O gráfico deixa de ser 4:3 no celular e 16:10 no desktop: passa a ser sempre 16:9, igual à proporção 1920x1080.
- Ele usa toda a largura útil do pop-up e a altura acompanha automaticamente (largura ÷ 16 × 9), em qualquer aparelho.
- Em celular deitado, onde a altura é pequena, o gráfico continua limitado à altura visível para não empurrar o resto do conteúdo para fora da tela — mantendo o formato widescreen dentro desse limite.
- Nada mais muda: mesmos dados, mesmo carregamento automático ao expandir o ativo.

## Detalhes técnicos

- `src/components/StockDetailModal.tsx`, contêiner do iframe (linha ~271): trocar `aspect-[4/3] ... sm:aspect-[16/10]` por `aspect-video` (16:9) único, mantendo `w-full`, borda e `overflow-hidden`.
- Manter tetos de altura por orientação para o modo paisagem em telas baixas (`max-h-[60dvh]`, `landscape:max-h-[45dvh]`), com o bloco centralizado para preservar o 16:9 quando o teto de altura for aplicado.
- Nenhuma mudança nos parâmetros do widget, dados, backend ou lógica de negócio — apenas classes de apresentação.
