# Carteira: vendas e histórico
- [ ] Garantir resultados e proventos de posições encerradas na linha do tempo e verificar com testes e Carteira autenticada.
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