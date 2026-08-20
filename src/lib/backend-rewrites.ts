export type BackendRewrite = {
  source: string;
  destination: string;
};

const BACKEND_FILE_PREFIXES = [
  "digital-archive-files",
  "persuratan-files",
  "watermark-files",
  "watermarked-files",
] as const;

function resolveBackendPublicBase(backendApiUrl: string): string | null {
  try {
    const parsed = new URL(backendApiUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    const apiPath = parsed.pathname
      .replace(/\/+$/, "")
      .replace(/\/api\/v1$/i, "");

    return `${parsed.origin}${apiPath}`;
  } catch {
    return null;
  }
}

export function createBackendRewrites(
  backendApiUrl: string,
): BackendRewrite[] {
  if (!backendApiUrl) return [];

  const backendPublicBase = resolveBackendPublicBase(backendApiUrl);
  if (!backendPublicBase) return [];

  return [
    ...BACKEND_FILE_PREFIXES.map((prefix) => ({
      source: `/api/${prefix}/:path*`,
      destination: `${backendPublicBase}/api/${prefix}/:path*`,
    })),
    {
      source: "/api/:path*",
      destination: `${backendApiUrl.replace(/\/+$/, "")}/:path*`,
    },
  ];
}
