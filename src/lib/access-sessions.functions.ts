import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACTIVE_WINDOW_MS = 90_000;
const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

function assertId(value: unknown): string {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Identificador inválido.");
  return id;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Apenas administradores podem consultar acessos.");
}

export const touchAccessSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => ({
    sessionId: assertId(input.sessionId),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const { data: existing } = await supabaseAdmin
      .from("user_access_sessions")
      .select("id, last_seen_at, signed_out_at")
      .eq("user_id", context.userId)
      .eq("client_session_id", data.sessionId)
      .maybeSingle();

    const canContinue =
      existing &&
      !existing.signed_out_at &&
      now.getTime() - new Date(existing.last_seen_at).getTime() <= ACTIVE_WINDOW_MS;

    let sessionId = data.sessionId;
    if (canContinue) {
      const { error } = await supabaseAdmin
        .from("user_access_sessions")
        .update({ last_seen_at: now.toISOString() })
        .eq("id", existing.id)
        .eq("user_id", context.userId);
      if (error) throw error;
    } else {
      sessionId = crypto.randomUUID();
      const { error } = await supabaseAdmin.from("user_access_sessions").insert({
        user_id: context.userId,
        client_session_id: sessionId,
        signed_in_at: now.toISOString(),
        last_seen_at: now.toISOString(),
      });
      if (error) throw error;
    }

    const cutoff = new Date(now.getTime() - RETENTION_MS).toISOString();
    await supabaseAdmin.from("user_access_sessions").delete().lt("signed_in_at", cutoff);
    return { sessionId, touchedAt: now.toISOString() };
  });

export const closeAccessSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => ({
    sessionId: assertId(input.sessionId),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("user_access_sessions")
      .update({ last_seen_at: now, signed_out_at: now })
      .eq("user_id", context.userId)
      .eq("client_session_id", data.sessionId)
      .is("signed_out_at", null);
    if (error) throw error;
    return { ok: true as const };
  });

export interface AccessSessionLog {
  id: string;
  signedInAt: string;
  signedOutAt: string | null;
  lastSeenAt: string;
  durationSeconds: number;
  online: boolean;
}

export const listUserAccessSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: assertId(input.userId) }))
  .handler(async ({ data, context }): Promise<AccessSessionLog[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = Date.now();
    const cutoff = new Date(now - RETENTION_MS).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("user_access_sessions")
      .select("id, signed_in_at, signed_out_at, last_seen_at")
      .eq("user_id", data.userId)
      .gte("signed_in_at", cutoff)
      .order("signed_in_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    return (rows ?? []).map((row) => {
      const signedIn = new Date(row.signed_in_at).getTime();
      const lastSeen = new Date(row.last_seen_at).getTime();
      const online = !row.signed_out_at && now - lastSeen <= ACTIVE_WINDOW_MS;
      const ended = row.signed_out_at ? new Date(row.signed_out_at).getTime() : lastSeen;
      return {
        id: row.id,
        signedInAt: row.signed_in_at,
        signedOutAt: row.signed_out_at,
        lastSeenAt: row.last_seen_at,
        durationSeconds: Math.max(0, Math.round((ended - signedIn) / 1000)),
        online,
      };
    });
  });