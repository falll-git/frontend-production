type ContentSecurityPolicyOptions = {
  backendOrigin?: string;
  isDevelopment?: boolean;
  nonce: string;
};

function normalizeOrigin(value: string | undefined) {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
}

export function buildContentSecurityPolicy({
  backendOrigin,
  isDevelopment = false,
  nonce,
}: ContentSecurityPolicyOptions) {
  const apiOrigin = normalizeOrigin(backendOrigin);
  const developmentConnectSources = isDevelopment
    ? [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "ws://localhost:3000",
        "ws://127.0.0.1:3000",
      ]
    : [];
  const connectSources = ["'self'", apiOrigin, ...developmentConnectSources]
    .filter(Boolean)
    .join(" ");
  const frameSources = ["'self'", "blob:", "data:", apiOrigin]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    `frame-src ${frameSources}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
