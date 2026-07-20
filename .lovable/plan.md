# Voltar mín. e máx. para uma única régua

Trocar os dois sliders empilhados por **um único slider de intervalo** com dois thumbs (mín. e máx.) na mesma barra — mantendo a exibição numérica de cada extremo ao lado.

## Mudança

Arquivo: `src/routes/index.tsx` — apenas o bloco `FUNDAMENTAL_KEYS.map(...)` do `FilterSheet`.

Layout novo por indicador:

```text
Indicador (?)                                     12,3 — 45,6
Mín 12,3   ●─────────────●   45,6 Máx
```

- Um único `<Slider>` do shadcn com `value={[lo, hi]}` (dois thumbs arrastáveis independentemente na mesma régua).
- Rótulos numéricos "Mín" à esquerda e "Máx" à direita do slider mostrando o valor atual de cada thumb.
- Cabeçalho continua com o intervalo consolidado no canto direito.
- Ordem `min ≤ max` já é garantida pelo Radix Slider quando os dois thumbs estão na mesma trilha, então a lógica de "empurrar" é removida.
- Chave `filters[k] = { min, max }`, filtragem e botão "Limpar" continuam iguais.

Escopo restrito ao `FilterSheet` de `/`. Filtros qualitativos e os sliders "Dividendo>Selic" / "Preço>Selic" (que já são single-thumb 0–5) não mudam.
