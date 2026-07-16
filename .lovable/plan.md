
# Análise de proventos via Perplexity (busca real em RI/CVM/B3)

Sim, dá pra fazer. A Perplexity está disponível como **connector padrão do Lovable** — ela faz busca web em tempo real e retorna resposta com citações. Diferente do Gemini (que só usa o conhecimento do treinamento), a Perplexity de fato consulta as páginas de RI da empresa, portal da CVM e site da B3 na hora da pergunta.

## Como vai funcionar pro usuário

No painel **Inteligência de Proventos** (dentro do modal de cada ativo), além do botão "Analisar com IA" (Gemini) que já existe, entra um segundo botão: **"Buscar no RI/CVM/B3 (Perplexity)"**.

Ao clicar:
1. Server function chama a Perplexity com `search_domain_filter` restrito a fontes oficiais.
2. Resposta em markdown aparece abaixo, com **lista de fontes clicáveis** (RI da empresa, CVM, B3, fatos relevantes).
3. Cache de 24h em memória por ticker (mesmo padrão do Gemini já implementado).

## O que a Perplexity vai retornar

Três seções curtas, geradas a partir do prompt + histórico real da B3 que já calculamos localmente:

- **Política de dividendos oficial** — o que consta no site de RI da empresa (frequência, payout mínimo estatutário).
- **Eventos aprovados e pendentes** — dividendos/JCP declarados em fato relevante, com Data COM, Data EX, valor por ação e data de pagamento, extraídos das fontes oficiais.
- **Fontes consultadas** — links diretos (RI, CVM, B3) para o usuário validar.

Rodapé fixo: *"Dados extraídos por IA de fontes públicas. Confirme no RI oficial antes de operar."*

## Configuração da chave

Perplexity é um connector — o usuário clica em **conectar** uma vez (não precisa gerar chave manual, não precisa pagar cartão pra testar; Perplexity oferece créditos iniciais). A chave vira `PERPLEXITY_API_KEY` no ambiente do servidor automaticamente.

Se a chave/conexão não estiver linkada, o botão mostra mensagem clara: "Conecte a Perplexity nas configurações do projeto".

## Detalhes técnicos

- **Modelo**: `sonar` (rápido, barato, tem busca web nativa). `sonar-pro` opcional se a resposta ficar rasa.
- **Filtros de busca**: `search_domain_filter` com sites do RI conhecidos + `ri.` + `cvm.gov.br` + `b3.com.br` + `-reddit.com`, `-twitter.com`.
- **Recency**: `search_recency_filter: 'month'` pra priorizar fatos relevantes recentes.
- **Endpoint**: `https://api.perplexity.ai/chat/completions` (chamada REST direta do servidor, mesma abordagem do Gemini).
- **Erros tratados**:
  - `401 insufficient_quota` → "Créditos Perplexity esgotados. Adicione crédito em console.perplexity.ai."
  - `429` → "Limite momentâneo, tente em alguns segundos."
  - Sem chave → CTA pra conectar.

## Arquivos

- `src/lib/dividend-ai.functions.ts` — adicionar nova server function `analyzeDividendsWithPerplexity` ao lado da já existente `analyzeDividendsWithGemini`. Cache separado (`Map` próprio, TTL 24h).
- `src/components/DividendIntelligencePanel.tsx` — segundo botão "Buscar no RI/CVM/B3", com seu próprio estado loading/erro e render markdown + lista de citações.
- Connector Perplexity — linkado via ferramenta de connectors (não é edição de código; roda no momento da implementação).

Nenhum arquivo existente é reescrito além dessas adições pontuais. O botão Gemini atual continua funcionando; os dois convivem — Gemini é offline/instantâneo, Perplexity é online/com fontes.

## Fora do escopo

- Não vamos rodar Perplexity em massa nos 994 tickers (custo e rate limit — Perplexity é paga por chamada após os créditos gratuitos).
- Não vamos persistir análises em banco (cache em memória já basta).
- Não vamos substituir o botão Gemini — ficam os dois.
