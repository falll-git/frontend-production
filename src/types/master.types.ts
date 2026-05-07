export interface Division {
  id: string;
  name: string;
}

export interface DivisionPayload {
  name: string;
}

export interface TempatPenyimpanan {
  id: string | number;
  kodeKantor: string;
  namaKantor: string;
  kodeLemari: string;
  rak: string;
  kapasitas: number;
  status: "Aktif" | "Nonaktif";
}

export interface JenisDokumen {
  id: string | number;
  kode: string;
  nama: string;
  keterangan: string;
  status: "Aktif" | "Nonaktif";
}

export interface DocumentType {
  id: string | number;
  kode: string;
  nama: string;
  keterangan?: string;
  status: "Aktif" | "Nonaktif";
}

export interface DocumentTypePayload {
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Storage {
  id: string | number;
  kodeKantor: string;
  namaKantor: string;
  kodeLemari: string;
  rak: string;
  kapasitas: number;
  status: "Aktif" | "Nonaktif";
}

export interface StoragePayload {
  office_code: string;
  office_label: string;
  code: string;
  name: string;
  capacity: string;
  is_active: boolean;
}

export interface LetterPriority {
  id: string;
  name: string;
  status?: "Aktif" | "Nonaktif";
}

export interface LetterPriorityPayload {
  name: string;
}

export interface RoleRecord {
  id: string;
  name: string;
}

export interface RolePayload {
  name: string;
}

export interface MasterNotaris {
  id: number;
  nama: string;
  kantor: string;
  telepon: string;
  status: "Aktif" | "Nonaktif";
}
