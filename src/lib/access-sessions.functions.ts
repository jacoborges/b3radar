import { createServerFn } from "@tanstack/react-start";
import { requireDriveAuth } from "@/integrations/drive-auth-middleware";

const ACTIVE_WINDOW_MS = 90_000;
const RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

interface StoredAccessSession {
  id: string; userId: string; email: string; signedInAt: string; signedOutAt: string | null; lastSeenAt: string;
}

function assertId(value: unknown) {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Identificador inválido.");
  return id;
}

async function updateLogs(mutate: (logs: StoredAccessSession[]) => StoredAccessSession[]) {
  const { updateSystemDocument } = await import("./drive-storage.server");
  return updateSystemDocument<StoredAccessSession[]>("access-sessions.json", [], mutate);
}

export const touchAccessSession = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { sessionId: string }) => ({ sessionId: assertId(input.sessionId) }))
  .handler(async ({ data, context }) => {
    const now = new Date();
    let sessionId = data.sessionId;
    await updateLogs((logs) => {
      const cutoff = now.getTime() - RETENTION_MS;
      const kept = logs.filter((log) => Date.parse(log.signedInAt) >= cutoff);
      const index = kept.findIndex((log) => log.userId === context.userId && log.id === data.sessionId);
      const current = index >= 0 ? kept[index] : null;
      if (current && !current.signedOutAt && now.getTime() - Date.parse(current.lastSeenAt) <= ACTIVE_WINDOW_MS) {
        kept[index] = { ...current, lastSeenAt: now.toISOString() };
      } else {
        sessionId = crypto.randomUUID();
        kept.push({ id: sessionId, userId: context.userId, email: context.user.email, signedInAt: now.toISOString(), lastSeenAt: now.toISOString(), signedOutAt: null });
      }
      return kept;
    });
    return { sessionId, touchedAt: now.toISOString() };
  });

export const closeAccessSession = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { sessionId: string }) => ({ sessionId: assertId(input.sessionId) }))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    await updateLogs((logs) => logs.map((log) => log.userId === context.userId && log.id === data.sessionId && !log.signedOutAt ? { ...log, lastSeenAt: now, signedOutAt: now } : log));
    return { ok: true as const };
  });

export interface AccessSessionLog { id: string; signedInAt: string; signedOutAt: string | null; lastSeenAt: string; durationSeconds: number; online: boolean; }

export const listUserAccessSessions = createServerFn({ method: "GET" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { userId: string }) => ({ userId: assertId(input.userId) }))
  .handler(async ({ data, context }): Promise<AccessSessionLog[]> => {
    if (context.user.role !== "admin") throw new Error("Apenas administradores podem consultar acessos.");
    const { readSystemDocument } = await import("./drive-storage.server");
    const now = Date.now();
    const logs = await readSystemDocument<StoredAccessSession[]>("access-sessions.json", []);
    return logs.filter((log) => log.userId === data.userId && Date.parse(log.signedInAt) >= now - RETENTION_MS).sort((a, b) => b.signedInAt.localeCompare(a.signedInAt)).slice(0, 500).map((log) => {
      const online = !log.signedOutAt && now - Date.parse(log.lastSeenAt) <= ACTIVE_WINDOW_MS;
      const ended = log.signedOutAt ?? log.lastSeenAt;
      return { id: log.id, signedInAt: log.signedInAt, signedOutAt: log.signedOutAt, lastSeenAt: log.lastSeenAt, durationSeconds: Math.max(0, Math.round((Date.parse(ended) - Date.parse(log.signedInAt)) / 1000)), online };
    });
  });

export const listOnlineUsers = createServerFn({ method: "GET" })
  .middleware([requireDriveAuth])
  .handler(async ({ context }) => {
    if (context.user.role !== "admin") return [];
    const { readSystemDocument } = await import("./drive-storage.server");
    const logs = await readSystemDocument<StoredAccessSession[]>("access-sessions.json", []);
    const cutoff = Date.now() - ACTIVE_WINDOW_MS;
    const unique = new Map<string, { userId: string; email: string }>();
    for (const log of logs) if (!log.signedOutAt && Date.parse(log.lastSeenAt) >= cutoff) unique.set(log.userId, { userId: log.userId, email: log.email });
    return [...unique.values()];
  });