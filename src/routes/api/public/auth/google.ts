import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "node:crypto";
import { stateCookie } from "@/lib/drive-auth.server";

export const Route = createFileRoute("/api/public/auth/google")({
  server: { handlers: { GET: async ({ request }) => {
    const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"];
    if (!clientId) return new Response("Login Google ainda não configurado.", { status: 503 });
    const origin = new URL(request.url).origin;
    const state = randomBytes(24).toString("base64url");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${origin}/api/public/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return new Response(null, { status: 302, headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, "Set-Cookie": stateCookie(state) } });
  } } },
});
