"use client";

import type { ReactNode } from "react";
import { FileBadge2, MapPinned, ShieldCheck, UserRound } from "lucide-react";

import InputDokumenSectionTitle from "@/components/arsip-digital/input-dokumen/InputDokumenSectionTitle";
import DashboardModal from "@/components/ui/DashboardModal";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
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

type DetailInfoItemProps = {
  label: string;
  value?: ReactNode;
  helper?: ReactNode;
  className?: string;
  align?: "start" | "center";
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

function DetailInfoItem({
  label,
  value = EMPTY_LABEL,
  helper,
  className = "",
  align = "start",
}: DetailInfoItemProps) {
  return (
    <div
      className={`space-y-1 rounded-xl border border-gray-200 bg-white px-4 py-3 ${
        align === "center" ? "text-center" : ""
      } ${className}`.trim()}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      {helper ? <div className="text-xs text-slate-500">{helper}</div> : null}
    </div>
  );
}

function DetailKeyValueRow({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-2 border-b border-slate-100 py-3 last:border-b-0 md:grid-cols-[168px_minmax(0,1fr)] ${className}`.trim()}
    >
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{children}</div>
    </div>
  );
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
      bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto p-6"
      footerClassName="flex justify-end border-t border-gray-100 bg-gray-50 p-6"
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
      <div className="space-y-8">
        <section className="space-y-4">
          <InputDokumenSectionTitle
            title="Informasi Dokumen"
            description="Ringkasan identitas dokumen, file arsip, dan status dokumen dari laporan."
          />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
            <div className="space-y-4 self-start rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Identitas Dokumen
                  </p>
                  <div className="space-y-1">
                    <h3 className="break-words text-2xl font-semibold tracking-tight text-slate-950">
                      {document.namaDokumen}
                    </h3>
                    <p className="break-words text-base font-medium text-slate-500">
                      {document.kode}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SetupStatusBadge status={document.statusPinjam} />
                  <SetupStatusBadge
                    status={document.restrict ? "Restrict" : "Non-restrict"}
                    tone={document.restrict ? "blue" : "slate"}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <DetailInfoItem
                  label="Tanggal Input"
                  value={formatDateOnly(document.tglInput)}
                />
                <DetailInfoItem
                  label="User Input"
                  value={document.userInput || EMPTY_LABEL}
                />
                <DetailInfoItem
                  label="Jenis Dokumen"
                  value={document.jenisDokumen || EMPTY_LABEL}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Keterangan
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
                  {document.detail || EMPTY_LABEL}
                </div>
              </div>
            </div>

            <div className="space-y-3 self-start rounded-2xl border border-gray-200 bg-slate-50 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                  <FileBadge2 className="size-5" strokeWidth={1.9} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-950">
                    File Dokumen
                  </h4>
                  <p className="text-sm text-slate-500">
                    Preview mengikuti file yang tersedia pada data laporan.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <DetailKeyValueRow label="Nama File">
                  <span className="font-medium text-slate-900">
                    {document.fileName || document.namaDokumen || EMPTY_LABEL}
                  </span>
                </DetailKeyValueRow>
                <DetailKeyValueRow label="Status Watermark">
                  <SetupStatusBadge
                    status={isWatermarkActive ? "Aktif" : "Nonaktif"}
                    label={isWatermarkActive ? "Aktif" : "Nonaktif"}
                    tone={isWatermarkActive ? "emerald" : "red"}
                  />
                </DetailKeyValueRow>
              </div>

              <div className="flex items-center justify-end pt-1">
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
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <InputDokumenSectionTitle
            title="Kepemilikan dan Akses"
            description="Informasi pemilik dokumen, pembuat arsip, dan user yang diberi akses langsung."
          />
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <UserRound className="size-4 text-sky-600" strokeWidth={1.9} />
                  <p className="text-sm font-semibold">PIC / Pemilik Dokumen</p>
                </div>
                <p className="text-lg font-semibold text-slate-950">
                  {getUserDisplayName(owner)}
                </p>
                <p className="text-sm text-slate-500">
                  {ownerMeta || "Informasi kontak tidak tersedia."}
                </p>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <ShieldCheck className="size-4 text-emerald-600" strokeWidth={1.9} />
                  <p className="text-sm font-semibold">Dibuat Oleh</p>
                </div>
                <p className="text-lg font-semibold text-slate-950">
                  {getUserDisplayName(document.creator)}
                </p>
                <p className="text-sm text-slate-500">
                  {creatorMeta || "Informasi kontak tidak tersedia."}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailInfoItem
                label="Divisi Pemilik"
                value={getDocumentOwnerDivision(document)}
              />
              <DetailInfoItem
                label="Debitur Terkait"
                value={getDocumentDebtorLabel(document)}
              />
              <DetailInfoItem
                label="User Terkait"
                value={
                  relatedUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {relatedUsers.map((item) => {
                        const meta = getRelatedUserMeta(item);

                        return (
                          <span
                            key={item.id}
                            className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                          >
                            <span className="truncate">
                              {getUserDisplayName(item)}
                            </span>
                            {meta ? (
                              <span className="truncate text-sky-600/80">
                                {meta}
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-slate-500">
                      Tidak ada user terkait.
                    </span>
                  )
                }
                className="md:col-span-2"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <InputDokumenSectionTitle
            title="Lokasi Penyimpanan"
            description="Lokasi fisik tempat dokumen ini disimpan dan ditelusuri."
          />
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <MapPinned className="size-4 text-sky-600" strokeWidth={1.9} />
                <p className="text-sm font-semibold">Jalur Lokasi Dokumen</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {document.storage?.officeName || EMPTY_LABEL}
                </span>
                <span className="text-slate-400">{">"}</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {document.storage?.cabinetCode || EMPTY_LABEL}
                </span>
                <span className="text-slate-400">{">"}</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {document.storage?.rackName || EMPTY_LABEL}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <DetailInfoItem
                label="Kode Kantor"
                value={document.storage?.officeCode || EMPTY_LABEL}
              />
              <DetailInfoItem
                label="Kantor"
                value={document.storage?.officeName || EMPTY_LABEL}
              />
              <DetailInfoItem
                label="Lemari"
                value={document.storage?.cabinetCode || EMPTY_LABEL}
              />
              <DetailInfoItem
                label="Rak"
                value={document.storage?.rackName || EMPTY_LABEL}
              />
              <DetailInfoItem
                label="Lokasi"
                value={getDocumentLocation(document)}
                className="md:col-span-4"
              />
            </div>
          </div>
        </section>
      </div>
    </DashboardModal>
  );
}
