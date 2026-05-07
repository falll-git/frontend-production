import type {
  Disposisi,
  Dokumen,
  DokumenArsip,
  Kantor,
  Lemari,
  Peminjaman,
  Rak,
} from "@/types/arsip.types";
import { parseDateString } from "@/lib/utils/date";
import type { Storage } from "@/types/master.types";

type StorageStatus = "Aktif" | "Nonaktif";

export type StorageLemari = Lemari & {
  kapasitas?: number;
  status?: StorageStatus;
};

export type StorageRak = Rak & {
  kapasitas?: number;
  status?: StorageStatus;
};

export type StorageDokumenArsip = DokumenArsip & {
  kode?: string;
  keterangan?: string;
  fileUrl?: string;
};

export type ArsipDigitalStorageData = {
  kantorList: Kantor[];
  lemariList: StorageLemari[];
  rakList: StorageRak[];
  dokumenArsipList: StorageDokumenArsip[];
  totalDokumenByKantor: Map<string, number>;
  jumlahLemariByKantor: Map<string, number>;
  disposisiByKantor: Map<string, number>;
  peminjamanByKantor: Map<string, number>;
  jatuhTempoByKantor: Map<string, number>;
  totalDokumenByLemariId: Map<string, number>;
  jumlahRakByLemariId: Map<string, number>;
  disposisiByLemariId: Map<string, number>;
  dipinjamByLemariId: Map<string, number>;
  jatuhTempoByLemariId: Map<string, number>;
};

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getLemariId(item: Storage): string {
  return `${item.kodeKantor}::${item.kodeLemari}`;
}

function incrementCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function resolveStatus(
  current: StorageStatus | undefined,
  next: StorageStatus,
): StorageStatus {
  if (!current) return next;
  if (current === "Aktif" || next === "Aktif") return "Aktif";
  return "Nonaktif";
}

function mapJenisDokumen(
  jenisDokumen: string,
): DokumenArsip["jenisDokumen"] {
  switch (jenisDokumen) {
    case "Pembiayaan":
    case "Karyawan":
    case "Voucher":
      return jenisDokumen;
    case "Perusahaan":
    default:
      return "Perusahaan";
  }
}

