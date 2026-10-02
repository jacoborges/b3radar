import { createFileRoute } from "@tanstack/react-router";
import snapshot from "@/lib/stocks-fundamentus.json";

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Coletor incremental de proventos. Chamado por agendamento (pg_cron).
 * Processa os ativos mais desatualizados a cada execução.
 */
export const Route = createFileRoute("/api/public/refresh-proventos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let limit = 60;
        try {
          const body = (await request.json()) as { limit?: number };
          if (typeof body?.limit === "number") {
            limit = Math.max(1, Math.min(150, Math.round(body.limit)));
          }
        } catch {
          /* corpo vazio é válido */
        }

        const universe = (snapshot as Array<{ t: string; lq: number }>)
          .slice()
          .sort((a, b) => (b.lq ?? 0) - (a.lq ?? 0))
          .map((r) => r.t);

        const { pickStaleTickers, refreshTickers } = await import(
          "@/lib/proventos-cache.server"
        );
        const alvo = await pickStaleTickers(universe, limit, SIX_HOURS * 4);
        if (alvo.length === 0) {
          return Response.json({ processed: 0, comDados: 0, pendentes: 0 });
        }
        const res = await refreshTickers(alvo, 6);
        return Response.json({ ...res, universo: universe.length });
      },
    },
  },
});
