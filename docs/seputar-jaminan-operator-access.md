# Penghapusan halaman bantuan pengelola Seputar Jaminan

Keputusan pengguna 27 September 2026: fitur Bantuan pengelola dihapus dari
workflow aplikasi. Tidak ada pengganti menu, tautan, dialog detail pengiriman,
atau tombol retry/reconciliation di UI bank. Route `/bantuan` dan redirect
`/ringkasan` di bawah `/dashboard/seputar-jaminan` dihapus, bukan dialihkan ke
halaman yang tidak diizinkan. Bookmark lama tidak membuka kembali fitur ini.

Pemeriksaan source Control dan web/API/worker SJ tidak menemukan menu, route,
atau rujukan fitur Bantuan pengelola tersebut. Monitoring Control merupakan
fitur terpisah, bukan halaman bantuan yang dipindahkan ke sana.

Empat menu kerja bank tetap Profil BPRS, Kontak WhatsApp, Publikasi, dan Pengajuan. Tab Pengiriman teknis, Ringkasan, dan timeline tidak dikembalikan. Outbox, worker, validasi ACK, permission, dan audit backend tidak dihapus.

## Pengguna bank

- Detail pengajuan menampilkan versi yang diajukan, keputusan, catatan, dan tautan tindak lanjut. Kondisi terbaru ada pada profil/publikasi terkait.
- Pada Publikasi, pilihan **Konfirmasi ≤ 7 hari atau lewat tenggat** mencari state bank PUBLISHED dengan next_reconfirmation_at paling lambat tujuh hari ke depan. Batas ini sama dengan dashboard existing, bukan kebijakan baru. Gabungan filter memakai AND; filter tidak mengubah status.
- Persetujuan/pengiriman tidak membuktikan aset sedang tampil. Pengamatan publik tetap terpisah.

## Batas penghapusan

Yang dihapus adalah pengalaman pengguna Bantuan pengelola. API privat existing,
outbox, worker, retry otomatis, reconciliation, validasi target/signature/ACK,
permission dan data audit tidak dihapus atau dilonggarkan. Halaman Publikasi/
Pengajuan tetap menampilkan kegagalan yang relevan pada datanya; penghapusan
bantuan bukan menyembunyikan status gagal atau menganggap Control mengambil alih
seluruh operasi bank. Akun monitoring-only tidak mendapat izin Pengajuan baru.

FAILED instalasi lama tetap gagal dan retry salah-target tetap ditolak. Jangan mengubah identitas, membuat pengajuan pengganti, menghapus audit, atau memalsukan ACK. Pemulihan membutuhkan sumber dan konfigurasi tujuan yang sah.

## API bank yang tetap dipertahankan (bukan fitur UI bantuan)

Prefix `/api/v1/seputar-jaminan`, autentikasi/sesi existing. Jangan menaruh token di URL, log, dokumentasi, atau screenshot.

| Request | Izin / batas |
| --- | --- |
| GET /sync-events?state=NEEDS_ATTENTION&limit=20 | ringkasan:read; optional exact event_id dan cursor. Unknown query/invalid cursor ditolak422. DTO allowlist tanpa payload/signature/lease. |
| GET /sync-events/:id | ringkasan:read; existing detail. |
| POST /sync-events/:id/retry | ringkasan:update + sj_sync_retry; existing conditional update/target guard, konflik409. |
| GET /reconciliation/latest | ringkasan:read; null jika belum ada; ID/state/counts/start/finish saja, bukan manifest mentah. |
| POST /reconciliation | ringkasan:update + sj_sync_retry, rate limit;202 adalah run dijadwalkan/aktif, bukan hasil selesai. |
| GET /publications?paged=true&confirmation=soon | publikasi:read + RLS; dapat digabung search/state/category, cursor terikat filter. |

Kontrak lama /dashboard dan /sync-summary tetap tersedia. Control tidak dianggap menggantikan operasi bank. Tidak ada perubahan repository peer Control/SJ.

## Pengujian aman

Periksa skrip/target sebelum menjalankan. Backend `scripts/run-sj-isolated-tests.js --workflow` membuat PG/Redis baru dengan label kepemilikan, tmpfs, role runtime non-superuser/non-BYPASSRLS, fresh migration dan live guard. Cleanup hanya resource run. Skenario operator menggunakan router/auth/role/database/worker bank nyata dan test double kontrak Control/SJ, bukan E2E peer nyata.

Preview audit memakai API read-only; tidak ada fixture di runtime normal. Bukti
penghapusan, screenshot, recovery copies dan checkpoint ada di luar kandidat
release: output/remove-operator-help/ pada workspace tugas. Bukti UX01/UX09 lama
bersifat historis dan tidak dipakai untuk mengklaim fitur bantuan masih aktif.
Hasil lokal bukan izin produksi.
