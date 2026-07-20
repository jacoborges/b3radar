# Sliders direcionais: mín. (LTR) e máx. (RTL)

Voltar a ter **dois sliders separados** por indicador, mas com direções opostas:

- **Mín.** — slider da esquerda → direita. Thumb parte da esquerda; arrastar para a direita aumenta o mínimo.
- **Máx.** — slider da direita → esquerda (`dir="rtl"`). Thumb parte da direita; arrastar para a esquerda reduz o máximo.

## Mudança

Arquivo: `src/routes/index.tsx`, apenas no bloco `FUNDAMENTAL_KEYS.map(...)` do `FilterSheet`.

Layout por indicador:

```text
Indicador (?)                                    12,3 — 45,6
Mín  ●───────────────────           12,3
                       45,6  ───────────●  Máx
```

- Dois `<Slider>` empilhados, cada um com um único thumb (`value={[lo]}` e `value={[hi]}`).
- O slider de máximo recebe `dir="rtl"` para que o thumb ocupe a direita e a barra "cresça" da direita para a esquerda; o valor numérico fica à direita.
- Regra `min ≤ max` mantida empurrando o outro extremo quando necessário.
- Cabeçalho, filtragem, `filters[k] = { min, max }` e botão "Limpar" continuam iguais.

Escopo restrito ao `FilterSheet` de `/`. Filtros qualitativos e sliders 0–5 (Dividendo>Selic, Preço>Selic) permanecem inalterados.
