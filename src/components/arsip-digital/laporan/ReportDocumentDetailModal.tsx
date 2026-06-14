"use client";

import type { ReactNode } from "react";

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

type ReadOnlyFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getUserDisplayName(user?: ArsipUserSummary | null) {
  return user?.name || user?.username || EMPTY_LABEL;
}

function getUserMeta(user?: ArsipUserSummary | null) {
  return [user?.role?.name, user?.division?.name].filter(Boolean).join(" / ");
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

function ReadOnlyField({
  label,
  children,
  className,
  contentClassName,
}: ReadOnlyFieldProps) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div
        className={joinClasses(
          "min-h-[48px] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800",
          contentClassName,
        )}
      >
        {children}
      </div>
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

  return (
    <DashboardModal
      isOpen={isOpen}
      title="Detail Dokumen"
      description={document.kode}
      onClose={onClose}
      maxWidth="4xl"
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
            description="Ringkasan dokumen arsip dari laporan, tanpa aksi operasional."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReadOnlyField
              label="Kode Dokumen"
              className="xl:col-span-2"
              contentClassName="font-semibold text-gray-900"
            >
              {document.kode}
            </ReadOnlyField>
            <ReadOnlyField label="Tanggal Input" contentClassName="font-medium text-gray-900">
              {formatDateOnly(document.tglInput)}
            </ReadOnlyField>
            <ReadOnlyField label="User Input" contentClassName="font-medium text-gray-900">
              {document.userInput || EMPTY_LABEL}
            </ReadOnlyField>
            <ReadOnlyField
              label="Nama Dokumen"
              className="xl:col-span-2"
              contentClassName="font-semibold text-gray-900"
            >
              {document.namaDokumen}
            </ReadOnlyField>
            <ReadOnlyField label="Jenis Dokumen" contentClassName="font-medium text-gray-900">
              {document.jenisDokumen}
            </ReadOnlyField>
            <ReadOnlyField label="Status">
              <div className="flex flex-wrap gap-2">
                <SetupStatusBadge status={document.statusPinjam} size="sm" />
                <SetupStatusBadge
                  status={document.restrict ? "Restrict" : "Non-restrict"}
                  tone={document.restrict ? "blue" : "slate"}
                  size="sm"
                />
              </div>
            </ReadOnlyField>
            <ReadOnlyField
              label="Keterangan"
              className="md:col-span-2 xl:col-span-4"
              contentClassName="leading-7 text-gray-700"
            >
              {document.detail || EMPTY_LABEL}
            </ReadOnlyField>
          </div>
        </section>

        <section className="space-y-4">
          <InputDokumenSectionTitle
            title="Kepemilikan dan Lokasi"
            description="PIC, divisi, lokasi penyimpanan, dan relasi debitur jika tersedia."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ReadOnlyField label="PIC / Pemilik Dokumen" className="xl:col-span-2">
              <p className="font-semibold text-gray-900">{getUserDisplayName(owner)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {ownerMeta || "Informasi role/divisi tidak tersedia."}
              </p>
            </ReadOnlyField>
            <ReadOnlyField label="Divisi" contentClassName="font-medium text-gray-900">
              {getDocumentOwnerDivision(document)}
            </ReadOnlyField>
            <ReadOnlyField label="Lokasi Penyimpanan" contentClassName="font-medium text-gray-900">
              {getDocumentLocation(document)}
            </ReadOnlyField>
            <ReadOnlyField
              label="Debitur Terkait"
              className="md:col-span-2 xl:col-span-4"
              contentClassName="font-medium text-gray-900"
            >
              {getDocumentDebtorLabel(document)}
            </ReadOnlyField>
          </div>
        </section>

        <section className="space-y-4">
          <InputDokumenSectionTitle
            title="File Dokumen"
            description="Preview hanya tersedia jika file dokumen bisa diakses dari data laporan."
          />
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {document.fileName || document.namaDokumen}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {document.fileUrl
                    ? "File dokumen tersedia untuk preview."
                    : "File dokumen tidak tersedia dari data laporan ini."}
                </p>
              </div>
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
                title={document.fileUrl ? "Preview dokumen" : "File dokumen belum tersedia"}
              />
            </div>
          </div>
        </section>
      </div>
    </DashboardModal>
  );
}
