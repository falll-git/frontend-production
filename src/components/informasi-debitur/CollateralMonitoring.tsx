"use client";

import { useEffect, useState } from "react";
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
}: {
  date: string | null;
  status: MonitoringStatus;
  label: string;
}) {
  const isNotApplicable = status === "NOT_APPLICABLE";

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
              status={item.expiry_status}
              label={item.expiry_status_label}
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
              Status kuning dimulai tepat <strong>3 bulan kalender</strong>{" "}
              sebelum tanggal expired. Status merah dimulai tepat pada tanggal
              expired dan tetap merah setelah tanggal tersebut.
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
