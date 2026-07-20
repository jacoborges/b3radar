# Sliders separados para mínimo e máximo nos filtros

Hoje cada parâmetro fundamentalista do `FilterSheet` usa um único slider de intervalo (dois "thumbs" arrastáveis na mesma barra). Você quer trocar isso por **dois controles deslizantes distintos** — um só para o valor mínimo e outro só para o valor máximo — em cada parâmetro.

## O que muda

Arquivo: `src/routes/index.tsx` (componente `FilterSheet`, bloco `FUNDAMENTAL_KEYS.map(...)`).

Para cada indicador (Preço, P/L, DY, ROE, Dív/PL, CAGR, Free Float, Var. Dia/D-7/D-30, etc.), o layout passa a ter:

```text
Indicador (?)                                      12,3 — 45,6
  Mín.  ●────────────────────                       12,3
  Máx.  ────────────●───────                        45,6
```

- Dois `<Slider>` (do shadcn) com **um thumb cada**, um por baixo do outro.
- Label lateral pequeno "Mín." / "Máx." e o valor numérico atual à direita de cada linha.
- O cabeçalho do bloco continua mostrando o intervalo consolidado (`min — max`).
- Regra de consistência: se o usuário arrastar o mín. acima do máx. atual (ou vice-versa), o outro é empurrado para acompanhar, de modo que `min ≤ max` sempre.
- Comportamento de filtragem, chave `filters[k] = { min, max }` e o botão "Limpar" permanecem iguais — só a UI de entrada muda.

Escopo restrito: apenas o `FilterSheet` de `/` é alterado. Filtros qualitativos (Semáforo, Recorrência, Dividendo>Selic, Preço>Selic) ficam como estão.
