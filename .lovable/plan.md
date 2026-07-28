## Objetivo
Permitir selecionar múltiplas luzes do semáforo de endividamento (verde, amarelo, vermelho) no filtro — em vez de uma única opção exclusiva.

## Mudanças em `src/routes/index.tsx`

1. **Estado**: trocar `debtFilter: DebtOpt` (single) por `debtColors: Set<"success"|"warning"|"danger">` (multi). Vazio = todos.
2. **Lógica do filtro** (linha ~138): `if (debtColors.size > 0 && !debtColors.has(debtLevel(s.divBrutaPatrimonio).color)) return false;`
3. **Contador de filtros ativos** (linha ~122): `(debtColors.size > 0 && debtColors.size < 3 ? 1 : 0)`.
4. **UI** (linhas ~698–718): substituir os 4 botões (Todos/Baixo/Moderado/Elevado) por 3 chips clicáveis (Baixo/Moderado/Elevado) que alternam seleção. Cada chip mostra a bolinha colorida do semáforo + label; visual "selecionado" mantém o `color-mix` já usado. Adicionar link "Limpar" quando houver seleção. Nenhum selecionado = mostra todos.
5. Manter o `InfoTip` e o layout do card qualitativo intactos.

## Fora de escopo
Sem alterações em `DebtSemaphore`, dados ou outras seções do filtro.
