# Contador de usuários online no cabeçalho (apenas admin)

Objetivo: mostrar, em tempo real, quantas pessoas estão com o app aberto — e exibir esse número somente para a conta de administrador principal.

## O que muda para o usuário

- Toda sessão autenticada passa a "marcar presença" enquanto o app está aberto (entra ao abrir, sai ao fechar a aba ou sair da conta).
- No cabeçalho, ao lado dos botões de Usuários/Sair, aparece um selo discreto com um ponto verde e o número de usuários online (ex.: "3 online"), atualizado em tempo real.
- Esse selo é visível **apenas** para quem tem papel `admin`. Gestores e usuários comuns não veem nada de diferente.
- A contagem é por pessoa (usuário), não por aba: alguém com duas abas abertas conta uma vez só.
- Passando o mouse (ou tocando), o selo mostra a lista de e-mails online quando o admin quiser conferir quem está conectado.

## Detalhes técnicos

- Novo hook `src/hooks/use-online-users.ts` usando Supabase Realtime Presence:
  - canal `presence:online-users` com `config.presence.key` = id do usuário;
  - `track({ email, at })` após `SUBSCRIBE`, `untrack`/`removeChannel` no cleanup do `useEffect`;
  - estado derivado de `presenceState()` nos eventos `sync`/`join`/`leave`, contando chaves únicas.
- O hook é chamado uma única vez, em `src/routes/__root.tsx` (dentro de um componente cliente que só ativa quando há sessão), para valer em todas as páginas sem duplicar canais.
- `src/components/AccountControls.tsx`: novo selo `OnlineBadge` renderizado somente quando `data?.role === "admin"` (reaproveita a query `my-access` já existente). Estilo com tokens (`bg-input/60`, `border-border/60`, ponto `bg-success`), sem cores fixas.
- Presence é efêmero (memória do Realtime), sem tabela nova, sem migração e sem custo de banco. Nenhuma mudança de RLS.
- Sem alteração de dados, cotações ou lógica de negócio.
