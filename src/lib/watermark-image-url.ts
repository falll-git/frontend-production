const WATERMARK_ASSET_PATH =
  /^\/api\/watermark-assets\/\d{4}\/(?:0[1-9]|1[0-2])\/[A-Za-z0-9][A-Za-z0-9._-]{0,249}\.(?:png|jpe?g)$/i;

export function normalizeWatermarkImageUrl(
  value: unknown,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL,
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    typeof apiBaseUrl !== "string" ||
    !apiBaseUrl.trim()
  ) {
    return null;
  }

  try {
    const apiUrl = new URL(apiBaseUrl.trim());
    const imageUrl = new URL(value.trim(), apiUrl.origin);

    if (
      !["http:", "https:"].includes(apiUrl.protocol) ||
      imageUrl.protocol !== apiUrl.protocol ||
      imageUrl.origin !== apiUrl.origin ||
      imageUrl.username ||
      imageUrl.password ||
      imageUrl.search ||
      imageUrl.hash ||
      !WATERMARK_ASSET_PATH.test(imageUrl.pathname)
    ) {
      return null;
    }

    return imageUrl.toString();
  } catch {
    return null;
  }
}
