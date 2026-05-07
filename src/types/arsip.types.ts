import type { DataAccessLevel } from "@/lib/rbac";

export type ArsipUserSummary = {
  id: string;
  name: string;
  username: string;
  email: string;
};

export type ArsipStorageSummary = {
  id: string;
  officeId: string | null;
  officeCode: string | null;
  officeName: string | null;
  cabinetId: string | null;
  cabinetCode: string | null;
  rackName: string | null;
  capacity: number;
  isActive: boolean;
  locationLabel: string;
};

export type DokumenAvailabilityKey =
  | "AVAILABLE"
  | "REQUESTED"
  | "PROCESSING"
  | "BORROWED";

export type DokumenAvailabilityLabel =
  | "Tersedia"
  | "Diajukan"
  | "Dalam Proses"
  | "Dipinjam";

export type AccessRequestStatusKey = "PENDING" | "APPROVED" | "REJECTED";
export type AccessRequestStatusLabel =
  | "Menunggu Persetujuan"
  | "Disetujui"
  | "Ditolak";

export type LoanStatusKey =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "HANDED_OVER"
  | "BORROWED"
  | "RETURNED"
  | "OVERDUE";

export type LoanStatusLabel =
  | "Menunggu Persetujuan"
  | "Disetujui"
  | "Ditolak"
  | "Sudah Diserahkan"
  | "Dipinjam"
  | "Dikembalikan"
  | "Terlambat";

export interface Dokumen {
  id: string;
  kode: string;
  jenisDokumen: string;
  namaDokumen: string;
  detail: string;
  tglInput: string;
  userInput: string;
  tempatPenyimpanan?: string;
  tempatPenyimpananId?: string;
  statusPinjam: DokumenAvailabilityLabel;
  statusPeminjaman?: DokumenAvailabilityLabel;
  statusPinjamKey?: DokumenAvailabilityKey;
  levelAkses: DataAccessLevel;
  restrict: boolean;
  fileUrl?: string;
  fileName?: string;
  creator?: ArsipUserSummary | null;
  storage?: ArsipStorageSummary | null;
  currentLoan?: Peminjaman | null;
  accessRequestSummary?: {
    pendingCount: number;
  };
  loanSummary?: {
    totalCount: number;
  };
}

export interface Disposisi {
  id: string;
  dokumenId: string;
  detail: string;
  pemohon: string;
  pemilik: string;
  tglPengajuan: string;
  status: AccessRequestStatusLabel;
  statusKey: AccessRequestStatusKey;
  alasanPengajuan: string;
  tglExpired: string | null;
  tglAksi: string | null;
  alasanAksi: string | null;
  canViewDocument: boolean;
  isActiveAccess: boolean;
  document?: Dokumen | null;
  requester?: ArsipUserSummary | null;
  owner?: ArsipUserSummary | null;
  actor?: ArsipUserSummary | null;
}

export interface Peminjaman {
  id: string;
  dokumenId: string;
  detail: string;
  peminjam: string;
  tglPinjam: string;
  tglKembali: string;
  tglPengembalian: string | null;
  status: LoanStatusLabel;
  statusKey: LoanStatusKey;
  alasan: string;
  approver: string | null;
  tglApprove: string | null;
  jamApprove: string | null;
  alasanApprove: string | null;
  tanggalTolak: string | null;
  alasanTolak: string | null;
  tglPenyerahan: string | null;
  catatanPenyerahan: string | null;
  tanggalDikembalikan: string | null;
  catatanPengembalian: string | null;
  isTerlambat: boolean;
  borrower?: ArsipUserSummary | null;
  approverUser?: ArsipUserSummary | null;
  rejectorUser?: ArsipUserSummary | null;
  handoverActor?: ArsipUserSummary | null;
  returnActor?: ArsipUserSummary | null;
  document?: Dokumen | null;
}

export interface AktivitasPenyimpanan {
  id: string;
  actionKey: string;
  actionLabel: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
  actor?: ArsipUserSummary | null;
  document?: {
    id: string;
    documentNumber: string;
    documentName: string;
  } | null;
  fromStorage?: ArsipStorageSummary | null;
  toStorage?: ArsipStorageSummary | null;
}

export interface Kantor {
  id: string;
  namaKantor: string;
  kodeKantor?: string;
  totalDokumen?: number;
  jumlahLemari?: number;
  dokumenDisposisi?: number;
  dokumenDipinjam?: number;
  dokumenDipinjamJatuhTempo?: number;
}

export interface Lemari {
  id: string;
  kantorId: string;
  kodeLemari: string;
  jumlahRak?: number;
  totalDokumen?: number;
  dokumenDisposisi?: number;
  dokumenDipinjam?: number;
  dokumenDipinjamJatuhTempo?: number;
}

export interface Rak {
  id: string;
  lemariId: string;
  namaRak: string;
  totalArsip: number;
  kapasitas?: number;
  status?: "Aktif" | "Nonaktif";
  totalDokumen?: number;
  dokumenDisposisi?: number;
  dokumenDipinjam?: number;
  dokumenDipinjamJatuhTempo?: number;
}

export type DokumenArsipJenis = "DIGITAL" | "FISIK";
export type DokumenArsipKategori =
  | "Perusahaan"
  | "Pembiayaan"
  | "Karyawan"
  | "Voucher";

export interface DokumenArsip {
  id: string;
  rakId: string;
  namaDokumen: string;
  jenisDokumen: DokumenArsipKategori;
  jenis: DokumenArsipJenis;
  tanggalInput: string;
  kode?: string;
  keterangan?: string;
  fileUrl?: string;
}

