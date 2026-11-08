# Bahasa dan tindakan Seputar Jaminan

UX-SJ-03 mengubah tampilan, bukan enum atau alur persetujuan. Kamus ada di `src/components/seputar-jaminan/labels.ts`.

| Sumber kontrak | Label UI | Makna / batas |
|---|---|---|
| publication/profile/contact state DRAFT | Draf | Belum diajukan |
| IN_REVIEW | Menunggu pemeriksaan | Menunggu keputusan, bukan pengiriman |
| REVISION_REQUIRED / contact REJECTED | Perlu diperbaiki | Gunakan catatan pemeriksa untuk revisi |
| APPROVED / publication PUBLISHED | Disetujui / Disetujui di bank | Bukan bukti tampil |
| sync_state QUEUED / SENDING | Menunggu dikirim / Sedang dikirim | Pengiriman belum diterima |
| sync_state ACKNOWLEDGED | Diterima tujuan | Bukti penerimaan, bukan kesiapan media atau penayangan |
| sync_state RETRYING | Akan dicoba lagi | Sistem menjadwalkan percobaan lagi |
| sync_state FAILED | Pengiriman gagal | Perlu ditangani |
| sync_state QUARANTINED | Ditahan untuk diperiksa | Tidak sama dengan retry otomatis |
| submission.delivery_state RECEIVED_BY_CONTROL | Diterima pemeriksa | Terpisah dari keputusan dan penerapan bank |
| submission.bank_application_state APPLIED_BY_BANK | Diterapkan di bank | Tidak menjamin hasil publik |
| DECISION_REJECTED_BY_BANK | Belum diterapkan di bank | Tampilkan langkah pemeriksaan perbedaan versi |
| observation.last_success.state AVAILABLE | Tampil saat dicek · waktu | Berdasarkan layanan publik SJ, berlaku saat checked_at |
| observation.last_success.state NOT_FOUND | Tidak ditemukan saat dicek · waktu | Bukan kesimpulan dari timeout/HTTP gagal |
| latest_attempt FAILED / error pemuatan | Belum bisa dicek / Pengecekan terbaru gagal | Pertahankan hasil sukses sebelumnya dan waktu percobaan gagal |
| last_success null | Belum ada hasil pengecekan | Tidak mengarang tayang atau tidak tayang |
| change_request REJECTED | Ditolak | Berbeda dari perlu diperbaiki |
| UNPUBLISHED / ARCHIVED | Ditarik di bank / Diarsipkan | Penarikan dan arsip tetap terpisah; tidak hard delete |

Identitas publik, waktu pengecekan, waktu percobaan gagal, versi SJ, versi kerja dan versi disetujui tetap ditampilkan di konteksnya. Nomor versi SJ bukan nomor revisi bank. Profil tampil tidak menyatakan semua aset tampil. Kontak tetap bukan halaman publik.

## Hierarki tindakan

`SjRecordActions` hanya adapter SJ terhadap `SetupPrimaryButton` dan `SetupActionMenu` existing. Tidak ada library baru atau skin baru.

- Profil/kontak/publikasi draf: utamakan Ajukan bila server mengizinkan; jika masih terhalang, utamakan Edit yang tersedia. Ajukan yang terhalang tetap di menu dengan alasan.
- Revisi: Perbaiki data. Versi disetujui tidak diganti oleh draf.
- Versi disetujui: Ajukan perubahan. Konfirmasi, penarikan/pencabutan, dan arsip adalah aksi sekunder terpisah.
- Pemeriksa lokal: persetujuan menjadi satu aksi utama; Minta perbaikan di titik tiga. Konfirmasi keputusan tetap wajib. Authority central tidak mendapat persetujuan lokal.
- Form: Simpan draf tetap aksi utama; tidak menambahkan workflow simpan-dan-ajukan pada tahap ini.
- Pengajuan revisi: tautan Perbaiki menuju data terkait, bukan mutasi otomatis. Permintaan perubahan mengajukan ulang sesuai assessment server.

Sumber izin: `action_availability` dari `backend/src/modules/seputar-jaminan/actionRead.js`, menu capability existing dan enforcement endpoint tetap berlaku. Assessment harus cocok `expected_version`, scope START_ACTION, revalidated_on_submit. Assessment lama/hilang memblokir tindakan, bukan menebak izin. PERMISSION_DENIED disembunyikan; kendala lain menampilkan alasan server. Seluruh tindakan diperiksa ulang backend saat dijalankan.

Kesalahan editor/detail/keputusan ditampilkan di konteks terkait. Toast keberhasilan tetap digunakan. Jangan menduplikasi error yang sama di toast dan panel; jangan menyembunyikan konflik versi atau mengganti hasil gagal menjadi sukses.

## Batas verifikasi

Tes komponen memakai service mock untuk interaksi/permission; tes browser state tepi memakai interception respons, bukan fixture operasional. Ini tidak menggantikan tes API role nyata atau integrasi lintas aplikasi. Bukti run, screenshot dan checkpoint disimpan di workspace tugas di luar repository.
