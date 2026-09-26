# Google Drive por usuário como armazenamento principal

## Objetivo
Cada usuário conectará a própria conta Google Drive. O Drive será a fonte principal de carteiras reais, compras, vendas, simulações e relatórios do usuário, com acesso restrito aos arquivos criados pelo B3 Radar.

Para preservar todos os recursos existentes, o Lovable Cloud continuará somente com responsabilidades que o Drive não substitui: login, perfis, papéis de administrador, logs de acesso, usuários online, configurações globais, caches compartilhados de mercado e o vínculo seguro com cada Drive.

## Situação confirmada
- O app hoje mantém carteiras, movimentações e simulações no Lovable Cloud.
- Perfis, permissões administrativas, logs, presença online e caches de mercado também dependem do Lovable Cloud.
- O conector por usuário do Google Drive está disponível no workspace, mas ainda não há um cliente Google configurado para ele.
- O banco do Lovable Cloud está pausado; a migração e os testes autenticados dependem da reativação.

## Implementação

### 1. Vincular o Google Drive por usuário
- Vincular ao projeto um cliente do conector Google Drive para usuários finais.
- Solicitar somente o escopo `drive.file`, que permite ao B3 Radar acessar arquivos criados ou escolhidos pelo próprio app, sem varrer o restante do Drive.
- Configurar o retorno OAuth oficial do gateway: `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback`.
- Adicionar em **Configurações** um painel com estado da conexão, conta conectada, conectar, reconectar e desconectar.

### 2. Guardar o vínculo com segurança
- Criar uma tabela interna `app_user_connections`, acessível apenas pelo serviço do app, para relacionar usuário e conector.
- Armazenar somente a chave de conexão criptografada; nenhum token do Google irá ao navegador, URL, logs ou arquivos do usuário.
- Associar cada conexão ao identificador seguro do usuário autenticado, nunca ao e-mail ou a um identificador compartilhado.

### 3. Estrutura dos dados no Drive
Criar uma pasta visível **B3 Radar** contendo arquivos versionados:

```text
B3 Radar/
  manifest.json
  carteiras.json
  simulacoes.json
  relatorios/
    exportacoes geradas pelo usuário
```

- `manifest.json`: versão do formato, datas de sincronização e identificadores dos arquivos.
- `carteiras.json`: carteiras, lotes de compra, vendas e datas necessárias para proventos e resultados realizados.
- `simulacoes.json`: múltiplas carteiras simuladas, lotes e parâmetros das comparações.
- Escritas serão validadas, versionadas e feitas com proteção contra sobrescrita concorrente.

### 4. Tornar o Drive a fonte principal
- Substituir as leituras e alterações pessoais das carteiras e simulações por funções protegidas que leem e gravam no Drive do usuário.
- Manter a mesma interface atual, cálculos, gráficos, venda de ativos, proventos em custódia, linha do tempo e comparações setoriais.
- Atualizar a tela após cada gravação e apresentar estados claros para sincronização, perda de conexão e necessidade de reconectar.
- Não mover para o Drive o token brapi.dev nem as preferências pessoais nesta etapa, conforme o escopo escolhido.

### 5. Migração dos dados atuais
- Ao conectar pela primeira vez, detectar carteiras e simulações existentes no Lovable Cloud.
- Mostrar uma prévia com quantidades de carteiras, operações e simulações antes de copiar.
- Exportar para o Drive sem duplicar registros, validar a leitura de retorno e só então marcar a migração como concluída.
- Manter os dados antigos temporariamente como recuperação; a remoção definitiva ficará para uma etapa posterior e exigirá confirmação administrativa.

### 6. Relatórios e portabilidade
- Adicionar ações para exportar carteiras e simulações em JSON/CSV para a pasta `relatorios`.
- Exibir data da última sincronização e oferecer **Sincronizar agora**.
- Permitir baixar uma cópia pelo navegador mesmo quando o Drive estiver indisponível, desde que os dados já tenham sido carregados na sessão.

### 7. Segurança e continuidade
- Validar todos os arquivos e limitar tamanho, tipos e estrutura antes de processar.
- Tratar conexão revogada sem apagar dados e oferecer reconexão.
- Impedir acesso cruzado entre usuários e não registrar conteúdo financeiro em logs.
- Manter autenticação, administração, auditoria, presença online, cache de mercado e automações no Lovable Cloud.

## Validação
- Conectar duas contas diferentes e confirmar isolamento completo dos arquivos.
- Migrar carteira com compras, vendas e simulações; recarregar e conferir os mesmos totais.
- Validar criação, edição, venda, proventos, linha do tempo, simulação e exportação após a migração.
- Testar reconexão, popup bloqueado, permissão negada, Drive indisponível e conflito entre abas.
- Verificar desktop, smartphone e tablet, além da compilação e dos erros de execução.

## Pré-requisitos e bloqueios
1. Um administrador do workspace precisa criar/vincular o cliente OAuth do Google Drive quando o cartão de conexão for aberto.
2. O Lovable Cloud precisa ser reativado para login, armazenamento criptografado do vínculo e migração dos dados atuais.
