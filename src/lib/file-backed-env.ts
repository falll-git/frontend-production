import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { isAbsolute } from "node:path";

const MAX_SECRET_FILE_SIZE_BYTES = 64 * 1024;
type EnvironmentValues = Record<string, string | undefined>;

export function resolveFileBackedEnv(
  key: string,
  env: EnvironmentValues = process.env,
): string {
  const directValue = (env[key] || "").trim();
  const fileKey = `${key}_FILE`;
  const filePath = (env[fileKey] || "").trim();
  if (!filePath) return directValue;
  if (directValue) {
    throw new Error(`${key} dan ${fileKey} tidak boleh diisi bersamaan.`);
  }
  if (env.NODE_ENV === "production" && !isAbsolute(filePath)) {
    throw new Error(`${fileKey} wajib memakai absolute path di production.`);
  }

  let descriptor: number;
  try {
    descriptor = openSync(filePath, "r");
  } catch {
    throw new Error(`${fileKey} tidak dapat dibaca.`);
  }

  try {
    const stats = fstatSync(descriptor);
    if (
      !stats.isFile() ||
      stats.size < 1 ||
      stats.size > MAX_SECRET_FILE_SIZE_BYTES
    ) {
      throw new Error(`${fileKey} harus berupa file 1 byte sampai 64 KiB.`);
    }

    const buffer = Buffer.alloc(MAX_SECRET_FILE_SIZE_BYTES + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const chunkSize = readSync(
        descriptor,
        buffer,
        bytesRead,
        buffer.length - bytesRead,
        bytesRead,
      );
      if (chunkSize === 0) break;
      bytesRead += chunkSize;
    }

    if (bytesRead < 1 || bytesRead > MAX_SECRET_FILE_SIZE_BYTES) {
      throw new Error(`${fileKey} harus berupa file 1 byte sampai 64 KiB.`);
    }

    const value = buffer.subarray(0, bytesRead).toString("utf8").trim();
    if (!value) {
      throw new Error(`${fileKey} tidak boleh menunjuk ke file kosong.`);
    }

    env[key] = value;
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(fileKey)) {
      throw error;
    }
    throw new Error(`${fileKey} tidak dapat dibaca.`);
  } finally {
    closeSync(descriptor);
  }
}
