# Native npm dan umur dependency

Policy frontend memakai **npm 11.21.0**, Node **^22.13 atau 24.x**, dan
`min-release-age=7` (hari). Node22.12 tidak lagi dinyatakan didukung karena
jsdom29.1.1 dalam lockfile memerlukan setidaknya22.13 pada cabang22.
Tidak ada penggantian package manager atau browser custom. Versi aplikasi dan
graph dependency tetap berasal dari package-lock v3 yang diperiksa.

`packageManager`, `engines.npm` dan `devEngines` menyatakan versi yang sama;
`onFail:error` serta `engine-strict=true` menolak toolchain yang tidak cocok.
`packageManager` sendiri bukan pengaman yang cukup. CLI npm11.8 yang sebelumnya
terpasang tidak memahami `min-release-age`; jangan menganggap konfigurasi itu
sudah efektif ketika memakai versi lama.

## Entry point yang dipertahankan

Setelah native npm11.21.0 tersedia dalam lingkungan yang dipilih:

```text
npm run deps:install
npm run quality
```

`deps:install` memeriksa metadata policy dan umur versi yang benar-benar terkunci
sebelum menjalankan `npm ci`. `quality` memeriksa policy/workflow dan lock-age
sebelum gate lain. Cakupan tes dan target aplikasi tetap harus ditinjau sebelum
menjalankan gate quality; dokumen ini bukan izin menjalankan tes ke DB normal.

Jangan menjalankan `npm ci` sebagai pengganti entry point policy. Native
`min-release-age` membantu pemilihan versi saat resolution, tetapi **tidak cukup
membuktikan umur seluruh versi yang sudah terkunci**. Metadata waktu publikasi
yang hilang juga tidak boleh diam-diam dianggap tua. Checker lock-age terpisah
memeriksa kondisi tersebut secara fail-closed; kegagalan jaringan tetap gagal,
bukan sukses/offline fallback. Fork braces lokal tetap pengecualian eksplisit
yang integritas dan regresinya diverifikasi terpisah, bukan diberi umur npm
registry rekaan.

Checker hanya membaca metadata HTTPS registry npm publik: maksimum empat
request serentak, batas20detik per request/180detik keseluruhan, dan64MiB
metadata terurai per paket. Batas tersebut tetap menolak respons berlebih;
metadata besar bukan alasan untuk melewati pemeriksaan umur atau integritas.

`npm ci` dapat menghapus node_modules yang ada. Uji instalasi/policy yang mutatif
hanya pada checkout/cache/database/storage disposable yang kepemilikannya sah.
Jangan meresolusi ulang atau mengganti versi dependency hanya agar policy hijau.
`preinstall` bukan perlindungan sebelum mutasi: npm ci menjalankannya setelah
reify. Karena itu pemeriksaan awal berada sebelum perintah ci, bukan hanya hook.

## Bootstrap lokal dan CI

Tidak perlu mengganti npm global laptop. Native CLI pinned dapat disiapkan pada
tool directory/cache sementara khusus tugas, lalu dipanggil secara eksplisit.
Contoh bootstrap standar dari direktori netral, bukan checkout frontend:

```text
npm exec --cache <cache-khusus-tugas> --yes --package=npm@11.21.0 -- npm --prefix D:/frontend-production run deps:install
```

Contoh itu mengunduh tooling; bukan perintah yang telah dijalankan oleh dokumen
ini. Periksa target, credential/config yang diwarisi dan pemilik cache dahulu.
Jangan memakai perintah instalasi global pada laptop sebagai prasyarat diam-diam.

Workflow Quality dan job dependency-audit Security melakukan bootstrap npm
11.21.0 standar di runner ephemeral, dari `runner.temp`, lalu menguji versi CLI
aktual sebelum langkah dependency. Instalasi global di runner sementara itu
bukan perubahan npm global laptop/VPS. Setup Node24 tetap dipakai; npm pinned
menjadi perintah yang sama untuk langkah berikut dan subprocess quality bank.
Checker lock-age dijalankan sebelum frontend ci pada kedua job. Checker statis
workflow memverifikasi versi, urutan, cwd dan ketiadaan bypass pada langkah itu.
CodeQL tetap boleh mempunyai `security-events:write`; bukan quality deployment.
Perubahan workflow lokal bukan bukti hosted CI telah dijalankan.

## Batas yang tidak disembunyikan

- Flag CLI atau konfigurasi environment dengan prioritas lebih tinggi, `--force`,
  exclusion dan cutoff override bisa melonggarkan perilaku native npm. Tooling
  policy bukan security boundary terhadap orang yang sengaja menjalankan
  perintah lain. Verifier/checker tidak membuktikan semua entry point eksternal
  di dunia terkunci.
- `--ignore-scripts` bukan bukti policy aman dan dapat melewati patch postinstall.
  Gate normal tetap mempertahankan patch brace-expansion dan verifier fork.
- `npm audit fix` bukan perintah perbaikan otomatis yang dibenarkan oleh policy.
  Umur dependency bukan bukti bebas kerentanan atau malware; audit/regresi tetap
  diperlukan. Jangan memakai `npm audit fix --force`.
- Backend peer pada workflow Quality masih `ref:main`; pin npm tidak membekukan
  identitas source peer. Gate release lintas repository harus menetapkan peer
  commit yang benar dan mencatat keterbatasan hosted checks secara terpisah.
- Verifier statis memeriksa bentuk job yang ditulis repository, bukan parser
  atau sandbox universal untuk semua sintaks YAML dan shell.

Sumber: [konfigurasi npm11](https://docs.npmjs.com/cli/v11/using-npm/config/),
[devEngines](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#devengines),
[implementasi ci npm11.21.0](https://github.com/npm/cli/blob/v11.21.0/lib/commands/ci.js).
