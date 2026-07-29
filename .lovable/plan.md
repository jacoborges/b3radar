## Objetivo
Aplicar a Inteligência de Proventos a **todas** as ações listadas (~1.000 tickers), não apenas aos 350 mais líquidos.

## Por que hoje está limitado
Cada ticker exige ~8 chamadas à B3 (1 para resolver o nome de negociação, 6 anos do *supplement*, 1 do histórico de caixa). Para 1.000 ativos isso são ~8.000 requisições, hoje feitas ao vivo com cache apenas em memória do servidor — que se perde a cada reinício. Por isso o limite de 350.

## Solução: cache persistente no Lovable Cloud

### 1. Ativar o Lovable Cloud e criar a tabela de proventos
Uma tabela `dividend_events_cache` com uma linha por ticker, guardando:
- `ticker`, `trading_name`, `historico` (JSON dos eventos), `provisionados` (JSON), `fonte`, `error`, `fetched_at`.
- Leitura pública (somente SELECT para visitantes), escrita apenas pelo servidor.

### 2. Servir a página a partir do banco
`/dividendos` passa a ler a tabela inteira em uma única consulta — abre instantaneamente, com **todos** os ativos, sem depender da B3 no momento da abertura.
- A tela mostra, por ativo, a data da última atualização e "Aguardando coleta" para quem ainda não foi buscado.
- Cabeçalho com "X de Y ativos com dados da B3".

### 3. Coletor incremental em segundo plano
Uma rota de servidor (`/api/public/refresh-proventos`) que, a cada chamada, pega os N tickers mais desatualizados (ou nunca coletados), busca na B3 com concorrência controlada e grava no banco.
- Protegida por um segredo, para não virar endpoint aberto.
- Chamada automaticamente pelo próprio app quando a página abre (em background, sem travar a tela) e pode ser agendada para rodar sozinha diariamente.
- Prioriza os ativos por liquidez: os mais negociados são preenchidos primeiro, depois a cauda longa.

### 4. Deduplicação por empresa
Vários tickers pertencem à mesma empresa (ex.: PETR3/PETR4). A coleta passa a agrupar por empresa emissora, reduzindo as chamadas à B3 em cerca de 30–40%.

### 5. Ajustes na UI
- Remover o texto "top 350 por liquidez"; passar a "todos os ativos".
- Filtro opcional para esconder ativos ainda sem cobertura.
- Indicador de progresso da primeira carga ("coletando… 420/994").

## Impacto
O painel dentro do modal de cada ação continua funcionando: passa a ler primeiro do cache e só chama a B3 se o ativo ainda não tiver sido coletado.

## Detalhes técnicos
- Novos: migração da tabela + `src/routes/api/public/refresh-proventos.ts` + funções de leitura/escrita do cache.
- Alterados: `src/lib/proventos.server.ts` (persistência e agrupamento por empresa), `src/lib/proventos.functions.ts`, `src/hooks/use-dividend-batch.ts`, `src/routes/dividendos.tsx`.
- Sem novas dependências externas.
