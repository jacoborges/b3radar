# Histórico de acesso por usuário

## Objetivo

Registrar cada período de uso do aplicativo e permitir que somente o administrador consulte, pelo ícone **INFO** à direita de cada usuário, quando a pessoa entrou, saiu e quanto tempo permaneceu conectada.

## O que será implementado

- Criar um histórico persistente de sessões com:
  - data e horário de entrada;
  - último sinal de atividade;
  - data e horário de saída;
  - duração total da sessão;
  - indicação de sessão ainda ativa ou encerrada automaticamente.
- Iniciar o registro após o login confirmado e manter um sinal periódico enquanto o aplicativo estiver aberto.
- Encerrar a sessão no botão **Sair**. Se a aba ou navegador for fechado sem sair, usar o último sinal recebido para calcular a duração, com pequena margem de até um minuto.
- Evitar criar um novo registro ao apenas atualizar a página; abas do mesmo acesso compartilharão a mesma sessão sempre que possível.
- Manter os registros por **12 meses**, removendo automaticamente os mais antigos.

## Tela de usuários

- Adicionar um botão de ícone **INFO** no lado direito de cada linha de usuário.
- Exibir o botão somente para contas com papel de administrador; gestores não verão nem poderão consultar o histórico.
- Ao clicar, abrir uma janela responsiva com:
  - e-mail do usuário;
  - lista do acesso mais recente para o mais antigo;
  - entrada, saída e tempo conectado;
  - estado “Online agora” quando aplicável;
  - mensagem adequada quando ainda não houver registros.
- Carregar os registros apenas quando a janela for aberta, sem aumentar o carregamento normal da lista de usuários.

## Segurança e dados

- Criar uma tabela exclusiva para sessões de acesso, vinculada ao usuário e com remoção em cascata quando a conta for excluída.
- Bloquear leitura e alteração direta pelos usuários; as gravações usarão funções autenticadas com horários definidos pelo servidor.
- Validar no servidor que somente administradores podem consultar o histórico de qualquer conta.
- Não registrar senha, token, endereço IP ou conteúdo consultado no aplicativo.

## Validação

- Testar login, atualização da página, saída explícita e encerramento sem logout.
- Confirmar cálculo da duração, ordenação dos registros e estado online.
- Confirmar que o administrador acessa o INFO e que gestor/usuário não conseguem visualizar os dados.
- Conferir a janela em computador e celular e validar que não há erros no fluxo de autenticação.
