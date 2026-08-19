# Responsividade: margens e pop-ups dentro da tela

Objetivo: em celular na vertical, celular na horizontal e tablet, o conteúdo nunca ultrapassa as margens da tela; caixas e pop-ups longos rolam verticalmente dentro do limite visível.

## O que muda para o usuário

1. **Margens seguras em qualquer aparelho**
   - Padding lateral progressivo em todas as páginas (Cotações, Carteira, Dividendos, Configurações, Usuários): mais estreito no celular, maior no tablet e no desktop, sempre respeitando o recorte da tela (notch/bordas arredondadas).
   - Nada de rolagem horizontal na página: tabelas largas continuam com rolagem própria dentro do seu bloco, sem empurrar a página.

2. **Pop-ups e janelas sempre dentro da tela**
   - Todo diálogo (detalhe do ativo, histórico do indicador, análise de mercado, confirmações) passa a ocupar no máximo a altura visível, com rolagem interna contínua e cabeçalho fixo; em celular ele ocupa quase toda a largura com margem lateral garantida.
   - Explicações em bolha (botões "?") deixam de ter largura fixa de 320 px: passam a caber na largura da tela, com rolagem interna quando o texto é longo.
   - Painel de filtros: largura total no celular, largura confortável no tablet, com rolagem vertical e o botão de aplicar sempre acessível.

3. **Celular deitado (horizontal)**
   - Como a altura fica pequena, os diálogos usam quase toda a altura disponível e rolam por dentro, sem cortar o rodapé.
   - O gráfico do TradingView no detalhe do ativo reduz a altura nesse modo para não empurrar todo o resto para fora da tela.

4. **Tablet / iPad**
   - Margens laterais respeitadas nas duas orientações; a lista de ativos usa a versão em tabela apenas quando há largura suficiente, caindo para os cartões quando não há.

## Detalhes técnicos

- `src/styles.css`: utilitários `.page-shell` (largura máxima + `px-3 sm:px-6 lg:px-8` + `overflow-x-clip`) e suporte a `env(safe-area-inset-*)` no `body`; `viewport-fit=cover` no meta viewport em `src/routes/__root.tsx`.
- `src/components/ui/dialog.tsx`: `DialogContent` passa a `w-[calc(100vw-1.5rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-4 sm:p-6`; uso de `dvh` em vez de `vh` para não cortar com a barra do navegador móvel.
- `src/components/ui/sheet.tsx`: laterais com `w-full sm:max-w-md` e `overflow-y-auto`.
- `src/components/ui/popover.tsx`: `w-[min(20rem,calc(100vw-1.5rem))] max-h-[70dvh] overflow-y-auto`; `InfoTip` deixa de fixar `w-80`.
- Ajustes pontuais de classe em `StockDetailModal.tsx` (altura do gráfico com `max-h-[45dvh]` em landscape via `landscape:`/`sm:`), `IndicatorHistoryDialog.tsx`, `MarketAnalysisDialog.tsx`, `ValuationPanel.tsx` (matriz de sensibilidade e tabelas em wrapper `overflow-x-auto`), `StockFilterSheet.tsx`.
- Páginas em `src/routes/_authenticated/*` trocam os wrappers `mx-auto max-w-... px-4` pelo utilitário comum, mantendo os limites de largura atuais.
- Apenas CSS/classes de apresentação — sem mudanças de dados, banco ou lógica de negócio.
