/** Display vocabulary only. Each group refers to a separate server contract. */
export const PUBLICATION_STATE_LABEL: Record<string, string> = {
  DRAFT: 'Draf', IN_REVIEW: 'Menunggu pemeriksaan', REVISION_REQUIRED: 'Perlu diperbaiki',
  APPROVED: 'Disetujui', PUBLISHED: 'Disetujui di bank', UNPUBLISHED: 'Ditarik di bank', ARCHIVED: 'Diarsipkan',
};
export const SYNC_STATE_LABEL: Record<string, string> = {
  NOT_QUEUED: 'Belum dikirim', QUEUED: 'Menunggu dikirim', SENDING: 'Sedang dikirim',
  ACKNOWLEDGED: 'Diterima tujuan', RETRYING: 'Akan dicoba lagi', FAILED: 'Pengiriman gagal', QUARANTINED: 'Ditahan untuk diperiksa',
};
export const ENTITY_STATE_LABEL: Record<string, string> = {
  DRAFT: 'Draf', IN_REVIEW: 'Menunggu pemeriksaan', VERIFIED: 'Terverifikasi', REJECTED: 'Perlu diperbaiki',
  REVISION_REQUIRED: 'Perlu diperbaiki', REVOKED: 'Dicabut', READY: 'Siap', HIDDEN: 'Disembunyikan di bank',
};
export const DELIVERY_LABEL = {
  NOT_SENT: 'Belum dikirim', SENDING_TO_CONTROL: 'Sedang dikirim', RECEIVED_BY_CONTROL: 'Diterima pemeriksa',
  DELIVERY_FAILED: 'Pengiriman gagal', UNKNOWN: 'Belum diketahui',
};
export const APPLICATION_LABEL = {
  WAITING_FOR_DECISION: 'Menunggu keputusan', APPLIED_BY_BANK: 'Diterapkan di bank', DECISION_REJECTED_BY_BANK: 'Belum diterapkan di bank',
};
export const CHANGE_STATE_LABEL = {
  IN_REVIEW: 'Menunggu pemeriksaan', REVISION_REQUIRED: 'Perlu diperbaiki', REJECTED: 'Ditolak',
  // Completion can be local without an outbox; it is not proof of central/public state.
  APPLIED: 'Diterapkan di bank', COMPLETED: 'Selesai', FAILED: 'Perubahan gagal diproses',
};
