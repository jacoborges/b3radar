import { createHash } from "node:crypto";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const ROOT_NAME = "B3 Radar Data";
const FOLDER_MIME = "application/vnd.google-apps.folder";

type DriveFile = { id: string; name: string; mimeType?: string; etag?: string; modifiedTime?: string };
type Envelope<T> = { schemaVersion: 1; revision: number; updatedAt: string; checksum: string; data: T };

function headers(extra?: HeadersInit) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovableKey || !driveKey) throw new Error("Google Drive não está conectado ao projeto.");
  return new Headers({ Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": driveKey, ...extra });
}

async function drive(path: string, init?: RequestInit) {
  const response = await fetch(`${GATEWAY}${path}`, { ...init, headers: headers(init?.headers) });
  if (!response.ok) {
    const body = await response.text();
    console.error(`Google Drive [${response.status}]: ${body}`);
    throw new Error(`Google Drive indisponível (${response.status}).`);
  }
  return response;
}

function escapeQuery(value: string) { return value.replaceAll("'", "\\'"); }

async function findChild(name: string, parentId?: string): Promise<DriveFile | null> {
  const clauses = [`name='${escapeQuery(name)}'`, "trashed=false"];
  if (parentId) clauses.push(`'${escapeQuery(parentId)}' in parents`);
  const query = new URLSearchParams({ q: clauses.join(" and "), fields: "files(id,name,mimeType,modifiedTime)", pageSize: "10" });
  const response = await drive(`/drive/v3/files?${query}`);
  const body = await response.json() as { files?: DriveFile[] };
  return body.files?.[0] ?? null;
}

async function createMetadata(name: string, mimeType: string, parentId?: string) {
  const response = await drive("/drive/v3/files?fields=id,name,mimeType", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType, ...(parentId ? { parents: [parentId] } : {}) }),
  });
  return response.json() as Promise<DriveFile>;
}

async function ensureFolder(name: string, parentId?: string) {
  const existing = await findChild(name, parentId);
  if (existing) {
    if (existing.mimeType !== FOLDER_MIME) throw new Error(`Conflito no Drive: ${name} não é uma pasta.`);
    return existing.id;
  }
  return (await createMetadata(name, FOLDER_MIME, parentId)).id;
}

async function userFolder(userId: string) {
  const root = await ensureFolder(ROOT_NAME);
  const users = await ensureFolder("users", root);
  return ensureFolder(createHash("sha256").update(userId).digest("hex"), users);
}

function envelope<T>(data: T, revision: number): Envelope<T> {
  const serialized = JSON.stringify(data);
  return { schemaVersion: 1, revision, updatedAt: new Date().toISOString(), checksum: createHash("sha256").update(serialized).digest("hex"), data };
}

async function download<T>(id: string): Promise<{ value: Envelope<T>; etag: string | null }> {
  const response = await drive(`/drive/v3/files/${encodeURIComponent(id)}?alt=media`);
  const value = await response.json() as Envelope<T>;
  if (value.schemaVersion !== 1 || typeof value.revision !== "number") throw new Error("Arquivo do Drive possui formato inválido.");
  const checksum = createHash("sha256").update(JSON.stringify(value.data)).digest("hex");
  if (checksum !== value.checksum) throw new Error("Arquivo do Drive falhou na verificação de integridade.");
  return { value, etag: response.headers.get("etag") };
}

async function upload(id: string, value: unknown, etag?: string | null) {
  await drive(`/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(etag ? { "If-Match": etag } : {}) },
    body: JSON.stringify(value),
  });
}

export async function readUserDocument<T>(userId: string, name: string, fallback: T): Promise<T> {
  const folder = await userFolder(userId);
  const file = await findChild(name, folder);
  if (!file) return fallback;
  return (await download<T>(file.id)).value.data;
}

export async function updateUserDocument<T>(userId: string, name: string, fallback: T, mutate: (value: T) => T | Promise<T>): Promise<T> {
  const folder = await userFolder(userId);
  let file = await findChild(name, folder);
  if (!file) {
    file = await createMetadata(name, "application/json", folder);
    await upload(file.id, envelope(fallback, 0));
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await download<T>(file.id);
    const next = await mutate(structuredClone(current.value.data));
    try {
      await upload(file.id, envelope(next, current.value.revision + 1), current.etag);
      return next;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error("Não foi possível concluir a gravação no Google Drive.");
}
