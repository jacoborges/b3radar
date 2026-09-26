# Migração do B3 Radar para Google Drive central

## Objetivo

Usar a conta Google Drive **[eventos.jacoborges@gmail.com](mailto:evenos.jacoborges@gmail.com)** como armazenamento central dos dados do B3 Radar e remover a dependência do banco, autenticação, cache e funções do Lovable Cloud.

O Google Drive guardará os dados em arquivos. O servidor publicado do app continuará necessário para executar cálculos, consultar fontes externas, proteger credenciais, controlar sessões e acessar o Drive sem expor a conta central no navegador.

## Arquitetura final

```text
Usuário → Entrar com Google → servidor do B3 Radar
                                  ↓
                    Google Drive central do app
                                  ↓
          usuários, papéis, logs, carteiras, caches e ajustes
```

- **Google Drive central:** fonte persistente de todos os dados.
- **Servidor do app:** valida identidade, aplica permissões, executa integrações e lê/grava os arquivos.
- **Navegador:** recebe somente os dados permitidos; nunca recebe tokens do Drive ou credenciais administrativas.
- **Lovable Cloud:** deixa de ser usado para banco, autenticação, presença, cache e funções de dados.

## 1. Conectar a conta central

- Vincular ao projeto o conector Google Drive da conta informada.
- Solicitar acesso suficiente para criar e administrar somente os arquivos do B3 Radar.
- Confirmar a conta efetivamente conectada após o consentimento; o endereço não será codificado como credencial.
- Todas as chamadas ao Drive serão feitas no servidor do app.

## 2. Substituir o login atual por Google

- Trocar login/senha por **Entrar com Google**.
- Validar a identidade Google no servidor e criar uma sessão segura em cookie `HttpOnly`, `Secure` e `SameSite`.
- Manter uma lista central de usuários autorizados e seus papéis (`admin`, `manager`, `user`) no Drive.
- Definir **[evenos.jacoborges@gmail.com](mailto:evenos.jacoborges@gmail.com)** como administrador principal inicial.
- Preservar bloqueio de usuários, logout, proteção das páginas e acesso administrativo.
- Armazenar somente identificador Google, e-mail, nome, papel e estado; nunca senha do Google.

## 3. Organização dos arquivos no Drive

```text
B3 Radar Data/
  system/
    users.json
    sessions-index.json
    app-settings.json
    schema-manifest.json
  audit/
    access-YYYY-MM.jsonl
  users/
    <google-user-id>/
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
    <google-user-id>/
```

- Arquivos terão versão de formato, data de atualização, revisão e checksum.
- Dados financeiros pessoais serão separados pelo identificador Google estável, não pelo e-mail.
- Logs serão particionados por mês para evitar arquivos excessivamente grandes.
- Caches serão divididos por categoria e ticker para reduzir conflitos e chamadas desnecessárias.

## 4. Camada de armazenamento confiável

- Criar um módulo único de leitura, gravação, busca e exclusão no Drive.
- Validar todo conteúdo com esquemas antes de usar.
- Implementar gravação com revisão/ETag para impedir que duas abas sobrescrevam mudanças silenciosamente.
- Usar tentativas limitadas e fila para gravações concorrentes.
- Manter cópia temporária em memória apenas durante a requisição; o Drive seguirá como fonte persistente.
- Não armazenar tokens, segredos ou sessões completas dentro dos arquivos do Drive.

## 5. Migrar todas as funções existentes

### Usuários e administração

- Migrar perfis, papéis, bloqueios e configurações administrativas.
- Recriar painel de usuários sobre os arquivos centrais.
- Substituir presença em tempo real por heartbeat no servidor e índice de sessões no Drive, aceitando atualização periódica em vez de presença instantânea.

### Logs

- Registrar login, logout, última atividade e duração em arquivos mensais.
- Manter o painel INFO e a retenção de 12 meses.
- Evitar registrar tokens, conteúdo financeiro detalhado ou respostas privadas de IA.

### Carteiras e simulações

- Migrar carteiras, compras, vendas, proventos, linha do tempo, simulações e comparações.
- Preservar cálculos de custódia, realizado, yield on cost, bonificações e desdobramentos.
- Manter exportações e relatórios no Drive central, separados por usuário.

### Preferências e configurações

- Migrar token brapi.dev por usuário, setores visíveis, filtros, Bazin, liquidez e demais ajustes.
- Proteger valores sensíveis com criptografia no servidor antes de gravá-los no Drive.
- Manter o prompt administrativo global e sua invalidação de cache.

### Caches e dados de mercado

- Migrar fundamentos, proventos, cotações, valuations, históricos, consenso e comparações setoriais.
- Preservar TTLs atuais e atualização ao expandir ativos.
- Adaptar atualizações automáticas para execução pelo servidor publicado; o Drive armazena o resultado, mas não executa tarefas sozinho.

## 6. Migração segura dos dados atuais

- Criar uma rotina administrativa de migração antes de desligar as leituras antigas.
- Ler os dados existentes, transformar para os novos formatos e mostrar uma prévia com contagens.
- Gravar tudo no Drive, reler, validar checksums e comparar totais.
- Trocar cada área para o novo armazenamento somente após validação.
- Manter uma janela de recuperação sem gravações no sistema antigo; remover a dependência do Lovable Cloud apenas após a conferência final.

## 7. Estados de falha e recuperação

- Mostrar aviso claro se o Drive estiver indisponível ou a conexão for revogada.
- Bloquear gravações quando não for possível confirmar a versão mais recente, evitando perda silenciosa.
- Oferecer reconexão administrativa sem apagar arquivos.
- Fazer backup versionado diário dos arquivos críticos dentro da própria conta e permitir exportação manual compactada.

## 8. Validação

- Confirmar login Google de administrador e usuário comum.
- Verificar isolamento, papéis, suspensão, sessões e histórico de acessos.
- Executar os fluxos completos de Carteira, venda, proventos, Simulador, filtros, IA e ajustes.
- Simular duas abas gravando o mesmo dado e confirmar tratamento de conflito.
- Simular Drive indisponível, permissão revogada, arquivo corrompido e cache vencido.
- Conferir desktop, smartphone e tablet, além da compilação e erros de execução.

## Limitações aceitas

- O Drive não é um banco transacional; algumas operações serão mais lentas e exigirão controle explícito de concorrência.
- “Usuários online” terá atualização periódica, não presença instantânea garantida.
- Tarefas automáticas dependem do servidor publicado estar operacional; o Drive sozinho não executa rotinas.
- Uma única conta central cria um ponto único de falha e de capacidade. Revogar ou perder acesso a ela interrompe o app.

## Pré-requisitos

1. Conectar a conta **[evenos.jacoborges@gmail.com](mailto:evenos.jacoborges@gmail.com)** no cartão do Google Drive que será aberto durante a implementação.
2. Configurar credenciais OAuth do Google para o novo **Entrar com Google** sem usar a autenticação do Lovable Cloud.
3. Reativar temporariamente o Lovable Cloud apenas para exportar os dados atuais; sem isso, a migração preservará somente os dados acessíveis no código ou no navegador.