# Organização dos ativos
- [x] Compartilhar as seis opções de organização nas cotações, Inteligência de Proventos, Carteira e Simulador, preservando posições ativas primeiro.
- [x] Testar os critérios e verificar a seleção nas telas autenticadas.

# Carteira: vendas e histórico
- [x] Adicionar régua mensal de vendas, limite configurável na conta, alertas e estimativa fiscal; 29 testes passaram e fluxo autenticado validou persistência, vendas existentes e alerta, com limite restaurado a R$ 20 mil.
- [x] Garantir resultados e proventos de posições encerradas na linha do tempo e verificar com testes e Carteira autenticada.
- [x] Registrar vendas com validação de saldo e apurar resultado realizado.
- [x] Preservar compras, vendas e eventos oficiais do período, incluindo posições encerradas.
- [x] Ajustar proventos por posição na Data Com e esmaecer ativos encerrados.
- [x] Testar cálculos e validar o fluxo autenticado de compra, venda e histórico.

# Simulador: fechamento automático
- [x] Buscar fechamento histórico para compras sem preço manual e exibir falhas sem gravar preço incorreto.
- [x] Testar prioridade manual e fechamento por data; validar compra autenticada.

# Atualização manual de cotações
- [x] Adicionar Atualizar na tela principal e buscar carteiras antes dos ativos filtrados, sem o limite total do polling.
- [x] Propagar preços pelo cache compartilhado e testar prioridade e cobertura dos lotes.
- [x] Validar o botão na tela principal autenticada e navegação para a Carteira.
- [ ] Confirmar novas cotações e sincronização real: bloqueado pela resposta da brapi de token inválido ou sem permissão.
# Dados macro e novas fontes
- [x] Corrigir importação travada, preencher indicadores oficiais e validar atualização e histórico na página autenticada (24 séries preenchidas; risco-país disponível na fonte até julho/2024).
- [x] Catálogo e histórico macro (Banco Central SGS, Focus, Ipeadata) no banco e página Dados Macroeconômicos.
- [x] Selic, risco-país e Focus alimentando FCD e DDM/Gordon.
- [x] Confirmar importação das séries SGS com dados salvos e gráficos na página autenticada.
- [ ] Yahoo/COTAHIST como fonte paralela de cotações e Fundamentus como cruzamento de fundamentos (próxima etapa).
- [ ] Atualização diária agendada (hoje atualiza ao abrir a página quando os dados têm mais de 12h).
# Grupos na Inteligência de proventos
- [x] Marcador de grupos à esquerda do ticker em cada linha da Inteligência de proventos, com popover para associar/criar grupos e persistência na conta.

# Cabeçalho compartilhado das listas
- [x] Fixar Ticker e Preço na lista principal com rolagem lateral sincronizada; verificado em celular vertical/horizontal, tablet e desktop, incluindo última coluna, novos setores e arrasto.
- [x] Fixar o cabeçalho da lista principal durante a rolagem.
- [x] Adicionar seleção de todos os indicadores fundamentalistas sem repetições e compartilhar a configuração nas demais listas de ativos.
- [x] Testar seleção, persistência, cabeçalho fixo e navegação entre listas (Carteira e Simulador preenchidos, seleção preservada após recarregar, celular sem ultrapassar margens).
