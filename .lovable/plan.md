## Camada 1 — Semáforo de Consenso de Analistas (Yahoo Finance, grátis)

Novo botão "Consenso" no header e rota `/consenso` com ranking baseado nas recomendações agregadas das principais casas (BTG, XP, Itaú BBA, JP Morgan, Morgan Stanley, Goldman, Bradesco BBI etc.) via Yahoo Finance/Refinitiv.

### Fonte de dados

**Yahoo Finance** — endpoint público sem token:
`https://query2.finance.yahoo.com/v10/finance/quoteSummary/{TICKER}.SA?modules=recommendationTrend,financialData`

- Chamada server-side (server fn) com User-Agent de browser real.
- Retorna `recommendationTrend.trend[]` — contagens dos últimos 4 períodos mensais: `strongBuy`, `buy`, `hold`, `sell`, `strongSell`.
- Também traz `financialData.recommendationKey` e `recommendationMean` (score consolidado atual da Yahoo).

### "Tempo real" — o que isso significa aqui

Recomendações de analistas **não mudam a cada segundo** — casas revisam ratings quando saem resultados, guidance ou eventos relevantes (frequência típica: semanal a mensal por papel). O Yahoo agrega e republica em tempo quase real conforme as casas emitem.

Estratégia de frescor:
- **Server fn sem cache HTTP** (`cache-control: no-store`) → sempre bate no Yahoo.
- **TanStack Query no cliente** com `staleTime: 5 min` + `refetchInterval: 5 min` → atualiza sozinho a cada 5 min enquanto a aba `/consenso` está aberta.
- Botão "Atualizar agora" no header da rota força `refetch` imediato.
- Timestamp visível: "Atualizado há X segundos".

Sem cache HTTP + ~990 tickers = risco de rate limit. Mitigações:
- Lotes de 8 tickers em paralelo, 300ms entre lotes.
- Só carrega tickers do setor filtrado (default: mostrar top 50 por liquidez até o usuário filtrar).
- Fallback silencioso: 429/5xx marcam ticker como "atualização pendente" sem quebrar o grid.

### Lógica do semáforo

Agrega os 4 últimos períodos mensais retornados pelo Yahoo (≈ últimos 4 meses, janela mais recente disponível — Yahoo não expõe histórico de 24m por esse endpoint; assumimos os dados mais atuais como o retrato do consenso).

`score = (5×SB + 4×B + 3×H + 2×S + 1×SS) / total`

| Rating | Faixa | Cor |
|---|---|---|
| Compra Forte | score ≥ 4.3 | verde intenso |
| Compra | 3.5 ≤ score < 4.3 | verde |
| Neutro | 2.5 ≤ score < 3.5 | amarelo |
| Venda | 1.7 ≤ score < 2.5 | laranja |
| Venda Forte | score < 1.7 | vermelho |

Extras exibidos: total de casas, distribuição em barra empilhada (SB/B/H/S/SS), seta de tendência (último mês vs. média dos 3 anteriores).

### Arquivos

**Novos:**
- `src/lib/consensus.functions.ts` — server fns:
  - `getAnalystConsensus(ticker)`: fetch Yahoo, normaliza, calcula score/rating/tendência. Timeout 8s. `no-store`.
  - `getConsensusBatch(tickers[])`: processa em lotes de 8 com 300ms, retorna `Record<ticker, ConsensusData | { available: false, reason }>`.
- `src/lib/consensus-rating.ts` — helpers puros client-safe: `scoreToRating(score)`, cores (tokens semânticos existentes: `success`, `warning`, `danger`), labels PT-BR, formatação.
- `src/hooks/use-consensus.ts` — `useAnalystConsensus(ticker)` (single, usado no modal, staleTime 5min) e `useConsensusBatch(tickers)` (batch, refetchInterval 5min, usado na rota).
- `src/routes/consenso.tsx` — rota dedicada:
  - `head()` próprio (title, description, og).
  - Cabeçalho: título, disclaimer breve, badge "Atualizado há Xs", botão "Atualizar agora".
  - Filtros: chips por rating (Compra Forte / Compra / Neutro / Venda / Venda Forte), select de setor.
  - Grid responsivo (mesmo padrão de `/`): cards com ticker, nome, setor, badge grande colorido do rating, score numérico, nº de casas, barra empilhada da distribuição, seta de tendência.
  - Ordenação default: score desc.
  - Loading progressivo (mostra tickers já retornados enquanto lotes seguintes carregam).
  - Clique no card abre `StockDetailModal`.
  - Disclaimer no rodapé: "Consenso agregado via Yahoo Finance/Refinitiv. Conteúdo educacional, não é recomendação de investimento."

**Editar:**
- `src/routes/index.tsx` — botão `<Link to="/consenso">` no header com ícone `Gauge`, ao lado de "Configurações".
- `src/components/StockDetailModal.tsx` — nova seção "Consenso de analistas" após "Provisionamento": semáforo grande com score/rating, distribuição empilhada, mini-tabela com as leituras mensais brutas retornadas pelo Yahoo. Usa `useAnalystConsensus(ticker)` on-demand.

### Limitações honestas

- Tickers `.SA` cobrem ações; units (final 11), FIIs e BDRs frequentemente retornam vazio no Yahoo — tratados como "sem cobertura".
- Endpoint Yahoo é não-oficial; se mudar, a rota degrada graciosamente para estado vazio.
- Rate limit do Yahoo é por IP do Worker; se houver bloqueio pontual, TanStack Query faz retry automático no próximo ciclo de 5 min.

### Fora do escopo

- Carteiras CVM/ANBIMA (Camada 2).
- Alertas de mudança de rating.
- Histórico maior que os 4 períodos que o Yahoo devolve.