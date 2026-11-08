import type { SjSubmission } from '@/types/seputar-jaminan.types';

/** Decision and delivery facts only; approval does not prove public visibility. */
export function submissionNextStep(item: SjSubmission) {
  if (item.bank_application_state === 'DECISION_REJECTED_BY_BANK') return 'Keputusan belum diterapkan. Minta pengelola memeriksa perbedaan versi.';
  if (item.review_state === 'REVISION_REQUIRED') return 'Perbaiki data sesuai catatan pemeriksa, lalu ajukan kembali.';
  if (item.delivery_state === 'DELIVERY_FAILED') return 'Pengajuan gagal dikirim. Hubungi pengelola; tidak perlu membuat pengajuan baru.';
  if (item.review_state === 'IN_REVIEW') return item.delivery_state === 'RECEIVED_BY_CONTROL'
    ? 'Tunggu hasil pemeriksaan.'
    : 'Belum ada konfirmasi dari pemeriksa. Cek lagi nanti.';
  return item.kind === 'CONTACT'
    ? 'Buka kontak untuk melihat hasil dan penggunaannya.'
    : 'Cek profil atau publikasi terkait. Disetujui belum berarti tampil; versi sebelumnya bisa masih tampil.';
}