export function buildArsipDigitalStorageData({
  tempatPenyimpanan,
  dokumen,
  disposisi,
  peminjaman,
  today = new Date(),
}: {
  tempatPenyimpanan: Storage[];
  dokumen: Dokumen[];
  disposisi: Disposisi[];
  peminjaman: Peminjaman[];
  today?: Date;
}): ArsipDigitalStorageData {
  const kantorMap = new Map<string, Kantor>();
  const lemariMap = new Map<string, StorageLemari>();
  const rakList: StorageRak[] = [];
  const dokumenArsipList: StorageDokumenArsip[] = [];

  const tempatById = new Map<string | number, Storage>();
  const lemariIdByTempatId = new Map<string | number, string>();
  const kantorIdByTempatId = new Map<string | number, string>();
  const rakById = new Map<string, StorageRak>();
  const dokumenById = new Map<string, Dokumen>();

  const totalDokumenByKantor = new Map<string, number>();
  const jumlahLemariByKantor = new Map<string, number>();
  const disposisiByKantor = new Map<string, number>();
  const peminjamanByKantor = new Map<string, number>();
  const jatuhTempoByKantor = new Map<string, number>();
  const totalDokumenByLemariId = new Map<string, number>();
  const jumlahRakByLemariId = new Map<string, number>();
  const disposisiByLemariId = new Map<string, number>();
  const dipinjamByLemariId = new Map<string, number>();
  const jatuhTempoByLemariId = new Map<string, number>();

  tempatPenyimpanan.forEach((item) => {
    const lemariId = getLemariId(item);

    kantorMap.set(item.kodeKantor, {
      id: item.kodeKantor,
      namaKantor: item.namaKantor,
    });

    if (!lemariMap.has(lemariId)) {
      lemariMap.set(lemariId, {
        id: lemariId,
        kantorId: item.kodeKantor,
        kodeLemari: item.kodeLemari,
        kapasitas: 0,
        status: item.status,
      });
      incrementCount(jumlahLemariByKantor, item.kodeKantor);
    }

    const existingLemari = lemariMap.get(lemariId);
    if (existingLemari) {
      existingLemari.kapasitas = (existingLemari.kapasitas ?? 0) + item.kapasitas;
      existingLemari.status = resolveStatus(existingLemari.status, item.status);
    }

    const rakId = String(item.id);
    const rak: StorageRak = {
      id: rakId,
      lemariId,
      namaRak: item.rak,
      totalArsip: 0,
      kapasitas: item.kapasitas,
      status: item.status,
    };

    rakList.push(rak);
    rakById.set(rakId, rak);
    tempatById.set(item.id, item);
    lemariIdByTempatId.set(item.id, lemariId);
    kantorIdByTempatId.set(item.id, item.kodeKantor);
    incrementCount(jumlahRakByLemariId, lemariId);
  });

  dokumen.forEach((item) => {
    dokumenById.set(item.id, item);
    if (item.tempatPenyimpananId == null) return;

    const tempat = tempatById.get(item.tempatPenyimpananId);
    const lemariId = lemariIdByTempatId.get(item.tempatPenyimpananId);
    const kantorId = kantorIdByTempatId.get(item.tempatPenyimpananId);

    if (!tempat || !lemariId || !kantorId) return;

    incrementCount(totalDokumenByKantor, kantorId);
    incrementCount(totalDokumenByLemariId, lemariId);

    const rak = rakById.get(String(tempat.id));
    if (rak) {
      rak.totalArsip += 1;
    }

    dokumenArsipList.push({
      id: String(item.id),
      rakId: String(tempat.id),
      namaDokumen: item.namaDokumen,
      jenisDokumen: mapJenisDokumen(item.jenisDokumen),
      jenis: "DIGITAL",
      tanggalInput: item.tglInput,
      kode: item.kode,
      keterangan: item.detail,
      fileUrl: item.fileUrl,
    });
  });

  disposisi.forEach((item) => {
    if (item.statusKey !== "PENDING") return;

    const dokumenItem = dokumenById.get(item.dokumenId);
    if (!dokumenItem?.tempatPenyimpananId) return;

    const lemariId = lemariIdByTempatId.get(dokumenItem.tempatPenyimpananId);
    const kantorId = kantorIdByTempatId.get(dokumenItem.tempatPenyimpananId);
    if (!lemariId || !kantorId) return;

    incrementCount(disposisiByKantor, kantorId);
    incrementCount(disposisiByLemariId, lemariId);
  });

  const todayDay = startOfDay(today);

  peminjaman.forEach((item) => {
    if (item.statusKey !== "BORROWED") return;

    const dokumenItem = dokumenById.get(item.dokumenId);
    if (!dokumenItem?.tempatPenyimpananId) return;

    const lemariId = lemariIdByTempatId.get(dokumenItem.tempatPenyimpananId);
    const kantorId = kantorIdByTempatId.get(dokumenItem.tempatPenyimpananId);
    if (!lemariId || !kantorId) return;

    incrementCount(peminjamanByKantor, kantorId);
    incrementCount(dipinjamByLemariId, lemariId);

    const dueDate = parseDateString(item.tglKembali);
    if (!dueDate) return;

    if (startOfDay(dueDate) < todayDay) {
      incrementCount(jatuhTempoByKantor, kantorId);
      incrementCount(jatuhTempoByLemariId, lemariId);
    }
  });

  return {
    kantorList: Array.from(kantorMap.values()).sort((left, right) =>
      left.namaKantor.localeCompare(right.namaKantor),
    ),
    lemariList: Array.from(lemariMap.values()).sort((left, right) =>
      left.kodeLemari.localeCompare(right.kodeLemari),
    ),
    rakList: rakList.sort((left, right) => left.namaRak.localeCompare(right.namaRak)),
    dokumenArsipList,
    totalDokumenByKantor,
    jumlahLemariByKantor,
    disposisiByKantor,
    peminjamanByKantor,
    jatuhTempoByKantor,
    totalDokumenByLemariId,
    jumlahRakByLemariId,
    disposisiByLemariId,
    dipinjamByLemariId,
    jatuhTempoByLemariId,
  };
}
