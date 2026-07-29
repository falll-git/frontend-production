import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { resolveFileBackedEnv } from "@/lib/file-backed-env";

const temporaryDirectories: string[] = [];

function createSecretFile(content: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), "ruwang-env-test-"));
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, "secret");
  writeFileSync(filePath, content, { encoding: "utf8", mode: 0o600 });
  return filePath;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("resolveFileBackedEnv", () => {
  it("mengembalikan nilai langsung ketika file secret tidak dikonfigurasi", () => {
    expect(
      resolveFileBackedEnv("APP_SECRET", {
        APP_SECRET: " direct-value ",
      }),
    ).toBe("direct-value");
  });

  it("membaca dan menyimpan secret melalui file yang sama", () => {
    const filePath = createSecretFile(" file-backed-value\n");
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      APP_SECRET_FILE: filePath,
    };

    expect(resolveFileBackedEnv("APP_SECRET", env)).toBe("file-backed-value");
    expect(env.APP_SECRET).toBe("file-backed-value");
  });

  it("menolak nilai langsung dan file yang diisi bersamaan", () => {
    const filePath = createSecretFile("file-backed-value");

    expect(() =>
      resolveFileBackedEnv("APP_SECRET", {
        APP_SECRET: "direct-value",
        APP_SECRET_FILE: filePath,
      }),
    ).toThrow(/tidak boleh diisi bersamaan/);
  });

  it("menolak path relatif di production", () => {
    expect(() =>
      resolveFileBackedEnv("APP_SECRET", {
        NODE_ENV: "production",
        APP_SECRET_FILE: "relative-secret",
      }),
    ).toThrow(/absolute path/);
  });

  it("menolak file kosong dan file yang melewati batas ukuran", () => {
    const emptyFile = createSecretFile("");
    const oversizedFile = createSecretFile("x".repeat(64 * 1024 + 1));

    expect(() =>
      resolveFileBackedEnv("APP_SECRET", {
        APP_SECRET_FILE: emptyFile,
      }),
    ).toThrow(/1 byte sampai 64 KiB/);
    expect(() =>
      resolveFileBackedEnv("APP_SECRET", {
        APP_SECRET_FILE: oversizedFile,
      }),
    ).toThrow(/1 byte sampai 64 KiB/);
  });

  it("menolak file yang hanya berisi whitespace", () => {
    const filePath = createSecretFile("  \r\n  ");

    expect(() =>
      resolveFileBackedEnv("APP_SECRET", {
        APP_SECRET_FILE: filePath,
      }),
    ).toThrow(/file kosong/);
  });
});
