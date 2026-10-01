import { useEffect, useSyncExternalStore } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listOnlineUsers } from "@/lib/access-sessions.functions";

export interface OnlineUser { userId: string; email: string; }
let onlineUsers: OnlineUser[] = [];
const listeners = new Set<() => void>();
const EMPTY: OnlineUser[] = [];
function publish(next: OnlineUser[]) { onlineUsers = next; listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function useOnlineUsers() { return useSyncExternalStore(subscribe, () => onlineUsers, () => EMPTY); }

export function useOnlinePresence() {
  const load = useServerFn(listOnlineUsers);
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => { try { const users = await load(); if (!cancelled) publish(users); } catch { if (!cancelled) publish([]); } };
    void refresh();
    const timer = setInterval(() => void refresh(), 45_000);
    return () => { cancelled = true; clearInterval(timer); publish([]); };
  }, [load]);
}