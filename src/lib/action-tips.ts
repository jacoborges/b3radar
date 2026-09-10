/**
 * Textos das dicas exibidas ao passar o mouse (ou tocar) nos ícones de função.
 * Mantidos em um único mapa para garantir redação consistente em todo o app.
 */
export interface ActionTipText {
  /** Nome da função. */
  label: string;
  /** Como usar, em uma frase curta. */
  how: string;
}

export const ACTION_TIPS = {
  // ---- Navegação / cabeçalho ----
  carteira: {
    label: "Carteira",
    how: "Registre suas compras e vendas reais e acompanhe lucro, prejuízo e proventos recebidos.",
  },
  simulador: {
    label: "Simulador de carteira",
    how: "Monte carteiras de teste e compare o rendimento de ativos ou de um setor inteiro.",
  },
  dividendos: {
    label: "Proventos",
    how: "Veja a inteligência de dividendos e JCP de todos os ativos, com filtros por classe e valor.",
  },
  configuracoes: {
    label: "Configurações",
    how: "Ajuste o divisor do Preço Teto (Bazin), a liquidez mínima e o token de dados.",
  },
  usuarios: {
    label: "Usuários",
    how: "Painel de administração: convide pessoas e defina o nível de acesso de cada uma.",
  },
  sair: {
    label: "Sair da conta",
    how: "Encerra a sessão neste aparelho e volta para a tela de entrada.",
  },
  online: {
    label: "Usuários online",
    how: "Quantas pessoas estão com o app aberto agora. Passe o mouse para ver quem está conectado.",
  },
  voltar: {
    label: "Voltar",
    how: "Retorna para a lista de cotações.",
  },

  // ---- Lista de cotações ----
  filtros: {
    label: "Filtros",
    how: "Abra para selecionar ativos por indicador, semáforo, yield, preço teto e liquidez.",
  },
  atualizarCotacoes: {
    label: "Atualizar preços",
    how: "Os preços se atualizam sozinhos; clique para buscar as cotações agora mesmo.",
  },
  atualizarDados: {
    label: "Atualizar dados",
    how: "Busca novamente fundamentos, proventos e análises deste ativo, ignorando o que está salvo.",
  },
  ordenar: {
    label: "Ordenar",
    how: "Clique no título da coluna para ordenar do maior para o menor e vice-versa.",
  },

  // ---- Detalhe do ativo ----
  analiseMercado: {
    label: "Análise do mercado (IA)",
    how: "Abre um resumo do negócio, sua perenidade e o termômetro de compra, neutro ou venda.",
  },
  historicoIndicador: {
    label: "Histórico de 10 anos",
    how: "Abre o gráfico ano a ano deste indicador, com a fonte dos dados.",
  },
  explicacaoIndicador: {
    label: "O que é este indicador",
    how: "Clique para ver o significado na análise fundamentalista e na análise técnica.",
  },
  explicacaoClasses: {
    label: "Classes de proventos",
    how: "Clique para entender Elite, Consistente, Regular, Irregular e Sem cobertura.",
  },

  // ---- Carteira / Simulador ----
  criarCarteira: {
    label: "Nova carteira",
    how: "Digite um nome e confirme para criar outra carteira separada.",
  },
  renomear: {
    label: "Renomear",
    how: "Altera o nome desta carteira.",
  },
  excluirCarteira: {
    label: "Excluir carteira",
    how: "Remove a carteira e todos os lançamentos dentro dela.",
  },
  salvar: {
    label: "Salvar",
    how: "Confirma a alteração feita.",
  },
  cancelar: {
    label: "Cancelar",
    how: "Descarta a alteração e mantém como estava.",
  },
  editarLancamento: {
    label: "Editar compra",
    how: "Corrija a data, a quantidade ou o preço pago neste lançamento.",
  },
  excluirLancamento: {
    label: "Excluir compra",
    how: "Remove este lançamento da carteira.",
  },
  editarVenda: {
    label: "Editar venda",
    how: "Corrija a data, a quantidade ou o preço de venda.",
  },
  excluirVenda: {
    label: "Excluir venda",
    how: "Remove esta venda e devolve a quantidade à posição.",
  },
  proximosProventos: {
    label: "Próximos proventos a receber",
    how: "Clique para abrir a lista de dividendos e JCP já anunciados para seus ativos.",
  },
  linhaTempo: {
    label: "Resultado do mês",
    how: "Passe o mouse sobre o mês para ver compras, vendas e proventos do período.",
  },

  // ---- Comparações ----
  atualizarComparacao: {
    label: "Atualizar comparação",
    how: "Refaz a busca de preços e proventos deste setor em vez de usar o resultado salvo.",
  },
  limiteAtivos: {
    label: "Quantidade de ativos",
    how: "Deixe vazio para comparar todos ou informe um número para ver só os mais líquidos.",
  },
} as const satisfies Record<string, ActionTipText>;

export type ActionTipKey = keyof typeof ACTION_TIPS;
