"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

import FeatureHeader from "@/components/ui/FeatureHeader";
import { useAppToast } from "@/components/ui/AppToastProvider";
import {
  SETUP_PAGE_EMPTY_STATE_CELL_CLASS,
  SETUP_PAGE_NUMBER_CELL_CLASS,
  SETUP_PAGE_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_BODY_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_TABLE_CLASS,
  SETUP_PAGE_TABLE_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_HEAD_CLASS,
  SETUP_PAGE_TABLE_SCROLL_CLASS,
  SETUP_PAGE_COMPACT_CELL_CLASS,
  SETUP_PAGE_COMPACT_ROW_CLASS,
} from "@/components/ui/setupPageStyles";
import { legalService, type LegalThirdPartyDocumentsReport } from "@/services/legal.service";

export default function LaporanDokumenPihakKetigaPage() {
  const { showToast } = useAppToast();
  const [report, setReport] = useState<LegalThirdPartyDocumentsReport>({ notary: [], insurance: [], claims: [] });
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setIsFetching(true);
        const data = await legalService.getThirdPartyDocumentsReport();
        if (!ignore) setReport(data);
      } catch {
        if (!ignore) showToast("Gagal memuat laporan dokumen pihak ketiga", "error");
      } finally {
        if (!ignore) setIsFetching(false);
      }
    }
    void loadData();
    return () => { ignore = true; };
  }, [showToast]);

  function renderTable(title: string, data: Record<string, unknown>[], cols: { key: string; label: string }[]) {
    return (
      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>No</th>
                {cols.map((col) => (
                  <th key={col.key} className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {data.map((item, index) => (
                <tr key={index} className={SETUP_PAGE_COMPACT_ROW_CLASS}>
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>{index + 1}</td>
                  {cols.map((col) => (
                    <td key={col.key} className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-700`}>
                      {String(item[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
              {isFetching && <tr><td colSpan={cols.length + 1} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Memuat data...</td></tr>}
              {!isFetching && data.length === 0 && <tr><td colSpan={cols.length + 1} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Belum ada data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader title="Laporan Dokumen Pihak Ketiga" subtitle="Ringkasan dokumen legal yang melibatkan pihak ketiga." icon={<FileText />} />
      {renderTable("Progress Notaris", report.notary, [
        { key: "third_party_id", label: "ID Pihak Ketiga" },
        { key: "status", label: "Status" },
        { key: "_count", label: "Jumlah" },
      ])}
      {renderTable("Progress Asuransi", report.insurance, [
        { key: "third_party_id", label: "ID Pihak Ketiga" },
        { key: "status", label: "Status" },
        { key: "_count", label: "Jumlah" },
      ])}
      {renderTable("Klaim Asuransi", report.claims, [
        { key: "status", label: "Status" },
        { key: "_count", label: "Jumlah" },
      ])}
    </div>
  );
}
