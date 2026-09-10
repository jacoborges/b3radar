# Dicas ao passar o mouse nos ícones do app

Objetivo: tornar o app auto-explicativo. Ao passar o cursor sobre qualquer ícone de função, aparece um pequeno balão dizendo **o que aquela função faz** e **como usar**.

## O que muda para o usuário

- Todo botão de ícone passa a mostrar um balão com duas linhas: nome da função (em destaque) e uma frase curta de "como usar".
- No celular/tablet (sem mouse), o mesmo texto aparece ao tocar e segurar o ícone.
- O balão usa o mesmo visual escuro do app (fundo cinza escuro, texto claro), igual ao já usado na linha do tempo da Carteira.
- Os balões atuais nativos do navegador (que demoram a aparecer e são cinza claro do sistema) são substituídos por esses.

## Onde os balões vão aparecer

- **Cabeçalho / navegação**: Carteira, Simulador de Carteira, Proventos, Configurações, Usuários, Sair, selo de usuários online, botão de filtros, botão de atualizar cotações, voltar.
- **Carteira e Simulador**: criar carteira, renomear, excluir, salvar, cancelar, editar lançamento, excluir lançamento, editar/excluir venda, expandir "Próximos proventos a receber", meses da linha do tempo.
- **Detalhe do ativo**: botão "?" de análise de mercado (IA), ícone de histórico de 10 anos, botão de atualizar dados, abas e cartões (Preço Teto, Preço Teto Projetivo, Valuation FCD, DDM, Sensibilidade macro, Semáforo de endividamento).
- **Comparar setor / Comparar ativo**: atualizar comparação, ordenar colunas, limite de ativos.
- **Filtros**: limpar filtros, aplicar, réguas de mínimo/máximo, luzes do semáforo.

Os "?" já existentes ao lado dos indicadores continuam como estão (clique abre a explicação fundamentalista/técnica) — apenas ganham o balão de hover com "clique para ver a explicação".

## Detalhes técnicos

- Novo componente `src/components/ActionTip.tsx`: envolve qualquer filho em `Tooltip`/`TooltipTrigger`/`TooltipContent` (shadcn, já presente em `src/components/ui/tooltip.tsx`), recebendo `label` e `how`. Conteúdo estilizado com tokens (`bg-card`, `text-card-foreground`, `border-border/60`), `max-w-[min(18rem,calc(100vw-2rem))]`, `delayDuration` curto (~200 ms).
- Suporte a toque: no `TooltipTrigger` adicionar handlers de `onFocus`/`onPointerDown` para abrir em dispositivos sem hover (estado controlado interno), fechando ao tocar fora.
- `TooltipProvider` montado uma única vez em `src/routes/__root.tsx` (verificar se já existe; caso exista em páginas isoladas, consolidar na raiz).
- Novo mapa central `src/lib/action-tips.ts`: `Record<string, { label: string; how: string }>` com os textos de todas as funções listadas acima, para manter a redação consistente e facilitar revisão.
- Substituir os atributos `title="..."` dos botões de ícone por `<ActionTip tip="chave">`, mantendo `aria-label` para acessibilidade. Arquivos tocados: `AccountControls.tsx`, `routes/_authenticated/index.tsx`, `carteira.tsx`, `simulador.tsx`, `dividendos.tsx`, `configuracoes.tsx`, `usuarios.tsx`, `StockDetailModal.tsx`, `StockFilterSheet.tsx`, `PortfolioProventos.tsx`, `PortfolioTimeline.tsx`, `SectorCompare.tsx`, `AssetCompare.tsx`, `IndicatorHistoryDialog.tsx`, `MarketAnalysisDialog.tsx`, `InfoTip.tsx`.
- Apenas apresentação: sem mudanças de dados, banco, cache ou lógica de cálculo.
