CREATE TABLE public.macro_series (
  code text PRIMARY KEY,
  source text NOT NULL,
  source_id text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT '',
  frequency text NOT NULL DEFAULT 'mensal',
  category text NOT NULL DEFAULT 'Outros',
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 100,
  last_value numeric,
  last_date date,
  updated_at timestamptz
);
GRANT SELECT ON public.macro_series TO authenticated;
GRANT ALL ON public.macro_series TO service_role;
ALTER TABLE public.macro_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios leem series macro" ON public.macro_series FOR SELECT TO authenticated USING (true);

CREATE TABLE public.macro_observations (
  series_code text NOT NULL REFERENCES public.macro_series(code) ON DELETE CASCADE,
  date date NOT NULL,
  value numeric NOT NULL,
  PRIMARY KEY (series_code, date)
);
GRANT SELECT ON public.macro_observations TO authenticated;
GRANT ALL ON public.macro_observations TO service_role;
ALTER TABLE public.macro_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios leem observacoes macro" ON public.macro_observations FOR SELECT TO authenticated USING (true);

INSERT INTO public.macro_series (code, source, source_id, name, unit, frequency, category, description, sort_order) VALUES
('selic_meta','sgs','432','Selic meta','% a.a.','diária','Juros','Taxa básica de juros definida pelo Copom. Referência da renda fixa e da taxa livre de risco nos valuations.',1),
('selic_diaria','sgs','11','Selic efetiva diária','% a.d.','diária','Juros','Taxa efetivamente praticada nas operações compromissadas com títulos públicos.',2),
('cdi','sgs','4389','CDI anualizado','% a.a.','diária','Juros','Taxa dos empréstimos entre bancos; benchmark de fundos e CDBs.',3),
('ipca_mensal','sgs','433','IPCA mensal','% a.m.','mensal','Inflação','Inflação oficial do país, medida pelo IBGE.',10),
('ipca_12m','sgs','13522','IPCA acumulado 12 meses','%','mensal','Inflação','Inflação oficial acumulada nos últimos 12 meses; comparar com a meta.',11),
('igpm','sgs','189','IGP-M mensal','% a.m.','mensal','Inflação','Índice da FGV usado em aluguéis e contratos; sensível a câmbio e commodities.',12),
('inpc','sgs','188','INPC mensal','% a.m.','mensal','Inflação','Inflação para famílias de menor renda; corrige salários e benefícios.',13),
('dolar_venda','sgs','1','Dólar PTAX venda','R$','diária','Câmbio','Cotação oficial do dólar. Afeta exportadoras (positivo) e importadoras/endividadas em dólar (negativo).',20),
('dolar_compra','sgs','10813','Dólar PTAX compra','R$','diária','Câmbio','Cotação oficial de compra do dólar.',21),
('euro_venda','sgs','21619','Euro venda','R$','diária','Câmbio','Cotação oficial do euro.',22),
('pib_mensal','sgs','4380','PIB mensal (valores correntes)','R$ milhões','mensal','Atividade','Estimativa mensal do PIB; mostra o ritmo da economia.',30),
('desemprego','sgs','24369','Taxa de desocupação (PNAD)','%','mensal','Atividade','Percentual de pessoas procurando emprego; afeta consumo e varejo.',31),
('inadimplencia_total','sgs','21082','Inadimplência total','%','mensal','Crédito','Percentual da carteira de crédito com atraso acima de 90 dias. Chave para bancos.',40),
('inadimplencia_pj','sgs','21083','Inadimplência pessoa jurídica','%','mensal','Crédito','Atrasos acima de 90 dias nas empresas.',41),
('inadimplencia_pf','sgs','21084','Inadimplência pessoa física','%','mensal','Crédito','Atrasos acima de 90 dias nas famílias.',42),
('credito_pib','sgs','20622','Crédito / PIB','% do PIB','mensal','Crédito','Tamanho do crédito em relação à economia.',43),
('divida_bruta_pib','sgs','13762','Dívida bruta do governo / PIB','% do PIB','mensal','Fiscal','Endividamento do governo; quanto maior, maior o risco fiscal e os juros.',50),
('resultado_primario','sgs','5793','Resultado primário 12m (NFSP)','% do PIB','mensal','Fiscal','Necessidade de financiamento do setor público sem juros; positivo indica déficit.',51),
('reservas','sgs','3546','Reservas internacionais','US$ milhões','mensal','Setor externo','Colchão de dólares do país contra choques externos.',60),
('risco_pais','ipea','JPM366_EMBI366','Risco-país (EMBI+ Brasil)','pontos-base','diária','Risco','Prêmio exigido por investidores para títulos brasileiros sobre os americanos. 100 pb = 1% a.a. Usado no custo de capital.',70),
('focus_ipca','focus','IPCA','Focus: IPCA esperado (próximo ano)','%','semanal','Expectativas','Mediana das projeções do mercado para a inflação do próximo ano.',80),
('focus_selic','focus','Selic','Focus: Selic esperada (fim do próximo ano)','% a.a.','semanal','Expectativas','Mediana das projeções para a Selic no fim do próximo ano.',81),
('focus_pib','focus','PIB Total','Focus: PIB esperado (próximo ano)','%','semanal','Expectativas','Crescimento real esperado para o PIB do próximo ano.',82),
('focus_cambio','focus','Câmbio','Focus: Dólar esperado (fim do próximo ano)','R$','semanal','Expectativas','Projeção do mercado para o dólar no fim do próximo ano.',83);