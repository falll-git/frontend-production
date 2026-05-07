import type { DokumenArsip, Lemari, Rak } from "@/lib/types";
import { formatDateDisplay } from "@/lib/utils/date";
import { exportToExcel } from "@/lib/utils/exportExcel";

type ExportDokumenPerKantorParams = {
  kantorId: string;
  kantorNama: string;
  lemariList: Lemari[];
  rakList: Rak[];
  dokumenList: DokumenArsip[];
};

type ExportDokumenPerRakParams = {
  rakNama: string;
  lemariKode: string;
  kantorNama: string;
  dokumenList: DokumenArsip[];
};

type DokumenExtras = {
  kode?: string;
  keterangan?: string;
};

function getDokumenKode(dokumen: DokumenArsip): string {
  const withExtras = dokumen as DokumenArsip & DokumenExtras;
  return withExtras.kode ?? dokumen.id;
}

function getDokumenKeterangan(dokumen: DokumenArsip): string {
  const withExtras = dokumen as DokumenArsip & DokumenExtras;
  return withExtras.keterangan ?? "";
}

function formatTanggal(value: string): string {
  return formatDateDisplay(value, "");
}

function formatFilenameDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export async function exportDokumenPerKantor({
  kantorId,
  kantorNama,
  lemariList,
  rakList,
  dokumenList,
}: ExportDokumenPerKantorParams): Promise<void> {
  const lemariById = new Map(
    lemariList
      .filter((lemari) => lemari.kantorId === kantorId)
      .map((lemari) => [lemari.id, lemari]),
  );
  const rakByLemariId = new Map<string, Rak[]>();
  rakList.forEach((rak) => {
    if (!lemariById.has(rak.lemariId)) return;
    const current = rakByLemariId.get(rak.lemariId) ?? [];
    current.push(rak);
    rakByLemariId.set(rak.lemariId, current);
  });

  const dokumenByRakId = new Map<string, DokumenArsip[]>();
  dokumenList.forEach((dokumen) => {
    const current = dokumenByRakId.get(dokumen.rakId) ?? [];
    current.push(dokumen);
    dokumenByRakId.set(dokumen.rakId, current);
  });

  const rows: Record<string, unknown>[] = [];
  let counter = 1;

  lemariList
    .filter((lemari) => lemari.kantorId === kantorId)
    .forEach((lemari) => {
      const rakItems = rakByLemariId.get(lemari.id) ?? [];
      rakItems.forEach((rak) => {
        const dokumenItems = dokumenByRakId.get(rak.id) ?? [];
        dokumenItems.forEach((dokumen) => {
          rows.push({
            no: counter++,
            kodeDokumen: getDokumenKode(dokumen),
            namaDokumen: dokumen.namaDokumen,
            jenis: dokumen.jenis,
            kodeLemari: lemari.kodeLemari,
            namaRak: rak.namaRak,
            tglInput: formatTanggal(dokumen.tanggalInput),
            keterangan: getDokumenKeterangan(dokumen),
          });
        });
      });
    });

  await exportToExcel({
    filename: `Dokumen-${kantorNama}-${formatFilenameDate(new Date())}`,
    sheetName: "Dokumen Kantor",
    columns: [
      { header: "NO", key: "no", width: 6 },
      { header: "KODE DOKUMEN", key: "kodeDokumen", width: 18 },
      { header: "NAMA DOKUMEN", key: "namaDokumen", width: 32 },
      { header: "JENIS", key: "jenis", width: 14 },
      { header: "KODE LEMARI", key: "kodeLemari", width: 14 },
      { header: "NAMA RAK", key: "namaRak", width: 14 },
      { header: "TGL INPUT", key: "tglInput", width: 16 },
      { header: "KETERANGAN", key: "keterangan", width: 28 },
    ],
    data: rows,
  });
}

export async function exportDokumenPerRak({
  rakNama,
  lemariKode,
  kantorNama,
  dokumenList,
}: ExportDokumenPerRakParams): Promise<void> {
  const rows = dokumenList.map((dokumen, index) => ({
    no: index + 1,
    kodeDokumen: getDokumenKode(dokumen),
    namaDokumen: dokumen.namaDokumen,
    jenis: dokumen.jenis,
    tglInput: formatTanggal(dokumen.tanggalInput),
    keterangan: getDokumenKeterangan(dokumen),
  }));

  await exportToExcel({
    filename: `Dokumen-${lemariKode}-${rakNama}-${formatFilenameDate(new Date())}`,
    sheetName: `Dokumen ${kantorNama}`,
    columns: [
      { header: "NO", key: "no", width: 6 },
      { header: "KODE DOKUMEN", key: "kodeDokumen", width: 18 },
      { header: "NAMA DOKUMEN", key: "namaDokumen", width: 32 },
      { header: "JENIS", key: "jenis", width: 14 },
      { header: "TGL INPUT", key: "tglInput", width: 16 },
      { header: "KETERANGAN", key: "keterangan", width: 28 },
    ],
    data: rows,
  });
}
