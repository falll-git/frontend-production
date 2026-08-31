"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageOff, RefreshCw } from "lucide-react";

import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import type { SjMedia } from "@/types/seputar-jaminan.types";
import { cn } from "@/lib/utils";

export const SJ_PUBLIC_IMAGE_ACCEPT =
  ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const SJ_PUBLIC_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const TYPES_BY_EXTENSION: Record<string, Set<string>> = {
  jpg: new Set(["image/jpeg", "image/jpg"]),
  jpeg: new Set(["image/jpeg", "image/jpg"]),
  png: new Set(["image/png"]),
  webp: new Set(["image/webp"]),
};

type MediaMeta = Pick<
  SjMedia,
  "mime_type" | "size_bytes" | "width" | "height" | "central_ready"
>;

function fileExtension(fileName: string) {
  return fileName.split(".").at(-1)?.trim().toLowerCase() ?? "";
}

export function validateSjPublicImage(file: File) {
  const extension = fileExtension(file.name);
  const mimeType = file.type.toLowerCase();
  if (file.size <= 0) return "Gambar yang dipilih kosong atau rusak.";
  if (file.size > SJ_PUBLIC_IMAGE_MAX_BYTES) {
    return "Ukuran gambar maksimal 10 MB.";
  }
  if (
    !ALLOWED_IMAGE_TYPES.has(mimeType) ||
    !ALLOWED_IMAGE_EXTENSIONS.has(extension) ||
    !TYPES_BY_EXTENSION[extension]?.has(mimeType)
  ) {
    return "Gunakan gambar JPG, PNG, atau WebP yang valid.";
  }
  return null;
}

export function formatSjMediaMeta(media: MediaMeta) {
  const type =
    media.mime_type === "image/jpeg"
      ? "JPG"
      : media.mime_type === "image/png"
        ? "PNG"
        : media.mime_type === "image/webp"
          ? "WebP"
          : "Gambar";
  const dimensions =
    media.width > 0 && media.height > 0
      ? `${media.width} × ${media.height} px`
      : null;
  const formattedSize = media.size_bytes >= 1024 * 1024
    ? `${(media.size_bytes / (1024 * 1024)).toFixed(2)} MB`
    : media.size_bytes >= 1024
      ? `${(media.size_bytes / 1024).toFixed(2)} KB`
      : media.size_bytes > 0
        ? `${media.size_bytes} B`
        : null;

  return [type, formattedSize, dimensions, media.central_ready ? "siap digunakan" : "menunggu sinkronisasi"]
    .filter(Boolean)
    .join(" · ");
}

export function SjMediaPreview({
  mediaId,
  alt,
  fit = "cover",
  className,
}: {
  mediaId: string;
  alt: string;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const [preview, setPreview] = useState<{ key: string; url: string } | null>(null);
  const [failureKey, setFailureKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${mediaId}:${attempt}`;

  useEffect(() => {
    let active = true;
    let nextObjectUrl: string | null = null;

    void seputarJaminanService
      .getMediaBlob(mediaId)
      .then((blob) => {
        if (!active) return;
        nextObjectUrl = URL.createObjectURL(blob);
        setPreview({ key: requestKey, url: nextObjectUrl });
      })
      .catch(() => {
        if (active) setFailureKey(requestKey);
      });

    return () => {
      active = false;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [mediaId, requestKey]);

  const objectUrl = preview?.key === requestKey ? preview.url : null;
  const failed = failureKey === requestKey;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-lg border border-slate-200 bg-slate-100",
        className,
      )}
    >
      {objectUrl ? (
        <Image
          src={objectUrl}
          alt={alt}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 160px"
          className={fit === "contain" ? "object-contain p-3" : "object-cover"}
        />
      ) : failed ? (
        <button
          type="button"
          className="flex size-full min-h-28 flex-col items-center justify-center gap-2 px-3 text-center text-sm font-semibold text-slate-600 outline-none transition hover:text-slate-900 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-sky-600/20"
          onClick={() => setAttempt((current) => current + 1)}
          aria-label={`Muat ulang pratinjau ${alt}`}
        >
          <ImageOff className="size-7" aria-hidden="true" />
          <span>Pratinjau belum tersedia</span>
          <span className="inline-flex items-center gap-1 text-xs text-sky-700">
            <RefreshCw className="size-3.5" aria-hidden="true" /> Coba lagi
          </span>
        </button>
      ) : (
        <div
          className="size-full min-h-28 animate-pulse bg-slate-200 motion-reduce:animate-none"
          role="status"
          aria-label={`Memuat pratinjau ${alt}`}
        />
      )}
    </div>
  );
}
