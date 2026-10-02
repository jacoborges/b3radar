import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OnlineUser {
  userId: string;
  email: string;
}

let onlineUsers: OnlineUser[] = [];
const listeners = new Set<() => void>();

function setOnlineUsers(next: OnlineUser[]) {
  onlineUsers = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: OnlineUser[] = [];

/** Reader: current unique online users (presence-based, realtime). */
export function useOnlineUsers(): OnlineUser[] {
  return useSyncExternalStore(
    subscribe,
    () => onlineUsers,
    () => EMPTY,
  );
}

/**
 * Tracker: mount once (root) — publishes this session's presence and keeps the
 * shared list in sync. Counting is per user id, so multiple tabs count once.
 */
export function useOnlinePresence() {
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || cancelled) return;

      channel = supabase.channel("presence:online-users", {
        config: { presence: { key: user.id } },
      });

      const sync = () => {
        const state = channel!.presenceState() as Record<
          string,
          Array<{ email?: string }>
        >;
        setOnlineUsers(
          Object.entries(state).map(([userId, metas]) => ({
            userId,
            email: metas[0]?.email ?? "—",
          })),
        );
      };

      channel
        .on("presence", { event: "sync" }, sync)
        .on("presence", { event: "join" }, sync)
        .on("presence", { event: "leave" }, sync)
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void channel!.track({ email: user.email ?? "—", at: Date.now() });
          }
        });
    })();

    return () => {
      cancelled = true;
      setOnlineUsers([]);
      if (channel) {
        void channel.untrack();
        void supabase.removeChannel(channel);
      }
    };
  }, []);
}
