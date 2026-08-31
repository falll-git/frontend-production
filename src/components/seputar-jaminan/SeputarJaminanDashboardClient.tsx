"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Images,
  LayoutDashboard,
  RefreshCw,
  Send,
  Store,
  UsersRound,
} from "lucide-react";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import DashboardNotice from "@/components/ui/DashboardNotice";
import SetupState from "@/components/ui/SetupState";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { seputarJaminanService } from "@/services/seputar-jaminan.service";
import type { SjDashboard } from "@/types/seputar-jaminan.types";
import {
  SJ_CATALOG,
  SJ_PROFILE,
  SJ_REVIEW,
  SJ_ROOT,
  SjPageHeader,
  SjSecondaryButton,
  SjSection,
  SjStatusBadge,
  readableError,
} from "./SeputarJaminanUI";

const METRICS = [
  { key: "DRAFT", label: "Draf", hint: "Belum diajukan", icon: Images },
  { key: "IN_REVIEW", label: "Menunggu diperiksa", hint: "Perlu pemeriksa lain", icon: ClipboardCheck },
  { key: "PUBLISHED", label: "Sedang tayang", hint: "Terlihat di website publik", icon: Store },
  { key: "REVISION_REQUIRED", label: "Perlu diperbaiki", hint: "Dikembalikan oleh pemeriksa", icon: RefreshCw },
] as const;

const DASHBOARD_ACTIONS = [
  {
    href: SJ_CATALOG,
    title: "Kelola katalog",
    description: "Buat draf, lihat status, dan perbarui publikasi.",
    icon: Store,
  },
  {
    href: SJ_REVIEW,
    title: "Periksa pengajuan",
    description: "Setujui atau kembalikan data kepada pembuat.",
    icon: BadgeCheck,
  },
  {
    href: SJ_PROFILE,
    title: "Profil & WhatsApp",
    description: "Atur identitas BPRS dan kontak marketing.",
    icon: UsersRound,
  },
] as const;

export default function SeputarJaminanDashboardClient() {
  const [data, setData] = useState<SjDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const { showToast } = useAppToast();
  const access = useProtectedAction();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await seputarJaminanService.getDashboard());
    } catch (loadError) {
      setError(readableError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const failedSync = useMemo(
    () => (data?.synchronization.FAILED ?? 0) + (data?.synchronization.QUARANTINED ?? 0),
    [data],
  );
  const totalPublications = data
    ? METRICS.reduce((total, { key }) => total + (data.publications[key] ?? 0), 0)
    : 0;

  const reconcile = async () => {
    if (!access.ensureFeature(SJ_ROOT, "sj_sync_retry")) return;
    setReconciling(true);
    try {
      await seputarJaminanService.createReconciliation();
      showToast("Pemeriksaan kesesuaian data sudah dijadwalkan.", "success");
      await load();
    } catch (actionError) {
      showToast(readableError(actionError), "error");
    } finally {
      setReconciling(false);
    }
  };

  return (
    <DashboardPageShell spacing="lg" animated>
      <SjPageHeader
        eyebrow="Seputar Jaminan · Ruwang"
        title="Pusat publikasi aset"
        description="Siapkan, periksa, dan pantau katalog publik dari satu tempat. Data internal tetap berada di Ruwang Arsip."
        icon={LayoutDashboard}
        action={
          <SjSecondaryButton onClick={() => void load()} loading={loading}>
            {!loading ? <RefreshCw className="size-4" aria-hidden="true" /> : null}
            Muat ulang
          </SjSecondaryButton>
        }
      />

      {loading ? (
        <SetupState variant="loading" title="Memuat ringkasan publikasi…" description="Mohon tunggu sebentar." />
      ) : error ? (
        <SetupState variant="error" title="Ringkasan belum dapat dimuat" description={error} />
      ) : data ? (
        <>
          <SjSection title="Ringkasan publikasi" description="Jumlah katalog berdasarkan tahap pengerjaannya.">
            {totalPublications === 0 ? (
              <div className="p-5">
                <SetupState
                  title="Belum ada publikasi"
                  description="Mulai dari Kelola katalog untuk menyiapkan publikasi pertama."
                  icon={Store}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 border-t border-slate-200 lg:grid-cols-4">
                {METRICS.map(({ key, label, hint, icon: Icon }, index) => (
                  <article
                    key={key}
                    className={[
                      "min-w-0 px-4 py-4 sm:px-5",
                      index === 1 ? "border-l border-slate-200" : "",
                      index === 2 ? "border-t border-slate-200 lg:border-l lg:border-t-0" : "",
                      index === 3 ? "border-l border-t border-slate-200 lg:border-t-0" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold leading-5 text-slate-600">{label}</p>
                      <Icon className="size-5 shrink-0 text-sky-600" strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{data.publications[key] ?? 0}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{hint}</p>
                  </article>
                ))}
              </div>
            )}
          </SjSection>

          <SjSection title="Mulai dari sini" description="Pilih pekerjaan yang ingin dilakukan.">
            <nav
              aria-label="Pekerjaan Seputar Jaminan"
              className="grid divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0"
            >
              {DASHBOARD_ACTIONS.map(({ href, title, description, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex min-h-20 items-center gap-4 px-4 py-4 transition-colors hover:bg-sky-50/60 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-sky-600/20 sm:px-5"
                >
                  <Icon className="size-6 shrink-0 text-sky-600" strokeWidth={1.8} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-slate-950">{title}</span>
                    <span className="mt-0.5 block text-sm leading-5 text-slate-600">{description}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-slate-400 transition-colors group-hover:text-sky-700" aria-hidden="true" />
                </Link>
              ))}
            </nav>

            <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
              {data.connection ? (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Send className="mt-0.5 size-6 shrink-0 text-sky-600" strokeWidth={1.8} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-slate-950">Koneksi website publik</p>
                        <SjStatusBadge state={data.connection.connection_state} kind="connection" />
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-600">
                        {data.connection.last_success_at ? "Pengiriman terakhir berhasil tercatat." : "Belum ada pengiriman yang berhasil."}
                        {` ${data.synchronization.QUEUED ?? 0} menunggu dikirim · ${failedSync} perlu ditangani.`}
                      </p>
                    </div>
                  </div>
                  <SjSecondaryButton loading={reconciling} onClick={() => void reconcile()}>
                    {!reconciling ? <RefreshCw className="size-4" aria-hidden="true" /> : null}
                    Periksa kesesuaian data
                  </SjSecondaryButton>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 size-6 shrink-0 text-sky-600" strokeWidth={1.8} aria-hidden="true" />
                  <div>
                    <p className="text-base font-bold text-slate-950">Koneksi belum disiapkan</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Hubungi admin sistem untuk menghubungkan instalasi BPRS ini. Pengguna tidak perlu mengisi pengaturan teknis sendiri.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </SjSection>

          {data.need_confirmation_soon > 0 ? (
            <DashboardNotice
              tone="amber"
              icon={<RefreshCw className="size-6" aria-hidden="true" />}
              title={`${data.need_confirmation_soon} katalog perlu dikonfirmasi dalam tujuh hari.`}
              description="Buka daftar katalog agar informasi ketersediaan tetap akurat."
            />
          ) : null}
        </>
      ) : null}
    </DashboardPageShell>
  );
}
