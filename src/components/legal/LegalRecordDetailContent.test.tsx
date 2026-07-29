import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  LegalClaimDetailContent,
  LegalDepositDetailContent,
  LegalProgressDetailContent,
} from "@/components/legal/LegalRecordDetailContent";
import type {
  LegalClaim,
  LegalDeposit,
  LegalProgressRecord,
} from "@/types/legal.types";

const contract = {
  id: "contract-1",
  no_kontrak: "KONTRAK-001",
  debtor: { name: "Debitur Contoh" },
};

function progressFixture(
  overrides: Partial<LegalProgressRecord> = {},
): LegalProgressRecord {
  return {
    id: "progress-1",
    contract_id: "contract-1",
    collateral_id: null,
    third_party_id: "third-party-1",
    status: "PROSES",
    notes: "Catatan progress",
    file: null,
    files: [],
    contract,
    collateral: null,
    third_party: { id: "third-party-1", name: "Pihak Ketiga Utama" },
    created_at: null,
    updated_at: null,
    ...overrides,
  } as LegalProgressRecord;
}

describe("LegalRecordDetailContent", () => {
  it("menampilkan field khusus notaris dengan pola detail bersama", () => {
    render(
      <LegalProgressDetailContent
        item={progressFixture({
          deed_type: "Akta Jual Beli",
          deed_number: "AJB-001",
          received_at: "2026-04-01",
        })}
        type="notary"
        onOpenFile={vi.fn()}
      />,
    );

    expect(screen.getByText("Kontrak dan Pihak Ketiga")).toBeInTheDocument();
    expect(screen.getByText("Jenis Akta")).toBeInTheDocument();
    expect(screen.getByText("Akta Jual Beli")).toBeInTheDocument();
    expect(screen.getByText("Nomor Akta")).toBeInTheDocument();
    expect(screen.queryByText("Nilai Taksasi")).not.toBeInTheDocument();
  });

  it("menampilkan field khusus KJPP tanpa mengubah pola tampilannya", () => {
    render(
      <LegalProgressDetailContent
        item={progressFixture({
          appraisal_type: "Penilaian Ulang",
          report_number: "KJPP-001",
          collateral_object: "Tanah dan bangunan",
          appraisal_value: 750_000_000,
          received_at: "2026-04-02",
        })}
        type="kjpp"
        onOpenFile={vi.fn()}
      />,
    );

    expect(screen.getByText("Jenis Penilaian")).toBeInTheDocument();
    expect(screen.getByText("Nomor Laporan")).toBeInTheDocument();
    expect(screen.getByText("Objek Jaminan")).toBeInTheDocument();
    expect(screen.getByText("Nilai Taksasi")).toBeInTheDocument();
  });

  it("menampilkan detail klaim sesuai data klaim", () => {
    const claim = {
      id: "claim-1",
      contract_id: "contract-1",
      collateral_id: null,
      insurance_progress_id: null,
      policy_number: "POLIS-001",
      claim_type: "Kebakaran",
      claim_amount: 100_000_000,
      submitted_at: "2026-04-03",
      status: "PENGAJUAN",
      approved_amount: null,
      disbursed_amount: null,
      disbursed_at: null,
      rejection_reason: null,
      notes: "Catatan klaim",
      file: null,
      files: [],
      contract,
      collateral: null,
      insurance_progress: null,
      created_at: null,
      updated_at: null,
    } as unknown as LegalClaim;

    render(
      <LegalClaimDetailContent item={claim} onOpenFile={vi.fn()} />,
    );

    expect(screen.getByText("Kontrak dan Klaim")).toBeInTheDocument();
    expect(screen.getByText("Nilai dan Realisasi")).toBeInTheDocument();
    expect(screen.getByText("Kebakaran")).toBeInTheDocument();
    expect(screen.getByText("Catatan klaim")).toBeInTheDocument();
  });

  it("menampilkan relasi, nilai, dan riwayat transaksi dana titipan", () => {
    const deposit = {
      id: "deposit-1",
      deposit_type_id: null,
      type: "NOTARIS",
      contract_id: "contract-1",
      third_party_id: null,
      nominal: 10_000_000,
      paid_amount: 2_000_000,
      processed_amount: 1_000_000,
      remaining_amount: 7_000_000,
      status: "AKTIF",
      notes: "Catatan titipan",
      deposit_type: null,
      contract,
      third_party: null,
      transactions: [
        {
          id: "transaction-1",
          deposit_id: "deposit-1",
          transaction_date: "2026-04-04",
          action: "TITIPAN",
          amount: 10_000_000,
          notes: "Titipan awal",
          file: null,
          files: [],
          created_at: null,
        },
      ],
      created_at: null,
      updated_at: null,
    } as unknown as LegalDeposit;

    render(
      <LegalDepositDetailContent item={deposit} onOpenFile={vi.fn()} />,
    );

    expect(screen.getByText("Relasi Titipan")).toBeInTheDocument();
    expect(screen.getByText("Riwayat Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Titipan Notaris")).toBeInTheDocument();
    expect(screen.getByText("Titipan awal")).toBeInTheDocument();
  });

  it("menampilkan seluruh field asuransi, agunan, status, dan file unik", () => {
    const onOpenFile = vi.fn();
    const file = {
      id: "file-1",
      name: "polis.pdf",
      url: "/files/polis.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
    };
    render(
      <LegalProgressDetailContent
        item={progressFixture({
          status: "EXPIRED",
          insurance_type: "Kebakaran",
          policy_number: "POL-2026",
          period_start: "2026-01-01",
          period_end: "2026-12-31",
          coverage_amount: 500_000_000,
          premium_amount: 5_000_000,
          collateral: {
            collateral_number: "AGN-001",
            collateral_type_label: "Tanah",
            owner_name: "Pemilik Contoh",
            proof_number: "SHM-001",
          },
          files: [file, { ...file }],
          file,
        } as unknown as Partial<LegalProgressRecord>)}
        type="insurance"
        onOpenFile={onOpenFile}
      />,
    );

    expect(screen.getByText("Jenis Asuransi")).toBeInTheDocument();
    expect(screen.getByText("Nomor Polis")).toBeInTheDocument();
    expect(screen.getByText("Periode Berakhir")).toBeInTheDocument();
    expect(screen.getByText("Nilai Pertanggungan")).toBeInTheDocument();
    expect(screen.getByText("Nilai Premi")).toBeInTheDocument();
    expect(screen.getByText("AGN-001 - Tanah - a.n. Pemilik Contoh - SHM-001")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /polis\.pdf/i }));
    expect(onOpenFile).toHaveBeenCalledWith(expect.objectContaining({ id: "file-1" }));
  });

  it.each([
    ["", "-"],
    ["ACTIVE", "Aktif"],
    ["NONAKTIF", "Nonaktif"],
    ["PENDING", "Menunggu"],
    ["VERIFIKASI", "Dalam Proses"],
    ["COMPLETED", "Selesai"],
    ["DITOLAK", "Ditolak"],
    ["KLAIM", "Klaim"],
    ["MENUNGGU_DOKUMEN", "Menunggu Dokumen"],
  ])("menormalkan status %s menjadi %s", (status, expected) => {
    render(
      <LegalProgressDetailContent
        item={progressFixture({ status })}
        type="notary"
        onOpenFile={vi.fn()}
      />,
    );
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });

  it("menampilkan relasi klaim lengkap dan fallback file tunggal", () => {
    const onOpenFile = vi.fn();
    const file = {
      id: "claim-file",
      name: "klaim.pdf",
      url: "/files/klaim.pdf",
    };
    const claim = {
      id: "claim-2",
      contract_id: "contract-1",
      collateral_id: "collateral-1",
      insurance_progress_id: "insurance-1",
      policy_number: "POLIS-002",
      claim_type: "Banjir",
      claim_amount: 125_000_000,
      submitted_at: "2026-04-03",
      status: "APPROVED",
      approved_amount: 100_000_000,
      disbursed_amount: 90_000_000,
      disbursed_at: "2026-05-01",
      rejection_reason: "Tidak ada",
      notes: "Klaim lengkap",
      file,
      files: null,
      contract,
      collateral: {
        collateral_number: "AGN-CLAIM",
        collateral_type: "BPKB",
      },
      insurance_progress: {
        policy_number: "POLIS-TERKAIT",
        insurance_type: "Kendaraan",
      },
      created_at: null,
      updated_at: null,
    } as unknown as LegalClaim;

    render(<LegalClaimDetailContent item={claim} onOpenFile={onOpenFile} />);
    expect(screen.getByText("AGN-CLAIM - BPKB")).toBeInTheDocument();
    expect(screen.getByText("POLIS-TERKAIT")).toBeInTheDocument();
    expect(screen.getByText("Selesai")).toBeInTheDocument();
    expect(screen.getByText("Tidak ada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /klaim\.pdf/i }));
    expect(onOpenFile).toHaveBeenCalledTimes(1);
  });

  it("menampilkan seluruh variasi transaksi dan empty state titipan", () => {
    const baseDeposit = {
      id: "deposit-2",
      deposit_type_id: "type-1",
      type: "LAINNYA",
      contract_id: "contract-1",
      third_party_id: "party-1",
      nominal: 10_000_000,
      paid_amount: 2_000_000,
      processed_amount: 1_000_000,
      remaining_amount: 7_000_000,
      total_deposit_amount: 11_000_000,
      total_payment_amount: 3_000_000,
      total_refund_amount: 2_000_000,
      balance_amount: 6_000_000,
      status: "ACTIVE",
      notes: null,
      deposit_type: { id: "type-1", name: "Titipan Khusus" },
      contract,
      third_party: { id: "party-1", name: "Pihak Ketiga" },
      transactions: [
        { id: "tx-1", transaction_date: "2026-01-01", action: "BAYAR", amount: 1, notes: null, file: null, files: [] },
        { id: "tx-2", transaction_date: "2026-01-02", action: "REFUND", amount: 2, notes: "Refund", file: null, files: [] },
        { id: "tx-3", transaction_date: "2026-01-03", action: "LAINNYA", amount: 3, notes: "Lainnya", file: null, files: [] },
      ],
      created_at: null,
      updated_at: null,
    } as unknown as LegalDeposit;
    const { rerender } = render(
      <LegalDepositDetailContent item={baseDeposit} onOpenFile={vi.fn()} />,
    );
    expect(screen.getByText("Titipan Khusus")).toBeInTheDocument();
    expect(screen.getAllByText("Pembayaran").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Refund").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lainnya").length).toBeGreaterThan(0);

    rerender(
      <LegalDepositDetailContent
        item={{
          ...baseDeposit,
          deposit_type: { id: "type-2", name: "", label: 42 },
          transactions: [],
        } as unknown as LegalDeposit}
        onOpenFile={vi.fn()}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(
      screen.getByText("Belum ada transaksi pada dana titipan ini."),
    ).toBeInTheDocument();
  });
});
