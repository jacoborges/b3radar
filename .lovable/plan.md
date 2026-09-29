# Login administrativo e armazenamento central no Google Drive

## Objetivo

Usar **b3radar@gmail.com** como conta central do Google Drive e substituir o login Google pelo acesso com **e-mail e senha previamente criados pelo administrador**.

O Google Drive será a única fonte persistente para usuários, permissões, sessões registradas, dados pessoais, configurações, logs, caches e relatórios. O servidor publicado do app continuará executando validações, cálculos, consultas externas e operações seguras no Drive; nenhuma senha ou credencial do Drive será enviada ao navegador.

## Fluxo de acesso

1. No primeiro uso, a tela exibirá a criação do administrador somente enquanto não existir nenhum administrador.
2. A criação exigirá uma **chave inicial secreta de uso único**, além do e-mail `b3radar@gmail.com` e da nova senha.
3. Após a criação bem-sucedida, o primeiro acesso será encerrado definitivamente.
4. O administrador entrará com e-mail e senha e poderá criar, suspender, excluir e redefinir a senha dos demais usuários.
5. Não haverá cadastro público, recuperação por e-mail nem “Entrar com Google”. Usuários dependerão do administrador para criação e redefinição de senha.

## Segurança das contas

- Guardar no Drive somente o hash forte e individual de cada senha; nunca a senha original ou uma versão reversível.
- Aplicar limite de tentativas e bloqueio temporário contra adivinhação de senhas.
- Usar comparação segura, mensagens de erro genéricas e validação de e-mail e senha.
- Manter a sessão em cookie seguro, inacessível ao navegador, com expiração e revogação.
- Invalidar sessões quando uma conta for suspensa, excluída ou tiver a senha redefinida.
- Separar papéis de administrador, gestor e usuário e verificar permissões no servidor em cada operação privada.
- Registrar login, logout, última atividade e duração sem registrar senhas ou outros segredos.

## Estrutura no Drive

```text
B3 Radar Data/
  system/
    users.json
    sessions.json
    app-settings.json
    schema-manifest.json
  audit/
    access-AAAA-MM.json
  users/
    <identificador-estável>/
      settings.json
      portfolios.json
      simulations.json
  market/
    fundamentals/
    dividends/
    quotes/
    valuations/
    comparisons/
  reports/
    <identificador-estável>/
```

- Arquivos terão versão, revisão, data e checksum.
- Escritas usarão ETag e repetição limitada para evitar sobrescritas entre abas.
- Dados sensíveis, como token brapi.dev, continuarão criptografados antes de serem gravados.
- Identificadores internos aleatórios separarão usuários sem usar o e-mail como nome de pasta.

## Migração das funções atuais

- Substituir a proteção de páginas, login, logout e controle de sessão atuais pelo novo acesso baseado no Drive.
- Migrar painel de usuários, papéis, suspensão, redefinição de senha e histórico de acesso.
- Migrar carteiras, compras, vendas, proventos, simulações, preferências e tokens pessoais.
- Migrar configurações administrativas, prompts, caches de mercado, comparações e relatórios.
- Trocar usuários online em tempo real por atividade periódica registrada no Drive, preservando o contador administrativo com pequena defasagem.
- Remover os caminhos de login Google já iniciados e todas as leituras e gravações no banco antigo.

## Migração dos dados existentes

- Enquanto o serviço antigo estiver acessível, gerar uma prévia administrativa com as quantidades encontradas.
- Transformar os registros para os documentos do Drive, gravar, reler e conferir checksums e totais.
- Trocar cada área somente após sua conferência.
- Se o serviço antigo continuar indisponível, migrar apenas os dados ainda acessíveis e indicar claramente o que não pôde ser recuperado.
- Excluir a dependência do armazenamento e autenticação antigos após a validação final.

## Detalhes técnicos

- A chave de primeiro acesso e a chave de assinatura de sessões ficarão como segredos do servidor, fora do Drive e do código.
- A chave inicial será marcada como consumida no documento central após criar o administrador; novas tentativas serão recusadas.
- Senhas usarão derivação resistente a ataques com salt individual e parâmetros versionados, permitindo atualização futura.
- Todas as funções privadas usarão a sessão do Drive no servidor, sem depender do token de autenticação anterior.
- O Drive será o armazenamento persistente, mas não substitui o servidor que publica o app e executa suas rotinas. Atualizações automáticas ocorrerão quando o servidor estiver ativo.

## Validação

- Testar criação única do primeiro administrador, tentativas com chave inválida e bloqueio de uma segunda inicialização.
- Testar login correto/incorreto, expiração, logout, redefinição, suspensão e exclusão.
- Confirmar que um usuário não acessa arquivos de outro e que gestores não alteram administradores.
- Validar Carteira, Simulador, filtros, configurações, logs, IA, caches e relatórios com dados lidos novamente do Drive.
- Simular duas abas gravando, Drive indisponível, permissão revogada e arquivo corrompido.
- Conferir desktop, smartphone e tablet, além dos erros de execução e compilação.

## Limitações aceitas

- Google Drive não é um banco transacional; gravações administrativas e o indicador de usuários online podem ter pequena defasagem.
- Sem serviço de e-mail, não haverá confirmação ou recuperação automática de senha.
- A indisponibilidade ou revogação do Drive central interromperá login e dados até a reconexão.
