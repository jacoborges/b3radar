import { useCallback, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDriveSession } from "@/lib/drive-auth.functions";
import {
  closeAccessSession,
  touchAccessSession,
} from "@/lib/access-sessions.functions";

const HEARTBEAT_MS = 45_000;
const REUSE_WINDOW_MS = 90_000;
const STORAGE_PREFIX = "b3radar:access-session:";

interface StoredSession {
  id: string;
  touchedAt: number;
}

function readStored(userId: string): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.id !== "string" || typeof parsed.touchedAt !== "number") return null;
    return { id: parsed.id, touchedAt: parsed.touchedAt };
  } catch {
    return null;
  }
}

function writeStored(userId: string, value: StoredSession) {
  window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(value));
}

export function useAccessSessionTracker() {
  const touch = useServerFn(touchAccessSession);
  const getSession = useServerFn(getDriveSession);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let trackedUserId: string | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
      trackedUserId = null;
    };

    const start = async () => {
      const { user } = await getSession();
      if (!user || cancelled || trackedUserId === user.id) return;
      stop();
      trackedUserId = user.id;
      const stored = readStored(user.id);
      let sessionId =
        stored && Date.now() - stored.touchedAt <= REUSE_WINDOW_MS
          ? stored.id
          : crypto.randomUUID();

      const heartbeat = async () => {
        try {
          const result = await touch({ data: { sessionId } });
          if (cancelled) return;
          sessionId = result.sessionId;
          writeStored(user.id, { id: sessionId, touchedAt: Date.now() });
        } catch {
          // A próxima batida tentará novamente sem interromper o aplicativo.
        }
      };

      await heartbeat();
      if (cancelled) return;
      timer = setInterval(() => void heartbeat(), HEARTBEAT_MS);
    };

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [getSession, touch]);
}

export function useCloseAccessSession() {
  const close = useServerFn(closeAccessSession);
  const getSession = useServerFn(getDriveSession);
  return useCallback(async () => {
    const { user } = await getSession();
    if (!user) return;
    const key = `${STORAGE_PREFIX}${user.id}`;
    const stored = readStored(user.id);
    try {
      if (stored) await close({ data: { sessionId: stored.id } });
    } catch {
      // Uma falha no registro nunca deve impedir a saída da conta.
    } finally {
      window.localStorage.removeItem(key);
    }
  }, [close, getSession]);
}