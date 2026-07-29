import type { NextConfig } from "next";
import { readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";

function resolveFileBackedEnv(key: string) {
  const directValue = (process.env[key] || "").trim();
  const fileKey = `${key}_FILE`;
  const filePath = (process.env[fileKey] || "").trim();
  if (!filePath) return directValue;
  if (directValue) {
    throw new Error(`${key} dan ${fileKey} tidak boleh diisi bersamaan.`);
  }
  if (process.env.NODE_ENV === "production" && !isAbsolute(filePath)) {
    throw new Error(`${fileKey} wajib memakai absolute path di production.`);
  }
  let stats: ReturnType<typeof statSync>;
  let value: string;
  try {
    stats = statSync(filePath);
    value = readFileSync(filePath, "utf8").trim();
  } catch {
    throw new Error(`${fileKey} tidak dapat dibaca.`);
  }
  if (!stats.isFile() || stats.size < 1 || stats.size > 64 * 1024) {
    throw new Error(`${fileKey} harus berupa file 1 byte sampai 64 KiB.`);
  }
  if (!value) throw new Error(`${fileKey} tidak boleh menunjuk ke file kosong.`);
  process.env[key] = value;
  return value;
}

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || "";
const serverActionsEncryptionKey =
  resolveFileBackedEnv("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY");
const deploymentId =
  process.env.NEXT_DEPLOYMENT_ID ||
  process.env.DEPLOYMENT_VERSION ||
  process.env.GIT_HASH ||
  "";
const appRelease =
  process.env.NEXT_PUBLIC_APP_RELEASE || deploymentId;
const backendApiUrl = publicApiUrl.startsWith("http") ? publicApiUrl : "";
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !backendApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL wajib diisi dengan URL backend production.");
}

if (isProduction && !serverActionsEncryptionKey.trim()) {
  throw new Error(
    "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY wajib diisi di production agar Server Action stabil antar build dan PM2 instance.",
  );
}

if (isProduction && serverActionsEncryptionKey) {
  let decodedKeyLength = 0;

  try {
    decodedKeyLength = Buffer.from(serverActionsEncryptionKey, "base64").length;
  } catch {
    decodedKeyLength = 0;
  }

  if (![16, 24, 32].includes(decodedKeyLength)) {
    throw new Error(
      "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY harus base64 valid dengan decoded length 16, 24, atau 32 bytes. Generate dengan: openssl rand -base64 32",
    );
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  ...(deploymentId ? { deploymentId } : {}),
  ...(appRelease
    ? { env: { NEXT_PUBLIC_APP_RELEASE: appRelease } }
    : {}),
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  poweredByHeader: false,
  compress: true,
  compiler: {
    removeConsole: isProduction
      ? {
          exclude: ["error", "warn"],
        }
      : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "react-pdf"],
  },
  watchOptions: {
    pollIntervalMs: 1000,
  },
  async rewrites() {
    if (!backendApiUrl) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/((?!api(?:/|$)).*)",
        headers: [
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },

  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
