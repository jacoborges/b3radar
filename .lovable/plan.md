# Grupos de acompanhamento de ações

## O que muda
- **Gerenciar grupos**: novo botão "Grupos" no menu, ao lado de Filtros e "Visualizar somente". Abre um painel para criar, renomear, trocar a cor e excluir grupos (paleta de cores pronta para escolher).
- **Marcar ações**: na lista de cotações, um pequeno quadrado aparece à esquerda de cada ticker.
  - Sem grupo: quadrado vazio (contorno).
  - Com grupos: o quadrado fica preenchido com a cor do grupo; se a ação estiver em vários, mostra as cores divididas em faixas.
  - Ao clicar no quadrado, abre uma lista com todos os grupos (nome + bolinha de cor) com caixas de seleção; marcar/desmarcar salva na hora. Atalho "Criar novo grupo" dentro da lista.
- Uma ação pode estar em quantos grupos quiser.
- Clicar no quadrado não abre o detalhe do ativo (só a lista de grupos).
- Ao excluir um grupo, as marcações dele são removidas; as ações continuam na lista normalmente.
- Tudo fica salvo na sua conta (aparece igual em outro aparelho).
- **Filtrar por grupo**: no painel "Grupos", opção de mostrar só as ações de um ou mais grupos na lista de cotações.

## Detalhes técnicos
- Tabelas novas: `stock_groups` (id, user_id, name, color, created_at, updated_at) e `stock_group_items` (group_id → stock_groups ON DELETE CASCADE, ticker, unique(group_id, ticker)). GRANTs para authenticated/service_role, RLS por dono (`auth.uid() = user_id`, itens via EXISTS no grupo). Trigger de updated_at.
- `src/lib/stock-groups.functions.ts`: server functions com `requireSupabaseAuth` — listar grupos+itens, criar, editar, excluir, alternar ticker em grupo. Validação de nome (1–40 caracteres) e cor (hex).
- Hook `use-stock-groups.ts` (React Query, atualização otimista) com mapa ticker → grupos.
- Componentes: `StockGroupsSheet.tsx` (gestão + filtro) e `StockGroupMarker.tsx` (quadrado + popover com checkboxes), inseridos nas duas renderizações de linha em `_authenticated/index.tsx` (tabela e cartões mobile), com `stopPropagation`.
- Filtro de grupo aplicado na lista de cotações junto aos demais filtros.
- Teste unitário: filtro por grupos (vazio mostra tudo; com grupos, só tickers marcados) e mapa ticker → múltiplos grupos.
