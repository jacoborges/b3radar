import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import type { AppRole } from "./admin-users.functions";

export interface DriveUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  role: AppRole;
  suspended: boolean;
  createdAt: string;
  lastSignInAt: string;
}

export interface SessionUser extends DriveUser {}

const SESSION_COOKIE = "b3radar_session";
const STATE_COOKIE = "b3radar_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 12;

function secret() {
  const value = process.env["B3_RADAR_SESSION_SECRET"];
  if (!value) throw new Error("Sessões do app não estão configuradas.");
  return value;
}

function encode(value: string) { return Buffer.from(value).toString("base64url"); }
function decode(value: string) { return Buffer.from(value, "base64url").toString("utf8"); }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }

function signed(value: string) {
  const body = encode(value);
  return `${body}.${sign(body)}`;
}

function verify(value: string | undefined) {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return decode(body);
}

function cookies(request: Request) {
  return Object.fromEntries((request.headers.get("cookie") ?? "").split(";").map((part) => part.trim().split("=")).filter(([key]) => key));
}

export function sessionCookie(user: DriveUser) {
  const payload = JSON.stringify({ id: user.id, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE });
  return `${SESSION_COOKIE}=${signed(payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() { return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }
export function stateCookie(state: string) { return `${STATE_COOKIE}=${signed(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`; }
export function clearStateCookie() { return `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }
export function readState(request: Request) { return verify(cookies(request)[STATE_COOKIE]); }

export async function readSession(request = getRequest()): Promise<SessionUser | null> {
  if (!request) return null;
  const raw = verify(cookies(request)[SESSION_COOKIE]);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as { id?: string; exp?: number };
    if (!payload.id || !payload.exp || payload.exp < Date.now() / 1000) return null;
    const { readSystemDocument } = await import("./drive-storage.server");
    const users = await readSystemDocument<DriveUser[]>("users.json", []);
    const user = users.find((item) => item.id === payload.id);
    return user && !user.suspended ? user : null;
  } catch { return null; }
}

export async function upsertGoogleUser(profile: { sub: string; email: string; name?: string; picture?: string }) {
  const { updateSystemDocument } = await import("./drive-storage.server");
  let signedIn: DriveUser | null = null;
  await updateSystemDocument<DriveUser[]>("users.json", [], (users) => {
    const now = new Date().toISOString();
    const existing = users.find((user) => user.id === profile.sub);
    const role: AppRole = profile.email.toLowerCase() === "b3radar@gmail.com" ? "admin" : existing?.role ?? "usuario";
    signedIn = {
      id: profile.sub,
      email: profile.email.toLowerCase(),
      name: profile.name?.trim() || profile.email,
      picture: profile.picture ?? null,
      role,
      suspended: existing?.suspended ?? false,
      createdAt: existing?.createdAt ?? now,
      lastSignInAt: now,
    };
    return [...users.filter((user) => user.id !== profile.sub), signedIn];
  });
  if (!signedIn) throw new Error("Não foi possível registrar o usuário.");
  return signedIn;
}
