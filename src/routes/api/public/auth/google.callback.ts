import { createFileRoute } from "@tanstack/react-router";
import { clearStateCookie, readState, sessionCookie, upsertGoogleUser } from "@/lib/drive-auth.server";

export const Route = createFileRoute("/api/public/auth/google/callback")({
  server: { handlers: { GET: async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state || readState(request) !== state) return new Response("Solicitação de acesso inválida.", { status: 400 });
    const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"];
    const clientSecret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"];
    if (!clientId || !clientSecret) return new Response("Login Google ainda não configurado.", { status: 503 });
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: `${url.origin}/api/public/auth/google/callback`, grant_type: "authorization_code" }),
    });
    if (!tokenResponse.ok) return new Response("O Google não confirmou o acesso.", { status: 401 });
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) return new Response("Resposta de acesso inválida.", { status: 401 });
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!profileResponse.ok) return new Response("Não foi possível ler o perfil Google.", { status: 401 });
    const profile = await profileResponse.json() as { sub: string; email: string; name?: string; picture?: string; email_verified?: boolean };
    if (!profile.sub || !profile.email || profile.email_verified === false) return new Response("Conta Google sem e-mail confirmado.", { status: 403 });
    const user = await upsertGoogleUser(profile);
    if (user.suspended) return new Response("Acesso suspenso.", { status: 403 });
    const headers = new Headers({ Location: "/" });
    headers.append("Set-Cookie", sessionCookie(user));
    headers.append("Set-Cookie", clearStateCookie());
    return new Response(null, { status: 302, headers });
  } } },
});
