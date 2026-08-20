import type { ReactNode } from "react";

import SetupModalDetailLayout from "@/components/ui/SetupModalDetailLayout";
import SetupRecordDetailSection, {
  type SetupRecordDetailRow,
} from "@/components/ui/SetupRecordDetailSection";

export type LoanDetailNoteRow = {
  label: string;
  value?: string | null;
};

type LoanDetailContentProps = {
  documentName: string;
  documentCode: string;
  status: ReactNode;
  informationTitle?: string;
  informationDescription: string;
  informationRows: SetupRecordDetailRow[];
  noteDescription?: string;
  noteRows?: LoanDetailNoteRow[];
};

export function getMeaningfulLoanNoteRows(
  rows: LoanDetailNoteRow[] = [],
): SetupRecordDetailRow[] {
  return rows
    .map((row) => ({
      label: row.label,
      value: row.value?.trim() ?? "",
    }))
    .filter((row) => row.value !== "" && row.value !== "-");
}

export default function LoanDetailContent({
  documentName,
  documentCode,
  status,
  informationTitle = "Informasi Peminjaman",
  informationDescription,
  informationRows,
  noteDescription = "Alasan dan catatan proses yang tersimpan pada transaksi.",
  noteRows,
}: LoanDetailContentProps) {
  const meaningfulNoteRows = getMeaningfulLoanNoteRows(noteRows);
  const resolvedNoteRows: SetupRecordDetailRow[] = meaningfulNoteRows.length
    ? meaningfulNoteRows
    : [{ label: "Catatan", value: "Belum ada catatan proses." }];

  return (
    <SetupModalDetailLayout
      summary={
        <section
          data-ui="loan-detail-summary"
          className="min-w-0 rounded-lg border border-gray-200 bg-white p-5"
        >
          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Identitas Dokumen
              </p>
              <h3 className="break-words text-2xl font-semibold tracking-tight text-slate-950">
                {documentName}
              </h3>
              <p className="break-all text-base font-medium text-slate-500">
                {documentCode}
              </p>
            </div>
            <div className="shrink-0">{status}</div>
          </div>
        </section>
      }
      information={
        <SetupRecordDetailSection
          title={informationTitle}
          description={informationDescription}
          rows={informationRows}
        />
      }
      notes={
        noteRows ? (
          <SetupRecordDetailSection
            title="Catatan Peminjaman"
            description={noteDescription}
            rows={resolvedNoteRows}
          />
        ) : undefined
      }
    />
  );
}
