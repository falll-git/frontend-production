"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

import BreakdownList from "@/components/arsip-digital/laporan/BreakdownList";
import EmptyState from "@/components/arsip-digital/laporan/EmptyReportState";
import FollowUpRow from "@/components/arsip-digital/laporan/FollowUpRow";
import Panel from "@/components/arsip-digital/laporan/ReportPanel";
import WorkflowStat from "@/components/arsip-digital/laporan/WorkflowStat";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import {
  arsipService,
  type ArsipDigitalReportSummary,
} from "@/services/arsip.service";

export default function LaporanArsipDigitalPage() {
  const { showToast } = useAppToast();
  const [summary, setSummary] = useState<ArsipDigitalReportSummary | null>(
    null,
  );

  useEffect(() => {
    let ignore = false;

    async function loadSummary() {
      try {
        const result = await arsipService.getReportSummary();
        if (!ignore) setSummary(result);
      } catch (error) {
        if (!ignore) {
          setSummary(null);
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat laporan arsip digital.",
            "error",
          );
        }
      }
    }

    void loadSummary();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const operational = summary?.operational_summary ?? null;
  const scope = operational?.scope ?? summary?.scope ?? null;
  const documents = summary?.documents;
  const accessRequests = summary?.access_requests;
  const loans = summary?.loans;
  const breakdowns = summary?.breakdowns;
  const visibleFollowUpItems = (summary?.risk_queue ?? []).filter(
    (item) => item.total > 0,
  );
  const totalDocuments =
    documents?.total ?? summary?.overview.total_documents ?? 0;
  const scopeLabel = scope
    ? scope.can_report_all
      ? "Semua Data"
      : scope.division_name ?? "Data Saya"
    : "";
  const formatOwnerMeta = (item: {
    code: string | null;
    division_name?: string | null;
  }) =>
    [item.code, item.division_name]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(" / ") || null;

  return (
    <DashboardPageShell>
      <FeatureHeader
        title="Laporan Arsip Digital"
        subtitle="Ringkasan dokumen, akses/disposisi, dan peminjaman fisik arsip digital."
        icon={<Archive />}
        actions={
          scope ? (
            <SetupStatusBadge
              status="scope"
              tone={scope.can_report_all ? "sky" : "blue"}
              showIcon={false}
              label={
                <>
                  <span className="text-xs font-bold uppercase tracking-[0.08em]">
                    Scope
                  </span>
                  <span className="text-sm font-semibold tracking-normal text-slate-900">
                    {scopeLabel}
                  </span>
                </>
              }
              className="px-3 py-1.5"
              textClassName="inline-flex items-center gap-2"
            />
          ) : null
        }
      />

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <ClipboardList className="h-7 w-7 shrink-0 text-slate-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900">
                Total Dokumen
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Jumlah dokumen arsip digital sesuai scope laporan.
              </p>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {totalDocuments.toLocaleString("id-ID")}
          </p>
        </div>
      </section>

      <div className="mb-4">
        <Panel title="Dokumen Arsip" icon={ClipboardList}>
          <div className="grid gap-3 sm:grid-cols-3">
            <WorkflowStat
              label="Non-restrict"
              value={documents?.non_restricted ?? 0}
            />
            <WorkflowStat label="Restrict" value={documents?.restricted ?? 0} />
            <WorkflowStat
              label="Terkait Debitur"
              value={documents?.linked_to_debtor ?? 0}
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <BreakdownList
              title="Jenis Dokumen"
              items={breakdowns?.by_document_type ?? []}
              emptyText="Belum ada data jenis dokumen."
            />
            <BreakdownList
              title="PIC / Pemilik"
              items={breakdowns?.by_owner_user ?? []}
              emptyText="Belum ada data PIC dokumen."
              mapMeta={formatOwnerMeta}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel title="Peminjaman Fisik" icon={BookOpen}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <WorkflowStat
                label="Pending"
                value={loans?.pending ?? 0}
              />
              <WorkflowStat
                label="Disetujui"
                value={loans?.approved ?? 0}
              />
              <WorkflowStat
                label="Serah Terima"
                value={loans?.handed_over ?? 0}
              />
              <WorkflowStat
                label="Dipinjam"
                value={loans?.borrowed ?? 0}
              />
              <WorkflowStat
                label="Jatuh Tempo"
                value={loans?.due_soon ?? 0}
              />
              <WorkflowStat
                label="Overdue"
                value={loans?.overdue ?? 0}
              />
              <WorkflowStat
                label="Kembali"
                value={loans?.returned ?? 0}
              />
              <WorkflowStat
                label="Ditolak"
                value={loans?.rejected ?? 0}
              />
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel title="Disposisi Akses" icon={ShieldCheck}>
            <div className="grid gap-3 sm:grid-cols-2">
              <WorkflowStat
                label="Pending"
                value={accessRequests?.pending ?? 0}
              />
              <WorkflowStat
                label="Aktif"
                value={accessRequests?.active ?? 0}
              />
              <WorkflowStat
                label="Akan Expired"
                value={accessRequests?.expiring_soon ?? 0}
              />
              <WorkflowStat
                label="Expired"
                value={accessRequests?.expired ?? 0}
              />
              <WorkflowStat
                label="Ditolak"
                value={accessRequests?.rejected ?? 0}
                className="sm:col-span-2 sm:mx-auto sm:w-1/2"
              />
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4">
        <Panel title="Perlu Ditindaklanjuti" icon={AlertTriangle}>
          <div className="space-y-3">
            {visibleFollowUpItems.length > 0 ? (
              visibleFollowUpItems.map((item) => (
                <FollowUpRow key={item.key} item={item} />
              ))
            ) : (
              <EmptyState>Tidak ada tindak lanjut arsip digital.</EmptyState>
            )}
          </div>
        </Panel>
      </div>
    </DashboardPageShell>
  );
}
