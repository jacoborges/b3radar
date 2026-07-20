# Mín. e máx. na mesma régua, com direções opostas

Uma única barra por indicador, contendo **dois thumbs no mesmo trilho**:

- Thumb da esquerda = **mín.** — só desliza da esquerda para a direita (limitado pelo thumb do máx.).
- Thumb da direita = **máx.** — só desliza da direita para a esquerda (limitado pelo thumb do mín.).

## Mudança

Arquivo: `src/routes/index.tsx`, apenas o bloco `FUNDAMENTAL_KEYS.map(...)` do `FilterSheet`.

Layout por indicador:

```text
Indicador (?)                                    12,3 — 45,6
Mín 12,3  ●═════════════●  45,6 Máx
```

- Um único `<Slider>` do shadcn com `value={[lo, hi]}`; o Radix já garante que o thumb da esquerda nunca ultrapassa o da direita e vice-versa, produzindo exatamente o comportamento pedido (mín. → direita, máx. → esquerda).
- À esquerda: rótulo `Mín` + valor `lo`. À direita: valor `hi` + rótulo `Máx`.
- Cabeçalho continua mostrando o intervalo consolidado.
- `filters[k] = { min, max }`, filtragem e "Limpar" inalterados.

Escopo restrito ao `FilterSheet` de `/`. Filtros qualitativos e sliders 0–5 permanecem inalterados.
