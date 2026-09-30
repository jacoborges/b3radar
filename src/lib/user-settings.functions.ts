import { createServerFn } from "@tanstack/react-start";
import { requireDriveAuth } from "@/integrations/drive-auth-middleware";
import type { UserSettingsDocument } from "./drive-documents.server";

export interface SectorPreference {
  selected: string[];
  known: string[];
}

function cleanSectorList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 200);
}

function parseSectorPreference(value: unknown): SectorPreference | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    selected: cleanSectorList(record.selected),
    known: cleanSectorList(record.known),
  };
}

async function readSettings(userId: string): Promise<UserSettingsDocument> {
  const { readUserDocument } = await import("./drive-storage.server");
  return readUserDocument(userId, "settings.json", {
    brapiTokenCiphertext: null,
    sectorPreference: null,
  });
}

async function updateSettings(
  userId: string,
  mutate: (settings: UserSettingsDocument) => UserSettingsDocument | Promise<UserSettingsDocument>,
) {
  const { updateUserDocument } = await import("./drive-storage.server");
  return updateUserDocument(userId, "settings.json", {
    brapiTokenCiphertext: null,
    sectorPreference: null,
  } satisfies UserSettingsDocument, mutate);
}

/** Token brapi.dev protegido no arquivo privado do usuário no Google Drive central. */
export const getMyBrapiToken = createServerFn({ method: "GET" })
  .middleware([requireDriveAuth])
  .handler(async ({ context }): Promise<{ token: string }> => {
    const settings = await readSettings(context.userId);
    if (!settings.brapiTokenCiphertext) return { token: "" };
    const { decryptPrivateValue } = await import("./data-crypto.server");
    return { token: decryptPrivateValue(settings.brapiTokenCiphertext) };
  });

export const setMyBrapiToken = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: { token: string }) => {
    const token = String(input?.token ?? "").trim();
    if (token.length > 200) throw new Error("Token inválido.");
    return { token };
  })
  .handler(async ({ data, context }) => {
    const { encryptPrivateValue } = await import("./data-crypto.server");
    await updateSettings(context.userId, (settings) => ({
      ...settings,
      brapiTokenCiphertext: data.token ? encryptPrivateValue(data.token) : null,
    }));
    return { ok: true as const };
  });

export const getMySectorPreference = createServerFn({ method: "GET" })
  .middleware([requireDriveAuth])
  .handler(async ({ context }): Promise<{ preference: SectorPreference | null }> => {
    const settings = await readSettings(context.userId);
    return { preference: parseSectorPreference(settings.sectorPreference) };
  });

export const setMySectorPreference = createServerFn({ method: "POST" })
  .middleware([requireDriveAuth])
  .inputValidator((input: SectorPreference) => ({
    selected: cleanSectorList(input?.selected),
    known: cleanSectorList(input?.known),
  }))
  .handler(async ({ data, context }) => {
    await updateSettings(context.userId, (settings) => ({ ...settings, sectorPreference: data }));
    return { ok: true as const };
  });
