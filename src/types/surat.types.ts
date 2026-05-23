import type { WatermarkFileMeta } from "@/types/watermark.types";

export interface SuratUser {
  id: string;
  nama: string;
  divisi: string;
  username?: string;
  email?: string | null;
  roleId?: string;
  roleName?: string;
  divisionId?: string;
}

export interface PhysicalStorageSummary {
  id: string;
  officeId?: string | null;
  officeCode?: string | null;
  officeName?: string | null;
  cabinetId?: string | null;
  cabinetCode?: string | null;
  rackName?: string | null;
  capacity: number;
  isActive: boolean;
  locationLabel: string;
}

export type DispositionWorkflowStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FORWARDED";

export type SuratMasukStatus =
  | "BARU"
  | "DIDISPOSISI"
  | "SELESAI"
  | "TERLAMBAT";

export interface DispositionHolderSummary {
  id: string;
  name: string;
  email?: string | null;
  status_key: DispositionWorkflowStatus;
  status_label: string;
}

export interface DispositionWorkflowMeta {
  parent_disposition_id: string | null;
  status: DispositionWorkflowStatus;
  status_key: DispositionWorkflowStatus;
  status_label: string;
  sequence: number | null;
  is_current: boolean;
  timeline_label: string;
  can_start: boolean;
  can_complete: boolean;
  can_redispose: boolean;
}

export interface SuratDisposisi extends DispositionWorkflowMeta {
  id: string;
  surat_masuk_id: string;
  dari_user_id: string;
  dari_user_nama: string;
  ke_user_id: string;
  ke_user_nama: string;
  catatan: string | null;
  created_at: string;
  disposed_at: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  is_disposisi_ulang: boolean;
}

export type SifatSurat =
  | "Biasa"
  | "Terbatas"
  | "Rahasia"
  | "Sangat Rahasia";

export interface SuratMasuk {
  id: string | number;
  namaSurat: string;
  pengirim: string;
  alamatPengirim: string;
  perihal: string;
  keterangan?: string;
  tanggalTerima: string;
  sifat: SifatSurat;
  letterPrioritieId?: string;
  disposisiKepada: string[];
  statusDisposisi: "Pending" | "Dalam Proses" | "Selesai" | "Terlambat";
  status: SuratMasukStatus;
  statusKey?: string;
  statusLabel?: string;
  disposisi_history: SuratDisposisi[];
  current_holders: DispositionHolderSummary[];
  current_holder_names: string[];
  active_dispositions_count: number;
  last_holder: DispositionHolderSummary | null;
  last_holder_name?: string | null;
  fileName: string;
  fileUrl?: string;
  watermark?: WatermarkFileMeta | null;
  storageId?: string;
  storage?: PhysicalStorageSummary | null;
  physicalStorageLabel?: string;
  tenggatWaktu?: string;
  keteranganTenggat?: string;
  targetDivisionIds?: string[];
  targetDivisionNames?: string[];
  targetManagerIds?: string[];
  createdBy?: string;
}

export interface SuratKeluar {
  id: string | number;
  namaSurat: string;
  penerima: string;
  alamatPenerima: string;
  tanggalKirim: string;
  media: string;
  sifat: SifatSurat;
  fileName: string;
  fileUrl?: string;
  watermark?: WatermarkFileMeta | null;
  storageId?: string;
  storage?: PhysicalStorageSummary | null;
  physicalStorageLabel?: string;
  letterPrioritieId?: string;
  statusCode?: number;
  statusLabel: string;
  mailNumberRaw?: string;
  mediaRaw?: string;
  targetKirimAt?: string;
  responseDueDate?: string;
  tenggatWaktu?: string;
  keteranganTenggat?: string;
  followUpStatus?: string;
  followUpStatusLabel?: string;
  isFollowUpOverdue?: boolean;
  createdBy?: string;
  creatorDivisionId?: string;
}

export interface MemorandumDisposisi extends DispositionWorkflowMeta {
  id: string;
  memorandum_id: string;
  dari_user_id: string;
  dari_user_nama: string;
  ke_user_id: string;
  ke_user_nama: string;
  catatan: string | null;
  created_at: string;
  disposed_at: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  is_disposisi_ulang: boolean;
}

