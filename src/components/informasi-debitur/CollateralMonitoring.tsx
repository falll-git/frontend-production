"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarClock, Save } from "lucide-react";

import DashboardModal from "@/components/ui/DashboardModal";
import SetupFormSection from "@/components/ui/SetupFormSection";
import SetupStatusBadge, {
  type SetupStatusTone,
} from "@/components/ui/SetupStatusBadge";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import { formatDateOnly, formatDateTime } from "@/lib/utils/date";
import type {
  DebtorCollateral,
  DebtorCollateralExpiryPayload,
} from "@/types/debitur.types";

type MonitoringStatus =
  | DebtorCollateral["appraisal_status"]
  | DebtorCollateral["expiry_status"];

function toDateOnly(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addMonthsClamped(value: string | Date, months: number) {
  const date = toDateOnly(value);
  if (!date) return null;

  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      Math.min(date.getUTCDate(), lastDay),
    ),
  );
}

function formatPreviewDate(value: string | Date | null | undefined) {
  const date = toDateOnly(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function statusByCalendarWindow({
  dueDate,
  warningStartDate,
  now = new Date(),
}: {
  dueDate: string | Date | null;
  warningStartDate: string | Date | null;
  now?: Date;
}) {
  const due = toDateOnly(dueDate);
  const warningStart = toDateOnly(warningStartDate);
  const today = toDateOnly(now);

  if (!due || !warningStart || !today) {
    return { status: "NOT_SET" as const, label: "Tanggal Expired Belum Diisi" };
  }
  if (today.getTime() >= due.getTime()) {
    return { status: "EXPIRED" as const, label: "Sudah Berakhir" };
  }
  if (today.getTime() >= warningStart.getTime()) {
    return { status: "DUE_SOON" as const, label: "Segera Berakhir" };
  }
  return { status: "CURRENT" as const, label: "Aman" };
}

function buildExpiryPreview(hasExpiryDate: boolean, expiryDate: string) {
  if (!hasExpiryDate) {
    return {
      status: "NOT_APPLICABLE" as const,
      label: "Tidak Berlaku",
      note: "Agunan tidak memiliki tanggal expired, sehingga tidak masuk warning expired.",
    };
  }

  const warningStartDate = expiryDate ? addMonthsClamped(expiryDate, -3) : null;
  const status = statusByCalendarWindow({
    dueDate: expiryDate || null,
    warningStartDate,
  });

  return {
    ...status,
    note: expiryDate
      ? `Warning kuning dimulai ${formatPreviewDate(warningStartDate)}; merah mulai ${formatPreviewDate(expiryDate)}.`
      : "Isi tanggal expired agar status expired dapat dihitung.",
  };
}

function monitoringTone(status: MonitoringStatus): SetupStatusTone {
  if (status === "CURRENT") return "emerald";
  if (status === "DUE_SOON") return "amber";
  if (status === "OVERDUE" || status === "EXPIRED") return "red";
  return "slate";
}

export function CollateralMonitoringBadge({
  status,
  label,
}: {
  status: MonitoringStatus;
  label: string;
}) {
  return (
    <SetupStatusBadge
      status={label}
      tone={monitoringTone(status)}
      showIcon
      wrap
      className="max-w-full"
      textClassName="break-words text-center"
    />
  );
}

export function CollateralMonitoringCell({
  date,
  status,
  label,
  note,
}: {
  date: string | null;
  status: MonitoringStatus;
  label: string;
  note?: ReactNode;
}) {
  const isNotApplicable = status === "NOT_APPLICABLE";
  const resolvedNote = note ?? (isNotApplicable ? "Tidak dimonitor" : null);

  return (
    <div className="space-y-1.5">
      {!isNotApplicable ? (
        <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
          {formatDateOnly(date)}
        </p>
      ) : null}
      <CollateralMonitoringBadge
        status={status}
        label={isNotApplicable ? "Tidak Berlaku" : label}
      />
      {resolvedNote ? (
        <p className="max-w-[220px] whitespace-normal text-xs font-medium leading-5 text-slate-500">
          {resolvedNote}
        </p>
      ) : null}
    </div>
  );
}

export function CollateralExpiryModal({
  item,
  isOpen,
  onClose,
  onSave,
}: {
  item: DebtorCollateral | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: DebtorCollateralExpiryPayload) => Promise<void>;
}) {
  const [hasExpiryDate, setHasExpiryDate] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryNote, setExpiryNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const expiryPreview = useMemo(
    () => buildExpiryPreview(hasExpiryDate, expiryDate),
    [expiryDate, hasExpiryDate],
  );

  useEffect(() => {
    setHasExpiryDate(item?.has_expiry_date === true);
    setExpiryDate(item?.expiry_date?.slice(0, 10) ?? "");
    setExpiryNote(item?.expiry_note ?? "");
  }, [item]);

  const save = async () => {
    if (!item || isSaving || (hasExpiryDate && !expiryDate)) return;
    setIsSaving(true);
    try {
      await onSave({
        has_expiry_date: hasExpiryDate,
        expiry_date: hasExpiryDate ? expiryDate : null,
        expiry_note: expiryNote.trim() || null,
      });
      onClose();
    } catch {
      // Parent menampilkan pesan error dan modal tetap terbuka untuk koreksi.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardModal
      isOpen={isOpen && item !== null}
      title="Atur Monitoring Expired"
      description={item?.collateral_number ?? undefined}
      onClose={onClose}
      maxWidth="2xl"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--neutral"
            onClick={onClose}
            disabled={isSaving}
          >
            Batal
          </button>
          <button
            type="button"
            className="uiverse-modal-button uiverse-modal-button--primary"
            onClick={() => void save()}
            disabled={isSaving || (hasExpiryDate && !expiryDate)}
          >
            <Save className="size-4" aria-hidden="true" />
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      }
    >
      {item ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Agunan
              </p>
              <p className="mt-1 break-words text-base font-bold text-slate-900">
                {item.collateral_type_display ?? item.collateral_type ?? "Agunan"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {item.proof_number || item.owner_name || "Bukti kepemilikan belum tersedia"}
              </p>
            </div>
            <CollateralMonitoringBadge
              status={expiryPreview.status}
              label={expiryPreview.label}
            />
          </div>

          <SetupFormSection
            title="Masa Berlaku"
            description="Data operasional ini melekat pada agunan dan tidak ditimpa ketika A01/TXT diimpor ulang."
            contentClassName="md:grid-cols-2"
          >
            <div>
              <label
                htmlFor="collateral-has-expiry-date"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Memiliki Tanggal Expired
              </label>
              <SetupSelect
                id="collateral-has-expiry-date"
                value={hasExpiryDate ? "true" : "false"}
                onChange={(event) =>
                  setHasExpiryDate(event.target.value === "true")
                }
              >
                <option value="true">Ya</option>
                <option value="false">Tidak</option>
              </SetupSelect>
            </div>
            <div>
              <label
                htmlFor="collateral-expiry-date"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Tanggal Expired{hasExpiryDate ? " *" : ""}
              </label>
              <SetupTextInput
                id="collateral-expiry-date"
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                disabled={!hasExpiryDate}
                required={hasExpiryDate}
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="collateral-expiry-note"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Keterangan Expired
              </label>
              <SetupTextarea
                id="collateral-expiry-note"
                rows={3}
                maxLength={1000}
                value={expiryNote}
                onChange={(event) => setExpiryNote(event.target.value)}
                placeholder="Tambahkan keterangan masa berlaku jika diperlukan"
              />
            </div>
          </SetupFormSection>

          <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <CalendarClock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p className="leading-6">
              {expiryPreview.note} Status ini hanya berlaku jika agunan diset
              memiliki tanggal expired; jika tidak, tabel menampilkan status{" "}
              <strong>Tidak Berlaku</strong>.
            </p>
          </div>

          {item.expiry_updated_at ? (
            <p className="text-xs leading-5 text-slate-500">
              Perubahan terakhir oleh{" "}
              <strong>{item.expiry_updater?.name ?? "Pengguna tidak tersedia"}</strong>{" "}
              pada {formatDateTime(item.expiry_updated_at)}.
            </p>
          ) : null}
        </div>
      ) : null}
    </DashboardModal>
  );
}
