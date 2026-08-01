## Objetivo
Fechar o B3 Radar atrás de um login. Não existe cadastro público: só o administrador cria contas (e-mail + senha) e atribui perfis.

## Perfis
- **ADMIN** — acesso total ao app + painel de usuários: criar, editar perfil, suspender/reativar e excluir. Pode criar outros ADMIN.
- **GESTOR** — acesso total ao app + pode criar usuários comuns e suspender/reativar. Não exclui contas nem cria/edita ADMIN.
- **USUÁRIO** — acesso ao app apenas.

**Suspenso** é um status separado do perfil: a conta continua cadastrada, mas ao entrar vê só a mensagem "Seu acesso está suspenso. Entre em contato com o administrador." e um botão Sair.

## Tela de login
Fundo escuro do app, centralizado: título **B3 Radar**, campo E-mail, campo Senha, botão Entrar. Sem "criar conta" e sem "esqueci a senha". Erro genérico em credenciais inválidas.

## Escopo do bloqueio
Tudo protegido: `/`, `/dividendos`, `/configuracoes` passam para dentro da área autenticada. Visitante sem sessão é sempre levado ao login. A rota pública `/api/public/refresh-proventos` (coletor agendado) continua como está, protegida pelo segredo dela.

## Painel de administração
Nova página **Usuários** (visível no cabeçalho apenas para ADMIN e GESTOR):
- Lista com e-mail, perfil, status (ativo/suspenso) e data de criação.
- Botão "Novo usuário": e-mail, senha e perfil — a conta já nasce ativa e pronta para uso (sem confirmação por e-mail).
- Ações por linha: alterar perfil, suspender/reativar, redefinir senha e excluir (excluir só para ADMIN).
- Um ADMIN não pode suspender, rebaixar nem excluir a própria conta (evita ficar sem administrador).

## Conta inicial
`eventos.jacoborges@gmail.com` é criado como ADMIN. Você define a senha dele no momento em que eu implementar (vou pedir a senha por um campo seguro) e pode trocá-la depois pelo próprio painel.

## Detalhes técnicos
- Banco: tabelas `profiles` (id, email, status, created_at) e `user_roles` (user_id, role) com enum `app_role` = admin | gestor | usuario, RLS + GRANTs e função `has_role()` security definer. Perfil nunca fica na tabela de perfil do usuário para evitar escalação de privilégio.
- Cadastro público desativado na configuração de auth; criação de contas só via server function privilegiada que valida o perfil de quem chamou.
- Novas rotas: `/auth` (login público) e subárvore `_authenticated/` contendo home, dividendos, configurações e `/usuarios`. `src/routes/index.tsx` vira redirecionamento para o app autenticado.
- Server functions em `src/lib/admin-users.functions.ts` (listar, criar, alterar perfil, suspender, redefinir senha, excluir) usando o cliente administrativo apenas após verificar o papel do chamador.
- Verificação de suspensão feita no servidor, não só na interface.
