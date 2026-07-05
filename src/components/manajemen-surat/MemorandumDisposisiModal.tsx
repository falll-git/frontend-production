"use client";

import type { CSSProperties } from "react";
import {
  Clock3,
  FileText,
  History,
  Send,
  UserRound,
  Users,
} from "lucide-react";
import type { Memorandum, SuratUser } from "@/types/surat.types";
import BasicDateInput from "@/components/ui/BasicDateInput";
import DashboardModal from "@/components/ui/DashboardModal";
import SetupEmptyState from "@/components/ui/SetupEmptyState";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextarea from "@/components/ui/SetupTextarea";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import {
  DispositionDetailItem,
  DispositionSectionPanel,
  type DispositionActionMode,
  getDispositionActionLabel,
  getCleanUserName,
  getUserMeta,
  getUserSearchText,
  mapDispositionStatusBadge,
} from "@/components/manajemen-surat/DispositionModalParts";
import {
  SETUP_PAGE_BACK_BUTTON_CLASS,
  SETUP_PAGE_PRIMARY_BUTTON_CLASS,
} from "@/components/ui/setupPageStyles";
import { formatDate, formatDateTime } from "@/lib/utils/date";

interface MemorandumDisposisiModalProps {
  memorandum: Memorandum | null;
  isOpen: boolean;
  actionMode?: DispositionActionMode;
  users: SuratUser[];
  selectedUserIds: string[];
  userSearch: string;
  dueDate: string;
  catatan: string;
  isSubmitting: boolean;
  onToggleSelectedUser: (value: string) => void;
  onChangeUserSearch: (value: string) => void;
  onChangeDueDate: (value: string) => void;
  onChangeCatatan: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function MemorandumDisposisiModal({
  memorandum,
  isOpen,
  actionMode = "disposisi",
  users,
  selectedUserIds,
  userSearch,
  dueDate,
  catatan,
  isSubmitting,
  onToggleSelectedUser,
  onChangeUserSearch,
  onChangeDueDate,
  onChangeCatatan,
  onClose,
  onSubmit,
}: MemorandumDisposisiModalProps) {
  if (!memorandum || !isOpen) return null;

  const actionLabel = getDispositionActionLabel(actionMode);
  const receiverLabel =
    actionMode === "redisposisi" ? "Penerima Berikutnya" : "Penerima Disposisi";
  const description =
    actionMode === "redisposisi"
      ? "Pilih satu atau lebih penerima berikutnya, tenggat opsional, dan instruksi singkat."
      : "Pilih satu atau lebih penerima disposisi, tenggat opsional, dan instruksi singkat.";

  const historyItems = [...memorandum.disposisi_history].sort(
    (left, right) => (left.sequence ?? 0) - (right.sequence ?? 0),
  );
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUsers = users.filter((item) =>
    getUserSearchText(item).includes(normalizedUserSearch),
  );
  const currentHolderLabel =
    memorandum.current_holder_names.length > 0
      ? memorandum.current_holder_names.join(", ")
      : "Belum ada";
  const targetDivisionLabel =
    memorandum.divisiTujuanAwal.length > 0
      ? memorandum.divisiTujuanAwal.join(", ")
      : "Belum ada";

  return (
    <DashboardModal
      isOpen={isOpen}
      title={`${actionLabel} Memorandum`}
      description={memorandum.noMemo}
      onClose={onClose}
      closeDisabled={isSubmitting}
      maxWidth="5xl"
      bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto bg-slate-50 p-6"
      footerClassName="flex flex-col gap-3 border-t border-slate-100 bg-white px-7 py-5 sm:flex-row sm:justify-end"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={SETUP_PAGE_BACK_BUTTON_CLASS}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={selectedUserIds.length === 0 || isSubmitting}
            className={SETUP_PAGE_PRIMARY_BUTTON_CLASS}
          >
            {isSubmitting ? (
              <>
                <div
                  className="button-spinner"
                  style={
                    {
                      ["--spinner-size"]: "18px",
                      ["--spinner-border"]: "2px",
                    } as CSSProperties
                  }
                  aria-hidden="true"
                />
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>Kirim {actionLabel}</span>
              </>
            )}
          </button>
        </>
      }
    >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              <DispositionSectionPanel
                title="Informasi Memo"
                icon={<FileText className="h-5 w-5" aria-hidden="true" />}
              >
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <DispositionDetailItem
                    label="No Memo"
                    value={memorandum.noMemo}
                  />
                  <DispositionDetailItem
                    label="Tanggal Memo"
                    value={formatDate(memorandum.tanggal)}
                  />
                  <DispositionDetailItem
                    label="Divisi Asal"
                    value={memorandum.divisiAsal}
                  />
                  <DispositionDetailItem
                    label="Tujuan Awal"
                    value={targetDivisionLabel}
                  />
                  <DispositionDetailItem
                    label="Pembuat Memo"
                    value={memorandum.pembuatMemo}
                  />
                  <DispositionDetailItem
                    label="Penerima Aktif"
                    value={currentHolderLabel}
                  />
                  <DispositionDetailItem
                    label="Penyimpanan Fisik"
                    value={memorandum.physicalStorageLabel ?? "-"}
                    className="sm:col-span-2"
                  />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                    <DispositionDetailItem
                      label="Perihal Memo"
                      value={memorandum.perihal}
                    />
                  </div>
                </div>
              </DispositionSectionPanel>

              <DispositionSectionPanel
                title={`Alur ${actionLabel}`}
                icon={<Users className="h-5 w-5" aria-hidden="true" />}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Pemegang Saat Ini
                    </p>
                    <p className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-900">
                      {currentHolderLabel}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Holder Terakhir
                    </p>
                    <p className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-900">
                      {memorandum.last_holder_name ?? "Belum ada"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      Aktif
                    </p>
                    <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-900">
                      {memorandum.active_dispositions_count} disposisi
                    </p>
                  </div>
                </div>
              </DispositionSectionPanel>

              <DispositionSectionPanel
                title={`Riwayat ${actionLabel}`}
                icon={<History className="h-5 w-5" aria-hidden="true" />}
              >
                {historyItems.length === 0 ? (
                  <SetupEmptyState
                    title={`Belum ada riwayat ${actionLabel.toLowerCase()}.`}
                    description="Riwayat akan tampil setelah memorandum diproses atau diteruskan."
                    icon={History}
                    tone="import"
                    variant="panel"
                  />
                ) : (
                  <ol className="space-y-3">
                    {historyItems.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <SetupStatusBadge
                                status="Urutan"
                                label={(item.sequence ?? 0)
                                  .toString()
                                  .padStart(2, "0")}
                              />
                              <span className="break-words text-sm font-bold text-slate-900">
                                {item.timeline_label}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <UserRound
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {formatDateTime(item.created_at)}
                              </span>
                              {item.due_date ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  Tenggat {formatDate(item.due_date)}
                                </span>
                              ) : null}
                            </div>

                            {item.catatan ? (
                              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
                                {item.catatan}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <SetupStatusBadge
                              status={mapDispositionStatusBadge(
                                item.status_key,
                                item.status_label,
                              )}
                            />
                            {item.is_current ? (
                              <SetupStatusBadge status="Aktif" />
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </DispositionSectionPanel>
            </div>

            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:self-start">
              <div className="mb-5 flex items-start gap-3">
                <Send className="h-6 w-6 shrink-0 text-slate-900" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {actionLabel}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {receiverLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <SetupSearchInput
                      value={userSearch}
                      onChange={(event) => onChangeUserSearch(event.target.value)}
                      placeholder="Cari nama, role, atau divisi..."
                    />

                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {filteredUsers.length === 0 ? (
                        <div className="px-4 py-4 text-sm font-medium text-slate-500">
                          User tidak ditemukan.
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto">
                          {filteredUsers.map((item) => {
                            const isSelected = selectedUserIds.includes(item.id);
                            const meta = getUserMeta(item);

                            return (
                              <div
                                key={item.id}
                                className={`border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 ${
                                  isSelected
                                    ? "bg-sky-50"
                                    : "bg-white hover:bg-slate-50"
                                }`}
                              >
                                <UiverseCheckbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    onToggleSelectedUser(item.id)
                                  }
                                  className="uiverse-checkbox--block"
                                  size={20}
                                  label={
                                    <span className="block min-w-0">
                                      <span className="block truncate text-sm font-bold text-slate-800">
                                        {getCleanUserName(item)}
                                      </span>
                                      {meta ? (
                                        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                                          {meta}
                                        </span>
                                      ) : null}
                                    </span>
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tenggat {actionLabel}
                  </label>
                  <BasicDateInput
                    value={dueDate}
                    onChange={onChangeDueDate}
                    placeholder="Pilih tanggal..."
                  />
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Kosongkan jika langkah baru ini tidak memiliki tenggat waktu.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Instruksi {actionLabel}
                  </label>
                  <SetupTextarea
                    value={catatan}
                    onChange={(event) => onChangeCatatan(event.target.value)}
                    rows={4}
                    className="resize-none"
                    placeholder="Tulis instruksi singkat untuk penerima..."
                  />
                </div>

              </div>
            </aside>
          </div>
    </DashboardModal>
  );
}
