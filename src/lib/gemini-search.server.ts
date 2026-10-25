/** Consulta ao Google Gemini via Lovable AI Gateway (mesmas diretrizes do Preço Teto Projetivo). */
export async function geminiSearch(systemPrompt: string, userPrompt: string, tag: string): Promise<{ text: string | null; citations: string[]; error: string | null }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { text: null, citations: [], error: "IA não configurada no projeto." };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: `${systemPrompt}\n\nFONTES PERMITIDAS: site de Relações com Investidores (RI) da empresa, CVM, B3 e relatórios de casas de análise (BTG Pactual Research, XP, Itaú BBA, Santander, Bradesco BBI, Genial, Safra). Não use fóruns, redes sociais nem blogs. Nunca invente números. Se não encontrar, diga "sem dado nas fontes permitidas". Termine com uma seção "Fontes" listando nome e URL completa de cada referência citada, na ordem dos marcadores [1], [2]...` },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });
  if (res.status === 429) return { text: null, citations: [], error: "Limite momentâneo da IA atingido. Tente de novo em instantes." };
  if (res.status === 402) return { text: null, citations: [], error: "Créditos de IA esgotados no workspace." };
  if (!res.ok) {
    console.error(`[${tag}] http`, res.status, await res.text());
    return { text: null, citations: [], error: `Falha na IA (HTTP ${res.status}).` };
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  const text = json.choices?.[0]?.message?.content?.trim() || null;
  if (!text) return { text: null, citations: [], error: json.error?.message ?? "Resposta vazia da IA." };
  const citations = Array.from(new Set((text.match(/https?:\/\/[^\s)\]>]+/g) ?? []).map((u) => u.replace(/[.,;]+$/, "")))).slice(0, 10);
  return { text, citations, error: null };
}
