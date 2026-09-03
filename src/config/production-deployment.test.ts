import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateProductionDeployment } from "./production-deployment";

const temporaryRoots: string[] = [];

function validFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ruwang-production-config-"));
  temporaryRoots.push(root);
  const repositoryRoot = path.join(root, "releases", "candidate", "frontend");
  const keyFile = path.join(
    root,
    "demoruwangarsip",
    "shared",
    "credentials",
    "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
  );
  fs.mkdirSync(path.dirname(keyFile), { recursive: true });
  fs.mkdirSync(repositoryRoot, { recursive: true });
  const key = Buffer.alloc(32, 7).toString("base64");
  fs.writeFileSync(keyFile, key, "utf8");
  return {
    repositoryRoot,
    keyFile,
    key,
    env: {
      NODE_ENV: "production",
      APP_INSTANCE_KEY: "demoruwangarsip",
      NEXT_PUBLIC_APP_BRAND: "demoruwangarsip",
      NEXT_PUBLIC_API_URL: "https://api.demo.example.test/api/v1",
      RUWANG_API_HOSTNAME: "api.demo.example.test",
      NEXT_DEPLOYMENT_ID: "a".repeat(40),
      NEXT_PUBLIC_APP_RELEASE: "a".repeat(40),
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY_FILE: keyFile,
    },
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("production deployment contract", () => {
  it("mengikat instance, brand, domain API, commit, release, dan file kunci shared", () => {
    const fixture = validFixture();
    expect(
      validateProductionDeployment(fixture.env, {
        directServerActionsEncryptionKey: "",
        repositoryRoot: fixture.repositoryRoot,
        serverActionsEncryptionKey: fixture.key,
      }),
    ).toMatchObject({
      instanceKey: "demoruwangarsip",
      brandKey: "demoruwangarsip",
      apiHostname: "api.demo.example.test",
      deploymentId: "a".repeat(40),
      appRelease: "a".repeat(40),
    });
  });

  it.each([
    ["brand tertukar", { NEXT_PUBLIC_APP_BRAND: "arthamadani" }, /harus sama/],
    ["domain tertukar", { RUWANG_API_HOSTNAME: "api.bank-lain.test" }, /Hostname/],
    ["bukan full SHA", { NEXT_DEPLOYMENT_ID: "abc123" }, /full commit SHA/],
    ["release berbeda", { NEXT_PUBLIC_APP_RELEASE: "b".repeat(40) }, /wajib sama/],
  ])("menolak %s", (_label, override, expected) => {
    const fixture = validFixture();
    expect(() =>
      validateProductionDeployment(
        { ...fixture.env, ...override },
        {
          directServerActionsEncryptionKey: "",
          repositoryRoot: fixture.repositoryRoot,
          serverActionsEncryptionKey: fixture.key,
        },
      ),
    ).toThrow(expected);
  });

  it("menolak secret langsung dan file kunci di dalam release", () => {
    const fixture = validFixture();
    expect(() =>
      validateProductionDeployment(
        { ...fixture.env, NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: fixture.key },
        {
          directServerActionsEncryptionKey: fixture.key,
          repositoryRoot: fixture.repositoryRoot,
          serverActionsEncryptionKey: fixture.key,
        },
      ),
    ).toThrow(/bukan secret langsung/);

    const releaseKey = path.join(
      fixture.repositoryRoot,
      "demoruwangarsip",
      "shared",
      "key",
    );
    expect(() =>
      validateProductionDeployment(
        {
          ...fixture.env,
          NEXT_SERVER_ACTIONS_ENCRYPTION_KEY_FILE: releaseKey,
        },
        {
          directServerActionsEncryptionKey: "",
          repositoryRoot: fixture.repositoryRoot,
          serverActionsEncryptionKey: fixture.key,
        },
      ),
    ).toThrow(/di luar source\/release/);
  });

  it("menolak kunci yang bukan base64 kanonis 32 byte", () => {
    const fixture = validFixture();
    expect(() =>
      validateProductionDeployment(fixture.env, {
        directServerActionsEncryptionKey: "",
        repositoryRoot: fixture.repositoryRoot,
        serverActionsEncryptionKey: Buffer.alloc(16, 7).toString("base64"),
      }),
    ).toThrow(/32 byte/);
  });

  it("tidak menerapkan kontrak production pada development", () => {
    expect(
      validateProductionDeployment(
        { NODE_ENV: "development" },
        {
          directServerActionsEncryptionKey: "",
          serverActionsEncryptionKey: "",
        },
      ),
    ).toBeNull();
  });

  it("mengizinkan HTTP loopback hanya saat gate lokal memintanya eksplisit", () => {
    const fixture = validFixture();
    const loopbackEnv = {
      ...fixture.env,
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:7111/api/v1",
      RUWANG_API_HOSTNAME: "127.0.0.1",
      RUWANG_ALLOW_LOOPBACK_API: "true",
    };
    expect(
      validateProductionDeployment(loopbackEnv, {
        directServerActionsEncryptionKey: "",
        repositoryRoot: fixture.repositoryRoot,
        serverActionsEncryptionKey: fixture.key,
      }),
    ).not.toBeNull();
    expect(() =>
      validateProductionDeployment(
        { ...loopbackEnv, RUWANG_ALLOW_LOOPBACK_API: "false" },
        {
          directServerActionsEncryptionKey: "",
          repositoryRoot: fixture.repositoryRoot,
          serverActionsEncryptionKey: fixture.key,
        },
      ),
    ).toThrow(/wajib memakai HTTPS/);
  });
});
