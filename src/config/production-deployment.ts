import path from "node:path";
import { BRAND_KEYS, type BrandKey } from "./branding";

type EnvironmentValues = Record<string, string | undefined>;

type ValidationOptions = {
  directServerActionsEncryptionKey: string;
  repositoryRoot?: string;
  serverActionsEncryptionKey: string;
};

export type ProductionDeploymentConfig = {
  instanceKey: BrandKey;
  brandKey: BrandKey;
  apiUrl: string;
  apiHostname: string;
  deploymentId: string;
  appRelease: string;
  serverActionsKeyFile: string;
};

const FULL_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

function required(env: EnvironmentValues, key: string): string {
  const value = (env[key] || "").trim();
  if (!value) throw new Error(`${key} wajib diisi di production.`);
  return value;
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function decodeCanonicalBase64(value: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    return null;
  }
  try {
    const decoded = Buffer.from(value, "base64");
    return decoded.toString("base64") === value ? decoded : null;
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.startsWith("127.")
  );
}

export function validateProductionDeployment(
  env: EnvironmentValues,
  options: ValidationOptions,
): ProductionDeploymentConfig | null {
  if ((env.NODE_ENV || "").trim() !== "production") return null;

  const instanceKey = required(env, "APP_INSTANCE_KEY").toLowerCase();
  const brandKey = required(env, "NEXT_PUBLIC_APP_BRAND").toLowerCase();
  if (!BRAND_KEYS.includes(instanceKey as BrandKey)) {
    throw new Error(`APP_INSTANCE_KEY tidak dikenal: ${instanceKey}.`);
  }
  if (!BRAND_KEYS.includes(brandKey as BrandKey)) {
    throw new Error(`NEXT_PUBLIC_APP_BRAND tidak dikenal: ${brandKey}.`);
  }
  if (instanceKey !== brandKey) {
    throw new Error(
      "APP_INSTANCE_KEY dan NEXT_PUBLIC_APP_BRAND harus sama agar branding BPRS tidak tertukar.",
    );
  }

  const apiUrlValue = required(env, "NEXT_PUBLIC_API_URL");
  const expectedApiHostname = required(env, "RUWANG_API_HOSTNAME").toLowerCase();
  let apiUrl: URL;
  try {
    apiUrl = new URL(apiUrlValue);
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL harus berupa URL production yang valid.");
  }
  const allowLoopbackApi =
    (env.RUWANG_ALLOW_LOOPBACK_API || "").trim() === "true" &&
    isLoopbackHostname(apiUrl.hostname);
  if (apiUrl.protocol !== "https:" && !(allowLoopbackApi && apiUrl.protocol === "http:")) {
    throw new Error("NEXT_PUBLIC_API_URL wajib memakai HTTPS di production.");
  }
  if (apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
    throw new Error(
      "NEXT_PUBLIC_API_URL tidak boleh memuat credential, query string, atau fragment.",
    );
  }
  if (apiUrl.pathname.replace(/\/+$/, "") !== "/api/v1") {
    throw new Error("NEXT_PUBLIC_API_URL wajib berakhir dengan /api/v1.");
  }
  if (apiUrl.hostname.toLowerCase() !== expectedApiHostname) {
    throw new Error(
      "Hostname NEXT_PUBLIC_API_URL tidak sama dengan RUWANG_API_HOSTNAME untuk BPRS ini.",
    );
  }

  const deploymentId = required(env, "NEXT_DEPLOYMENT_ID");
  if (!FULL_GIT_SHA_PATTERN.test(deploymentId)) {
    throw new Error("NEXT_DEPLOYMENT_ID wajib berupa full commit SHA 40 karakter.");
  }
  const appRelease = required(env, "NEXT_PUBLIC_APP_RELEASE");
  if (appRelease.toLowerCase() !== deploymentId.toLowerCase()) {
    throw new Error(
      "NEXT_PUBLIC_APP_RELEASE wajib sama dengan NEXT_DEPLOYMENT_ID.",
    );
  }

  const keyFile = required(env, "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY_FILE");
  if (options.directServerActionsEncryptionKey.trim()) {
    throw new Error(
      "Production wajib memakai NEXT_SERVER_ACTIONS_ENCRYPTION_KEY_FILE, bukan secret langsung.",
    );
  }
  if (!path.isAbsolute(keyFile)) {
    throw new Error(
      "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY_FILE wajib memakai absolute path.",
    );
  }
  const resolvedRepositoryRoot = path.resolve(
    options.repositoryRoot || process.cwd(),
  );
  const resolvedKeyFile = path.resolve(keyFile);
  if (isInside(resolvedRepositoryRoot, resolvedKeyFile)) {
    throw new Error(
      "File kunci Server Actions wajib berada di shared storage, di luar source/release.",
    );
  }
  const keySegments = resolvedKeyFile
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());
  if (!keySegments.includes("shared") || !keySegments.includes(instanceKey)) {
    throw new Error(
      "Path file kunci Server Actions wajib memuat APP_INSTANCE_KEY dan direktori shared.",
    );
  }
  const decodedKey = decodeCanonicalBase64(
    options.serverActionsEncryptionKey.trim(),
  );
  if (!decodedKey || decodedKey.length !== 32) {
    throw new Error(
      "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY wajib base64 kanonis dengan panjang 32 byte.",
    );
  }

  return Object.freeze({
    instanceKey: instanceKey as BrandKey,
    brandKey: brandKey as BrandKey,
    apiUrl: apiUrl.toString(),
    apiHostname: expectedApiHostname,
    deploymentId: deploymentId.toLowerCase(),
    appRelease: appRelease.toLowerCase(),
    serverActionsKeyFile: resolvedKeyFile,
  });
}
