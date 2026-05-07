export type PihakKetigaKategori = "NOTARIS" | "ASURANSI" | "KJPP";

export interface PihakKetiga {
  id: string;
  nama: string;
  kategori: PihakKetigaKategori;
  kodeDokumen: string;
  jenisDokumen: string;
  namaDokumen: string;
  detailDokumen: string;
  tanggalInput: string;
  userInput: string;
  fileUrl?: string;
  fileType?: "pdf" | "image";
  prosesBerjalan: number;
  laporanSelesai: number;
  lewatExpired: number;
}

export interface PihakKetigaSummary {
  kategori: PihakKetigaKategori;
  jumlahPihakKetiga: number;
  prosesBerjalan: number;
  laporanSelesai: number;
  lewatExpired: number;
}

export type ProgressPihakKetigaStatus = "PROSES" | "SELESAI" | "EXPIRED";

export interface ProgressPihakKetiga {
  id: string;
  pihakKetigaId: string;
  namaNasabah: string;
  noKontrak: string;
  status: ProgressPihakKetigaStatus;
  tanggalMulai: string;
  tanggalSelesai?: string;
  keterangan?: string;
}

export interface KolektibilitasItem {
  kol: number;
  label: string;
  jumlahNasabah: number;
  outstandingPokok: number;
}

export interface RiwayatNPF {
  tahun: number;
  bulan: number;
  namaBulan: string;
  jumlahNasabah: number;
  outstandingPokok: number;
  rasioNPF: number;
}

export type NpfKolektibilitasLevel = 1 | 2 | 3 | 4 | 5;

export interface KolektibilitasNasabahItem {
  nama: string;
  noKontrak: string;
  outstandingPokok: number;
  sisaBulan: number;
  kolektibilitas: NpfKolektibilitasLevel;
}

export type JenisTitipan = "NOTARIS" | "ASURANSI" | "ANGSURAN";

export interface TitipanNasabah {
  id: string;
  nama: string;
  jenisTitipan: JenisTitipan;
  pihakKetigaId?: string | null;
  totalTitipan: number;
  saldoTerbayar: number;
  sisaSaldo: number;
}

export interface TitipanSummary {
  jenisTitipan: JenisTitipan;
  totalTitipan: number;
  saldoTerbayar: number;
  sisaSaldo: number;
  jumlahNasabah: number;
  lunas: boolean;
}

export interface DashboardSummary {
  total: number;
  label: string;
}

export interface MarketingActivity {
  id: string;
  label: string;
  value: number;
}

export interface NotificationItem {
  id: number | string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}
