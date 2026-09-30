import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";

export type AppRole = "admin" | "gestor" | "usuario";

export interface DriveUser {
  id: string;
  email: string;
  role: AppRole;
  suspended: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  passwordHash: string;
  sessionVersion: number;
  failedAttempts: number;
  lockedUntil: string | null;
}

export interface SessionUser extends DriveUser {}

const SESSION_COOKIE = "b3radar_session";
const SESSION_MAX_AGE = 60 * 60 * 12;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

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
  const payload = JSON.stringify({ id: user.id, version: user.sessionVersion, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE });
  return `${SESSION_COOKIE}=${signed(payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() { return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("base64url")}:${digest.toString("base64url")}`;
}

function passwordMatches(password: string, stored: string) {
  const [scheme, saltValue, digestValue] = stored.split(":");
  if (scheme !== "scrypt" || !saltValue || !digestValue) return false;
  const expected = Buffer.from(digestValue, "base64url");
  const actual = scryptSync(password, Buffer.from(saltValue, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function readSession(request = getRequest()): Promise<SessionUser | null> {
  if (!request) return null;
  const raw = verify(cookies(request)[SESSION_COOKIE]);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as { id?: string; version?: number; exp?: number };
    if (!payload.id || payload.version === undefined || !payload.exp || payload.exp < Date.now() / 1000) return null;
    const { readSystemDocument } = await import("./drive-storage.server");
    const users = await readSystemDocument<DriveUser[]>("users.json", []);
    const user = users.find((item) => item.id === payload.id);
    return user && !user.suspended && user.sessionVersion === payload.version ? user : null;
  } catch { return null; }
}

export async function authenticateUser(email: string, password: string) {
  const { updateSystemDocument } = await import("./drive-storage.server");
  let authenticated: DriveUser | null = null;
  await updateSystemDocument<DriveUser[]>("users.json", [], (users) => {
    const now = new Date().toISOString();
    return users.map((user) => {
      if (user.email !== email.toLowerCase()) return user;
      if (user.suspended) throw new Error("Sua conta está suspensa.");
      if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) {
        throw new Error("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
      }
      if (!passwordMatches(password, user.passwordHash)) {
        const failedAttempts = (user.failedAttempts ?? 0) + 1;
        return { ...user, failedAttempts, lockedUntil: failedAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MS).toISOString() : null };
      }
      authenticated = { ...user, failedAttempts: 0, lockedUntil: null, lastSignInAt: now };
      return authenticated;
    });
  });
  if (!authenticated) throw new Error("E-mail ou senha inválidos.");
  return authenticated as DriveUser;
}
