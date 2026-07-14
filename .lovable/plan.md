# Análise IA de Proventos via Gemini (grátis, chave própria)

Adicionar botão **"Analisar com IA"** no painel Inteligência de Proventos, chamando a API do Google Gemini diretamente com a sua chave — sem passar pelo Lovable AI Gateway, sem consumir créditos Lovable.

## Fluxo do usuário

1. Você cria a chave gratuita em `https://aistudio.google.com/apikey` (leva 1 minuto, precisa só de conta Google).
2. Cola no formulário seguro que o app abrir. Fica salva como `GEMINI_API_KEY` nos secrets do projeto.
3. No modal de qualquer ativo, seção Inteligência de Proventos, aparece o botão **"Analisar com IA"**.
4. Clica → server function chama Gemini → resposta em markdown aparece abaixo.
5. Se você não configurou a chave ainda, o botão explica onde pegar e leva pra tela de configurações.

## O que a IA vai retornar

Duas seções curtas em markdown, geradas a partir do prompt + histórico real da B3 que enviamos:

- **Política de dividendos** — frequência declarada, payout alvo, padrão histórico recente.
- **Próximos eventos anunciados no RI** — dividendos/JCP aprovados e ainda não pagos, quando o modelo conhecer.

Rodapé fixo: *"Gerado por IA a partir de dados públicos. Confirme no RI oficial antes de decidir."*

Modelo: `gemini-2.5-flash` (grátis, rápido, contexto grande). Endpoint REST direto:
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=...`

## Cache 24h (em memória)

- Server function mantém um `Map<ticker, {content, ts}>` no módulo.
- Se `Date.now() - ts < 24h`, devolve do cache. Senão, chama Gemini, salva, devolve.
- Simples, zero setup, sem banco. Reset quando o worker recicla (aceitável — pior caso é uma chamada extra à API do Google, que é grátis).

## Erros tratados

- Chave ausente → mensagem clara com link para `/configuracoes`.
- 429 do Google (limite diário estourou) → "Limite gratuito do Gemini atingido, tente novamente mais tarde."
- Timeout/rede → "Não foi possível gerar a análise agora."

## Arquivos

- `src/lib/dividend-ai.functions.ts` — nova server function `analyzeDividendsWithGemini` (POST, valida ticker + recebe contexto já calculado localmente, monta prompt PT-BR, chama Gemini REST, cacheia 24h).
- `src/components/DividendIntelligencePanel.tsx` — botão "Analisar com IA", estado loading/erro, render markdown (usa `react-markdown`; se não estiver instalado, adicionar).
- `src/routes/configuracoes.tsx` — adicionar seção "Chave Gemini (opcional)" com link para o AI Studio e botão para salvar via `add_secret`.
- `package.json` — adicionar `react-markdown` se ausente.

Nenhum arquivo existente é reescrito além dessas adições pontuais. Sem alterações no schema de dados, sem Lovable Cloud, sem custo de créditos.

## Fora do escopo

- Não vamos scrapear sites de RI de cada empresa (formato diferente por empresa, quebra fácil).
- Não vamos ativar Lovable Cloud nem persistir análises em banco.
- Análise permanece sob demanda por ativo — sem rodar em massa para os 950+ tickers.
