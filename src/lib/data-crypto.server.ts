import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env["B3_RADAR_DATA_ENCRYPTION_KEY"];
  if (!secret) throw new Error("A chave de proteção dos dados não está configurada.");
  return createHash("sha256").update(secret).digest();
}

export function encryptPrivateValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function decryptPrivateValue(value: string) {
  const payload = Buffer.from(value, "base64");
  if (payload.length < 29) throw new Error("Dado protegido inválido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
}