export interface Memorandum {
  id: string | number;
  noMemo: string;
  perihal: string;
  divisiAsal: string;
  divisiTujuanAwal: string[];
  pembuatMemo: string;
  tanggal: string;
  keterangan: string;
  penerimaTipe: "divisi" | "perorangan";
  penerima: string[];
  fileName: string;
  fileUrl?: string;
  watermark?: WatermarkFileMeta | null;
  storageId?: string;
  storage?: PhysicalStorageSummary | null;
  physicalStorageLabel?: string;
  statusCode?: number;
  statusKey?: string;
  statusLabel?: string;
  originDivisionId?: string;
  originDivisionName?: string;
  receivedDate?: string;
  targetDivisionIds?: string[];
  targetDivisionNames?: string[];
  targetManagerIds?: string[];
  createdBy?: string;
  creatorDivisionId?: string;
  disposisi_history: MemorandumDisposisi[];
  current_holders: DispositionHolderSummary[];
  current_holder_names: string[];
  active_dispositions_count: number;
  last_holder: DispositionHolderSummary | null;
  last_holder_name?: string | null;
  tenggatWaktu?: string;
  keteranganTenggat?: string;
  followUpStatus?: string;
  followUpStatusLabel?: string;
  isFollowUpOverdue?: boolean;
}

export interface IncomingDispositionPayload {
  receiver_id: string;
  note?: string;
  due_date?: string;
}

export interface IncomingMailPayload {
  letter_prioritie_id: string;
  storage_id: string;
  target_division_id?: string;
  target_division_ids?: string[];
  regarding: string;
  receive_date: string;
  mail_number: string;
  name: string;
  description?: string;
  note?: string;
  due_date?: string;
  file?: File;
  address: string;
}

export interface IncomingRedispositionPayload {
  receiver_id?: string;
  receiver_ids?: string[];
  note?: string;
  start_date?: string;
  due_date?: string;
}

export interface UpdateDispositionStatusPayload {
  status: Extract<DispositionWorkflowStatus, "IN_PROGRESS" | "COMPLETED">;
}

export interface OutgoingMailPayload {
  letter_prioritie_id: string;
  storage_id: string;
  delivery_media: string;
  send_date: string;
  mail_number: string;
  name: string;
  file?: File;
  address: string;
  send_due_date?: string;
  response_due_date?: string;
  follow_up_note?: string;
}

export interface MemorandumPayload {
  origin_division_id: string;
  storage_id: string;
  target_division_id?: string;
  target_division_ids?: string[];
  regarding: string;
  memo_date: string;
  received_date: string;
  memo_number: string;
  description?: string;
  note?: string;
  due_date?: string;
  file?: File;
}

export interface MemorandumRedispositionPayload {
  receiver_id?: string;
  receiver_ids?: string[];
  note?: string;
  start_date?: string;
  due_date?: string;
}

export interface CorrespondenceSummaryBucket {
  total: number;
  baru?: number;
  dalam_proses?: number;
  selesai?: number;
  terlambat?: number;
  aktif?: number;
  nonaktif?: number;
}

export type CorrespondenceReportScope = "my" | "division" | "all";

export type CorrespondenceMyReportFilter =
  | "all"
  | "active"
  | "completed"
  | "forwarded";

export interface CorrespondenceReportFilters {
  scope: CorrespondenceReportScope;
  requested_scope?: CorrespondenceReportScope | null;
  available_scopes: CorrespondenceReportScope[];
  can_report_all: boolean;
  can_view_division?: boolean;
  my_filter: CorrespondenceMyReportFilter | null;
  scope_applies_to?: string[];
  document_scopes?: Record<string, unknown>;
}

export interface CorrespondenceReportSummary {
  incoming_mails: CorrespondenceSummaryBucket;
  outgoing_mails: CorrespondenceSummaryBucket;
  memorandums: CorrespondenceSummaryBucket;
  total_documents: number;
}

export interface CorrespondencePrintableItem {
  id: string;
  kind: "incoming-mail" | "outgoing-mail" | "memorandum";
  document_number: string;
  subject: string;
  primary_text: string;
  secondary_text: string;
  document_date: string;
  status_key: string;
  status_label: string;
  file_name: string;
  file_url?: string;
  storage_id?: string;
  storage?: PhysicalStorageSummary | null;
  physical_storage_label?: string;
  record: SuratMasuk | SuratKeluar | Memorandum;
}
