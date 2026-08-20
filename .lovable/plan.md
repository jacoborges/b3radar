# Token brapi.dev vinculado à conta do usuário

Hoje o token fica salvo apenas no navegador (localStorage). Ao trocar de dispositivo ou limpar o navegador, ele some. A mudança faz o token ser salvo no servidor, ligado ao e-mail de login, e carregado automaticamente logo após entrar.

## Como vai funcionar

- Em Ajustes, ao salvar o token, ele passa a ser gravado na conta do usuário (no banco), além de continuar em cache local para uso imediato.
- Ao fazer login em qualquer dispositivo, o app busca o token da conta e já o deixa preenchido e ativo — cotações, Valuation FCD e fundamentos usam o token sem nenhuma ação extra.
- "Remover" apaga o token tanto da conta quanto do navegador.
- A tela de Ajustes mostra o token mascarado e a origem ("salvo na sua conta").
- Cada usuário tem seu próprio token; ninguém enxerga o token de outro.

## Detalhes técnicos

1. Migração: coluna `brapi_token text` em `public.profiles` (ou tabela `user_settings` se preferir isolar), com RLS restrita ao próprio `auth.uid()` para SELECT/UPDATE e GRANT para `authenticated`.
2. Novo `src/lib/user-settings.functions.ts` com `getMyBrapiToken` e `setMyBrapiToken`, ambos usando `requireSupabaseAuth` (RLS como o próprio usuário). `getMyBrapiToken` devolve o token; `setMyBrapiToken` grava string vazia como `null`.
3. `useBrapiToken` em `src/hooks/use-live-quotes.ts` passa a: ler o localStorage de forma síncrona (evita corrida na primeira consulta), buscar o token da conta via server fn ao montar quando houver sessão, e só marcar `ready = true` depois dessa resolução — mantendo o contrato `[token, setToken, ready]` para não quebrar `use-valuation`, `quotes.functions` e `fundamentals.functions`.
4. `setToken` grava no localStorage, dispara o evento existente e persiste na conta em background.
5. Ao sair da conta (SIGNED_OUT), limpar o token em cache local para não vazar entre contas no mesmo navegador.
6. `src/routes/_authenticated/configuracoes.tsx`: texto atualizado ("fica salvo na sua conta") e estado de carregamento enquanto o token é buscado.
