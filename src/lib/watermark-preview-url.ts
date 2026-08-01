export function buildWatermarkPreviewUrl(
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL,
): string | null {
  if (typeof apiBaseUrl !== "string" || !apiBaseUrl.trim()) return null;

  try {
    const apiUrl = new URL(apiBaseUrl.trim());
    const apiPath = apiUrl.pathname.replace(/\/+$/, "");
    if (
      !["http:", "https:"].includes(apiUrl.protocol) ||
      apiUrl.username ||
      apiUrl.password ||
      apiUrl.search ||
      apiUrl.hash ||
      !apiPath.endsWith("/api/v1")
    ) {
      return null;
    }

    return new URL(
      `${apiPath}/watermark-settings/image-preview`,
      apiUrl.origin,
    ).toString();
  } catch {
    return null;
  }
}
