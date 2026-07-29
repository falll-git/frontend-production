"use client";

import DashboardModal from "@/components/ui/DashboardModal";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import SetupRecordDetailSection from "@/components/ui/SetupRecordDetailSection";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupViewButton from "@/components/ui/SetupViewButton";
import { formatDateOnly } from "@/lib/utils/date";
import type { ArsipUserSummary, Dokumen } from "@/types/arsip.types";

const EMPTY_LABEL = "-";

type ReportDocumentDetailModalProps = {
  document: Dokumen | null;
  isOpen: boolean;
  onClose: () => void;
};

function getUserDisplayName(user?: ArsipUserSummary | null) {
  return user?.name?.trim() || user?.username?.trim() || EMPTY_LABEL;
}

function getUserMeta(user?: ArsipUserSummary | null) {
  if (!user) return null;

  const parts = [user.username, user.email].filter(
    (item): item is string => Boolean(item?.trim()),
  );

  return parts.length > 0 ? parts.join(" | ") : null;
}

function getRelatedUserMeta(user?: ArsipUserSummary | null) {
  if (!user) return null;

  const displayName = getUserDisplayName(user).trim().toLowerCase();
  const roleName = user.role?.name?.trim() ?? "";
  const divisionName = user.division?.name?.trim() ?? "";
  const parts: string[] = [];

  if (roleName && roleName.toLowerCase() !== displayName) {
    parts.push(roleName);
  }

  if (divisionName) {
    parts.push(divisionName);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
}

function getDocumentOwner(document?: Dokumen | null) {
  return document?.owner ?? document?.creator ?? null;
}

function getDocumentOwnerDivision(document?: Dokumen | null) {
  return (
    document?.ownerDivision?.name ??
    document?.owner?.division?.name ??
    document?.creator?.division?.name ??
    EMPTY_LABEL
  );
}

function getDocumentLocation(document?: Dokumen | null) {
  return document?.tempatPenyimpanan ?? document?.storage?.locationLabel ?? EMPTY_LABEL;
}

function getDocumentDebtorLabel(document: Dokumen) {
  if (!document.debtor) return EMPTY_LABEL;
  return [document.debtor.debtor_number, document.debtor.name]
    .filter(Boolean)
    .join(" - ");
}

export default function ReportDocumentDetailModal({
  document,
  isOpen,
  onClose,
}: ReportDocumentDetailModalProps) {
  const { openPreview } = useDocumentPreviewContext();

  if (!document) return null;

  const owner = getDocumentOwner(document);
  const ownerMeta = getUserMeta(owner);
  const creatorMeta = getUserMeta(document.creator);
  const relatedUsers = document.relatedUsers ?? [];
  const isWatermarkActive = Boolean(
    document.watermark?.applied ||
      document.watermark?.status_key === "APPLIED" ||
      document.watermark?.file_url,
  );

  return (
    <DashboardModal
      isOpen={isOpen}
      title="Detail Dokumen"
      description={document.kode}
      onClose={onClose}
      maxWidth="5xl"
      bodyClassName="space-y-6 p-4 sm:p-5"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="uiverse-modal-button uiverse-modal-button--neutral"
        >
          Tutup
        </button>
      }
    >
      <SetupRecordDetailSection
        title="Informasi Dokumen"
        rows={[
          { label: "Nama Dokumen", value: document.namaDokumen },
          { label: "Kode Dokumen", value: document.kode },
          {
            label: "Status Peminjaman",
            value: <SetupStatusBadge status={document.statusPinjam} />,
          },
          {
            label: "Akses",
            value: (
              <SetupStatusBadge
                status={document.restrict ? "Restrict" : "Non-restrict"}
                tone={document.restrict ? "blue" : "slate"}
              />
            ),
          },
          { label: "Tanggal Input", value: formatDateOnly(document.tglInput) },
          { label: "User Input", value: document.userInput || EMPTY_LABEL },
          { label: "Jenis Dokumen", value: document.jenisDokumen || EMPTY_LABEL },
          { label: "Keterangan", value: document.detail || EMPTY_LABEL },
        ]}
      />

      <SetupRecordDetailSection
        title="File Dokumen"
        rows={[
          {
            label: "Nama File",
            value: document.fileName || document.namaDokumen || EMPTY_LABEL,
          },
          {
            label: "Status Watermark",
            value: (
              <SetupStatusBadge
                status={isWatermarkActive ? "Aktif" : "Nonaktif"}
                label={isWatermarkActive ? "Aktif" : "Nonaktif"}
                tone={isWatermarkActive ? "emerald" : "red"}
              />
            ),
          },
          {
            label: "Aksi",
            value: (
              <SetupViewButton
                onClick={() =>
                  document.fileUrl
                    ? openPreview(
                        document.fileUrl,
                        document.fileName || document.namaDokumen,
                      )
                    : undefined
                }
                disabled={!document.fileUrl}
                label="Preview"
                title={
                  document.fileUrl
                    ? "Preview dokumen"
                    : "File dokumen belum tersedia"
                }
              />
            ),
          },
        ]}
      />

      <SetupRecordDetailSection
        title="Kepemilikan dan Akses"
        rows={[
          {
            label: "PIC / Pemilik",
            value: (
              <span>
                {getUserDisplayName(owner)}
                {ownerMeta ? (
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    {ownerMeta}
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            label: "Dibuat Oleh",
            value: (
              <span>
                {getUserDisplayName(document.creator)}
                {creatorMeta ? (
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    {creatorMeta}
                  </span>
                ) : null}
              </span>
            ),
          },
          { label: "Divisi Pemilik", value: getDocumentOwnerDivision(document) },
          { label: "Debitur Terkait", value: getDocumentDebtorLabel(document) },
          {
            label: "User Terkait",
            value:
              relatedUsers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {relatedUsers.map((item) => {
                    const meta = getRelatedUserMeta(item);
                    return (
                      <span
                        key={item.id}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                      >
                        <span className="truncate">{getUserDisplayName(item)}</span>
                        {meta ? (
                          <span className="truncate text-sky-600/80">{meta}</span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="font-medium text-gray-500">
                  Tidak ada user terkait.
                </span>
              ),
          },
        ]}
      />

      <SetupRecordDetailSection
        title="Lokasi Penyimpanan"
        rows={[
          {
            label: "Jalur Lokasi",
            value: [
              document.storage?.officeName,
              document.storage?.cabinetCode,
              document.storage?.rackName,
            ]
              .filter(Boolean)
              .join(" > ") || EMPTY_LABEL,
          },
          { label: "Kode Kantor", value: document.storage?.officeCode || EMPTY_LABEL },
          { label: "Kantor", value: document.storage?.officeName || EMPTY_LABEL },
          { label: "Lemari", value: document.storage?.cabinetCode || EMPTY_LABEL },
          { label: "Rak", value: document.storage?.rackName || EMPTY_LABEL },
          { label: "Lokasi", value: getDocumentLocation(document) },
        ]}
      />
    </DashboardModal>
  );
}
