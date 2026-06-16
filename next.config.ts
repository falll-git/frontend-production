import type { NextConfig } from "next";

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || "";
const serverActionsEncryptionKey =
  (process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY || "").trim();
const deploymentId =
  process.env.NEXT_DEPLOYMENT_ID ||
  process.env.DEPLOYMENT_VERSION ||
  process.env.GIT_HASH ||
  "";
const backendApiUrl = publicApiUrl.startsWith("http") ? publicApiUrl : "";
const isProduction = process.env.NODE_ENV === "production";
const backendOrigin = (() => {
  try {
    return backendApiUrl ? new URL(backendApiUrl).origin : "";
  } catch {
    return "";
  }
})();

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

const scriptSource = [
  "script-src",
  "'self'",
  "'unsafe-inline'",
  ...(isProduction ? [] : ["'unsafe-eval'"]),
].join(" ");

const devConnectSources = isProduction
  ? []
  : [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "ws://localhost:3000",
      "ws://127.0.0.1:3000",
    ];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  scriptSource,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${backendOrigin ? ` ${backendOrigin}` : ""}${devConnectSources.length ? ` ${devConnectSources.join(" ")}` : ""}`,
  `frame-src 'self' blob: data:${backendOrigin ? ` ${backendOrigin}` : ""}`,
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(deploymentId ? { deploymentId } : {}),
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
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
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
            value: "camera=(), microphone=(), geolocation=()",
          },
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
