"use client";

import type { CSSProperties } from "react";
import {
  CircleDot,
  Clock3,
  PlayCircle,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import type { SuratMasuk, SuratUser } from "@/types/surat.types";
import { formatDate, formatDateTime } from "@/lib/utils/date";

interface SuratMasukDisposisiModalProps {
  surat: SuratMasuk | null;
  isOpen: boolean;
  users: SuratUser[];
  selectedUserId: string;
  userSearch: string;
  catatan: string;
  isSubmitting: boolean;
  onChangeSelectedUser: (value: string) => void;
  onChangeUserSearch: (value: string) => void;
  onChangeCatatan: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function ReadonlyField({
  label,
  value,
  className = "",
  multiline = false,
}: {
  label: string;
  value: string;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          readOnly
          rows={3}
          className="textarea resize-none !cursor-default !bg-gray-50 !text-gray-700"
        />
      ) : (
        <input
          value={value}
          readOnly
          className="input !cursor-default !bg-gray-50 !text-gray-700"
        />
      )}
    </div>
  );
}

function getDispositionStatusClass(status: string) {
  if (status === "COMPLETED") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (status === "IN_PROGRESS") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "FORWARDED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getDispositionStatusClass(status)}`}
    >
      {label}
    </span>
  );
}

export default function SuratMasukDisposisiModal({
  surat,
  isOpen,
  users,
  selectedUserId,
  userSearch,
  catatan,
  isSubmitting,
  onChangeSelectedUser,
  onChangeUserSearch,
  onChangeCatatan,
  onClose,
  onSubmit,
}: SuratMasukDisposisiModalProps) {
  if (!surat || !isOpen) return null;

  const historyItems = [...surat.disposisi_history].sort(
    (left, right) => (left.sequence ?? 0) - (right.sequence ?? 0),
  );
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUsers = users.filter((item) =>
    item.nama.toLowerCase().includes(normalizedUserSearch),
  );
  const selectedUser = users.find((item) => item.id === selectedUserId) ?? null;

  return (
    <div
      data-dashboard-overlay="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: "rgba(0, 0, 0, 0.4)",
      }}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Send className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Disposisi Surat Masuk
              </h2>
              <p className="mt-1 text-sm text-gray-500">{surat.namaSurat}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" title="Tutup">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-y-auto border-r border-gray-100 bg-white px-6 py-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ReadonlyField label="Nomor Surat" value={surat.namaSurat} />
              <ReadonlyField
                label="Tanggal Penerimaan"
                value={formatDate(surat.tanggalTerima)}
              />
              <ReadonlyField label="Asal Surat" value={surat.pengirim} />
              <ReadonlyField
                label="Divisi Tujuan Awal"
                value={
                  surat.targetDivisionNames && surat.targetDivisionNames.length > 0
                    ? surat.targetDivisionNames.join(", ")
                    : "Belum ada"
                }
              />
              <ReadonlyField
                label="Disposisi Aktif"
                value={
                  surat.current_holder_names.length > 0
                    ? surat.current_holder_names.join(", ")
                    : "Belum ada"
                }
              />
              <ReadonlyField
                label="Perihal Surat"
                value={surat.perihal}
                className="md:col-span-2"
                multiline
              />
            </div>

            <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-sky-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-gray-800">
                  Ringkasan Alur
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Pemegang Saat Ini
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {surat.current_holder_names.length > 0
                      ? surat.current_holder_names.join(", ")
                      : "Tidak ada"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Holder Terakhir
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {surat.last_holder_name ?? "Belum ada"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Disposisi Aktif
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {surat.active_dispositions_count}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-sky-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-gray-800">
                  Riwayat Disposisi
                </h3>
              </div>

              {historyItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
                  Belum ada riwayat disposisi.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-sky-100 px-2 text-xs font-semibold text-sky-700">
                              {(item.sequence ?? 0).toString().padStart(2, "0")}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {item.timeline_label}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatDateTime(item.created_at)}
                            </span>
                            {item.due_date ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                Tenggat {formatDate(item.due_date)}
                              </span>
                            ) : null}
                          </div>

                          {item.catatan ? (
                            <p className="mt-3 text-sm leading-6 text-gray-600">
                              {item.catatan}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            label={item.status_label}
                            status={item.status_key}
                          />
                          {item.is_current ? (
                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                              Aktif
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-y-auto bg-gray-50/60 px-6 py-6">
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Send className="h-4 w-4 text-sky-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-gray-800">
                  Kirim Redisposisi
                </h3>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tujuan Disposisi <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                        aria-hidden="true"
                      />
                      <input
                        value={userSearch}
                        onChange={(event) => onChangeUserSearch(event.target.value)}
                        className="input input-with-icon"
                        placeholder="Cari nama user tujuan disposisi..."
                      />
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                      {filteredUsers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          User tidak ditemukan.
                        </div>
                      ) : (
                        <div className="max-h-52 overflow-y-auto">
                          {filteredUsers.map((item) => {
                            const isSelected = item.id === selectedUserId;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => onChangeSelectedUser(item.id)}
                                className={`w-full border-b border-slate-100 px-4 py-3 text-left text-sm transition-colors last:border-b-0 ${
                                  isSelected
                                    ? "bg-sky-50 font-semibold text-sky-700"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {item.nama}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedUser ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                      Tujuan Terpilih
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {selectedUser.nama}
                      </p>
                      <button
                        type="button"
                        onClick={() => onChangeSelectedUser("")}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Alasan / Instruksi Redisposisi
                  </label>
                  <textarea
                    value={catatan}
                    onChange={(event) => onChangeCatatan(event.target.value)}
                    rows={5}
                    className="textarea resize-none"
                    placeholder="Tulis catatan atau instruksi singkat untuk penerima berikutnya..."
                  />
                </div>

                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <PlayCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
                      aria-hidden="true"
                    />
                    <p className="text-sm leading-6 text-gray-600">
                      Redisposisi akan membuat langkah baru di alur surat. Langkah
                      yang aktif saat ini akan ditandai <strong>Diteruskan</strong>,
                      lalu penerima baru akan menjadi pemegang disposisi berikutnya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-7 py-5 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="btn btn-outline">
            Batal
          </button>
          <button
            onClick={onSubmit}
            disabled={!selectedUserId || isSubmitting}
            className="btn btn-upload"
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
                <span>Kirim Redisposisi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
