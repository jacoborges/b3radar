import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, readSession } from "@/lib/drive-auth.server";

export const Route = createFileRoute("/api/public/auth/session")({
  server: { handlers: {
    GET: async ({ request }) => Response.json({ user: await readSession(request) }),
    DELETE: async () => new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie() } }),
  } },
});
