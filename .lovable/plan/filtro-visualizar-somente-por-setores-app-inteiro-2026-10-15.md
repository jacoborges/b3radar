# Filtro "Visualizar somente" por setores (app inteiro)

## O que muda
- Novo botão **"Visualizar somente"** no topo do app (ao lado de Filtros/cabeçalho), visível em todas as telas.
- Abre um painel com a lista de setores econômicos, cada um com caixa de seleção, além de "Selecionar todos" e "Limpar".
- Ao escolher um ou mais setores, **todas as telas** (Cotações, Inteligência de Proventos, Carteira — na busca de ativos —, Simulador) passam a mostrar apenas ações desses setores. Nenhum selecionado = mostra tudo.
- O botão exibe um contador (ex.: "3 setores") quando ativo, e há um aviso discreto na lista "Exibindo somente: Bancos, Energia…" com atalho para limpar.
- A escolha fica **salva no seu login**: ao entrar de outro aparelho, a seleção volta igual.
- Ativos que você já tem na Carteira continuam aparecendo na própria Carteira (o filtro limita só a escolha de novos ativos), para não esconder posições reais.

## Detalhes técnicos
- Novo hook `src/hooks/use-visible-sectors.ts`: estado em localStorage (`b3radar:visible-sectors`) + sincronização com o banco, no padrão do `use-min-liquidez`.
- Banco: migração adicionando coluna `visible_sectors text[] default '{}'` em `public.user_settings` (RLS existente por usuário já cobre). Novas server functions `getMyVisibleSectors` / `setMyVisibleSectors` em `user-settings.functions.ts` com `requireSupabaseAuth`.
- `use-all-stocks.ts`: aplicar o filtro de setores junto ao de liquidez, para que todas as telas herdem automaticamente; `sectors` continua retornando a lista completa (para o painel de seleção).
- Componente `VisibleSectorsSheet.tsx` montado no layout autenticado (`_authenticated/route.tsx`).
- Carteira: posições existentes usam a lista completa (sem filtro de setor).
- Teste unitário da regra: lista vazia mostra todos; com setores escolhidos, apenas eles.
