# Tanggal dan jam pada UI Ruwang Arsip

UX-SJ-02 menyatukan teks tampilan, bukan nilai API/database atau kebijakan zona waktu.

## Pemakaian

Gunakan utilitas dari `src/lib/utils/date.ts`:

| Kebutuhan | Fungsi | Contoh |
|---|---|---|
| Tanggal | `formatDate` / `formatDateOnly` | 26 September 2026 |
| Tanggal dan jam | `formatDateTime` | 26 September 2026, 13:33 |
| Tabel sempit / notifikasi | `formatDateTimeShort` | 26 Sep 2026, 13:33 |
| Jam | `formatTime` | 13:33 |

Jam memakai siklus 00–23 dan tanda titik dua. Teks biasa tidak menambahkan GMT/UTC/offset. Timestamp ber-offset tetap dikonversi sesuai zona perangkat/runtime yang sebelumnya digunakan aplikasi; jangan menetapkan Asia/Jakarta atau zona lain secara diam-diam.

Date-only ISO/DMY dibaca sebagai tanggal kalender lokal, bukan instant UTC. Pemformat tanggal-jam tidak menambahkan jam tengah malam pada date-only. Nilai kosong/tidak valid menggunakan fallback; `formatSjDate` mempertahankan keterangan kosong/invalid khusus SJ. Parser untuk input/jadwal (`parseDateString`), `toIsoDate`, serta `todayIsoDate` tidak diubah.

Untuk elemen `<time>`, pertahankan nilai ISO asli di `dateTime`, dan gunakan formatter hanya sebagai teks anak. Jangan menggunakan hasil formatter sebagai payload API, filter tanggal, nama file mesin, atau dasar expiry.

## SSR

Zona perangkat tidak tersedia secara umum pada server. Halaman dashboard saat ini memulai autentikasi dengan status loading; clock dan data hasil API muncul setelah autentikasi/fetch di client. Jangan memindahkan pemformat timestamp lokal ke SSR dengan asumsi zona server sama dengan browser. Date-only tidak bergeser; tes markup/hydration dan tes empat zona tersedia dalam `src/lib/utils/date*.test.*`.

## Pengecualian yang diperiksa dan dipertahankan

- Input native, nilai picker, query/filter, kalkulasi jadwal, dan serialization tetap dalam format kontraknya.
- `formatDateDisplay` tetap pendek untuk tabel laporan marketing dan ekspor arsip. `lib/utils/laporan.ts` adalah formatter laporan lama tanpa caller aktif yang ditemukan; tidak diubah.
- Label bulan/periode IDEB dan kalender (`BasicMonthInput`, formatter period) tetap bulan/tahun, bukan tanggal lengkap yang mengarang hari.
- `BasicDateInput` sudah menampilkan tanggal panjang; grid kalender dan nilai mesin tetap.
- Preview watermark pada halaman parameter meniru isi dokumen. Formatter preview dan pemroses watermark backend tidak diubah.
- Surat/dokumen cetak, PDF IDEB, ekspor log aktivitas dengan zona Asia/Jakarta, email, nama file dan kolom mesin tidak diseragamkan secara global. Endpoint pembuat dokumen tetap.
- Kolom spreadsheet `waktu_perubahan_expired` pada laporan agunan menggunakan `formatDateTimeForExport`, yang mempertahankan format Intl lama. UI normal menggunakan `formatDateTime`.
- Label sumbu tren storage dari backend memakai kalender UTC dan tanggal/bulan pendek; tidak diubah menjadi zona perangkat atau timestamp lengkap.
- Teks tanggal yang sudah tersimpan dalam pesan notifikasi/audit tidak ditulis ulang.

## Batas bukti

Tes browser menggunakan runtime lokal readonly untuk data normal dan interception respons khusus tes untuk state kosong, error, parsial dan tanggal tepi. Tidak ada fixture dimasukkan ke database normal. Hasil lokal bukan izin release/deployment. Bukti run dan screenshot berada di workspace tugas di luar repository.
