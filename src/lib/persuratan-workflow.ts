import type {
  CorrespondenceMyReportFilter,
  DispositionWorkflowStatus,
} from "@/types/surat.types";

export type PersuratanDeepLinkKind =
  "surat-masuk" | "surat-keluar" | "memorandum";

export interface PersuratanDeepLink {
  kind: PersuratanDeepLinkKind;
  id: string;
}

export interface PersuratanDeepLinkLoaders<
  TSuratMasuk,
  TSuratKeluar,
  TMemorandum,
> {
  suratMasuk: (id: string) => Promise<TSuratMasuk | null>;
  suratKeluar: (id: string) => Promise<TSuratKeluar | null>;
  memorandum: (id: string) => Promise<TMemorandum | null>;
}

export type PersuratanDeepLinkRecord<TSuratMasuk, TSuratKeluar, TMemorandum> =
  | { kind: "surat-masuk"; record: TSuratMasuk }
  | { kind: "surat-keluar"; record: TSuratKeluar }
  | { kind: "memorandum"; record: TMemorandum };

export function parsePersuratanDeepLink(
  kindValue: string | null | undefined,
  idValue: string | null | undefined,
): PersuratanDeepLink | null {
  const kind = String(kindValue || "")
    .trim()
    .toLowerCase();
  const id = String(idValue || "").trim();

  if (!id) return null;
  if (
    kind !== "surat-masuk" &&
    kind !== "surat-keluar" &&
    kind !== "memorandum"
  ) {
    return null;
  }

  return { kind, id };
}

export async function loadPersuratanDeepLinkRecord<
  TSuratMasuk,
  TSuratKeluar,
  TMemorandum,
>(
  deepLink: PersuratanDeepLink,
  loaders: PersuratanDeepLinkLoaders<TSuratMasuk, TSuratKeluar, TMemorandum>,
): Promise<PersuratanDeepLinkRecord<
  TSuratMasuk,
  TSuratKeluar,
  TMemorandum
> | null> {
  if (deepLink.kind === "surat-masuk") {
    const record = await loaders.suratMasuk(deepLink.id);
    return record ? { kind: deepLink.kind, record } : null;
  }

  if (deepLink.kind === "surat-keluar") {
    const record = await loaders.suratKeluar(deepLink.id);
    return record ? { kind: deepLink.kind, record } : null;
  }

  const record = await loaders.memorandum(deepLink.id);
  return record ? { kind: deepLink.kind, record } : null;
}

export function formatActiveAssigneeLabel({
  names,
  status,
}: {
  names: string[];
  status?: string | null;
}) {
  const validNames = names.map((name) => name.trim()).filter(Boolean);
  if (validNames.length > 0) return [...new Set(validNames)].join(", ");

  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  if (normalizedStatus === "COMPLETED" || normalizedStatus === "SELESAI") {
    return "Tidak ada — proses sudah selesai.";
  }

  return "Belum ada penanggung jawab aktif.";
}

export function getMyReportFilterForWorkflowStatus(
  status?: string | null,
): CorrespondenceMyReportFilter {
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  if (normalizedStatus === "COMPLETED" || normalizedStatus === "SELESAI") {
    return "completed";
  }
  if (normalizedStatus === "FORWARDED" || normalizedStatus === "DITERUSKAN") {
    return "forwarded";
  }
  return "active";
}

export function getDispositionActionVisibility(
  status: DispositionWorkflowStatus,
) {
  return {
    canStart: status === "NEW",
    canComplete: status === "IN_PROGRESS",
    canRedispose: status === "IN_PROGRESS",
  };
}
