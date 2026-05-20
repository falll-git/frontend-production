"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Wallet } from "lucide-react";

import FeatureHeader from "@/components/ui/FeatureHeader";
import { useAppToast } from "@/components/ui/AppToastProvider";
import {
  SETUP_PAGE_COMPACT_CELL_CLASS,
  SETUP_PAGE_COMPACT_ROW_CLASS,
  SETUP_PAGE_EMPTY_STATE_CELL_CLASS,
  SETUP_PAGE_NUMBER_CELL_CLASS,
  SETUP_PAGE_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_BODY_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_TABLE_CLASS,
  SETUP_PAGE_TABLE_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_HEAD_CLASS,
  SETUP_PAGE_TABLE_SCROLL_CLASS,
} from "@/components/ui/setupPageStyles";
import { legalService, type LegalThirdPartyDepositFundReport } from "@/services/legal.service";
import { exportToExcel } from "@/lib/utils/exportExcel";

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

export default function LaporanDanaTitipanPihakKetigaPage() {
  const { showToast } = useAppToast();
  const [items, setItems] = useState<LegalThirdPartyDepositFundReport[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setIsFetching(true);
        const data = await legalService.getThirdPartyDepositFundsReport();
        if (!ignore) setItems(data);
      } catch {
        if (!ignore) showToast("Gagal memuat laporan dana titipan pihak ketiga", "error");
      } finally {
        if (!ignore) setIsFetching(false);
      }
    }
    void loadData();
    return () => { ignore = true; };
  }, [showToast]);

  const totalNominal = useMemo(() => items.reduce((sum, item) => sum + (item.nominal ?? 0), 0), [items]);

  const handleExport = async () => {
    await exportToExcel({
      filename: "laporan-dana-titipan-pihak-ketiga",
      sheetName: "Dana Titipan",
      title: "Laporan Dana Titipan Pihak Ketiga",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Tipe", key: "type", width: 16 },
        { header: "Status", key: "status", width: 16 },
        { header: "Total Data", key: "total_records", width: 12 },
        { header: "Nominal", key: "nominal", width: 20 },
        { header: "Terbayar", key: "paid_amount", width: 20 },
        { header: "Diproses", key: "processed_amount", width: 20 },
        { header: "Sisa", key: "remaining_amount", width: 20 },
      ],
      data: items.map((item, idx) => ({
        no: idx + 1,
        type: item.type ?? "-",
        status: item.status ?? "-",
        total_records: item.total_records ?? 0,
        nominal: item.nominal ?? 0,
        paid_amount: item.paid_amount ?? 0,
        processed_amount: item.processed_amount ?? 0,
        remaining_amount: item.remaining_amount ?? 0,
      })),
    });
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Laporan Dana Titipan Pihak Ketiga"
        subtitle="Rekap dana titipan legal per tipe dan status."
        icon={<Wallet />}
        actions={
          <button onClick={() => void handleExport()} className="btn btn-export-excel" title="Export Excel">
            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            <span>Export Excel</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Data</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{items.length}</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"><Wallet className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Nominal</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2 tabular-nums">{formatCurrency(totalNominal)}</p>
          </div>
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600"><FileSpreadsheet className="w-6 h-6" /></div>
        </div>
      </div>

      <div className={SETUP_PAGE_TABLE_CARD_CLASS}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} table-fixed w-full`}>
            <colgroup>
              <col className="w-14" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-20" />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>No</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Tipe</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Total</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Nominal</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Terbayar</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Diproses</th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>Sisa</th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {items.map((item, index) => (
                <tr key={index} className={SETUP_PAGE_COMPACT_ROW_CLASS}>
                  <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>{index + 1}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm font-semibold text-gray-900`}>{item.type ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600`}>{item.status ?? "-"}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{item.total_records ?? 0}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{formatCurrency(item.nominal)}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{formatCurrency(item.paid_amount)}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{formatCurrency(item.processed_amount)}</td>
                  <td className={`${SETUP_PAGE_COMPACT_CELL_CLASS} text-sm text-gray-600 tabular-nums`}>{formatCurrency(item.remaining_amount)}</td>
                </tr>
              ))}
              {isFetching && <tr><td colSpan={8} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Memuat data laporan...</td></tr>}
              {!isFetching && items.length === 0 && <tr><td colSpan={8} className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}>Belum ada data laporan dana titipan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
