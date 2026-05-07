"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Clock, LogOut, Menu, X } from "lucide-react";
import Notification from "@/components/Notification";
import PageLoader from "@/components/ui/PageLoader";
import {
  DocumentPreviewProvider,
  useDocumentPreviewContext,
} from "@/components/ui/DocumentPreviewContext";
import { ArsipDigitalMasterDataProvider } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { ArsipDigitalWorkflowProvider } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { DashboardSidebarMenu } from "@/components/dashboard/DashboardSidebarMenu";
import {
  FEATURE_BLOCKED_MESSAGE,
  RBAC_DENIED_MESSAGE,
  filterMenuTreeForRoleRead,
  getRoleLabel,
  getDashboardRouteDecision,
} from "@/lib/rbac";
import { formatDateDisplay, toIsoDate } from "@/lib/utils/date";

const SIDEBAR_OPEN_STORAGE_KEY = "ruang-arsip.dashboard.sidebar-open";

const DASHBOARD_TITLE_BY_PATH: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/arsip-digital/input-dokumen": "Input Dokumen Digital",
  "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan":
    "Tempat Penyimpanan",
  "/dashboard/arsip-digital/ruang-arsip/list-dokumen":
    "List Dokumen Digital",
  "/dashboard/arsip-digital/ruang-arsip/jatuh-tempo":
    "Dokumen Dipinjam Jatuh Tempo",
  "/dashboard/arsip-digital/disposisi/pengajuan": "Pengajuan Disposisi",
  "/dashboard/arsip-digital/disposisi/permintaan": "Permintaan Disposisi",
  "/dashboard/arsip-digital/disposisi/historis": "Historis Disposisi",
  "/dashboard/arsip-digital/peminjaman/request": "Request Peminjaman",
  "/dashboard/arsip-digital/peminjaman/accept": "Accept Peminjaman",
  "/dashboard/arsip-digital/peminjaman/laporan": "Laporan Peminjaman",
  "/dashboard/arsip-digital/historis/penyimpanan": "Historis Penyimpanan",
  "/dashboard/arsip-digital/historis/peminjaman":
    "Historis Peminjaman Dokumen",
  "/dashboard/arsip-digital/laporan": "Laporan Arsip Digital",
  "/dashboard/manajemen-surat/kelola-surat/input-surat-masuk":
    "Input Surat Masuk",
  "/dashboard/manajemen-surat/kelola-surat/input-surat-keluar":
    "Input Surat Keluar",
  "/dashboard/manajemen-surat/kelola-surat/input-memorandum":
    "Input Memorandum",
  "/dashboard/manajemen-surat/laporan": "Laporan Persuratan",
  "/dashboard/manajemen-surat/cetak-dokumen": "Cetak Dokumen",
  "/dashboard/informasi-debitur": "List Debitur",
  "/dashboard/informasi-debitur/master-debitur": "Master Debitur & Kontrak",
  "/dashboard/informasi-debitur/marketing/action-plan":
    "Input Progress - Action Plan",
  "/dashboard/informasi-debitur/marketing/hasil-kunjungan":
    "Input Progress - Hasil Kunjungan",
  "/dashboard/informasi-debitur/marketing/langkah-penanganan":
    "Input Progress - Langkah Penanganan",
  "/dashboard/informasi-debitur/admin/upload-slik":
    "Administrator - Upload Data SLIK",
  "/dashboard/informasi-debitur/admin/upload-restrik":
    "Administrator - Upload Data Restrik",
  "/dashboard/informasi-debitur/admin/import-debitur":
    "Import Master Debitur & Kontrak",
  "/dashboard/informasi-debitur/admin/import-kolektibilitas":
    "Import Kolektibilitas & Outstanding",
  "/dashboard/informasi-debitur/laporan": "Laporan Debitur",
  "/dashboard/informasi-debitur/laporan/npf": "Laporan NPF",
  "/dashboard/informasi-debitur/laporan/aktivitas-marketing":
    "Laporan Aktivitas Marketing",
  "/dashboard/legal": "Manajemen Legal",
  "/dashboard/legal/template-dokumen": "Template Dokumen Legal",
  "/dashboard/legal/cetak/akad": "Dokumen Akad",
  "/dashboard/legal/cetak/haftsheet": "Haftsheet",
  "/dashboard/legal/cetak/surat-peringatan": "Surat Peringatan",
  "/dashboard/legal/cetak/formulir-asuransi": "Formulir Asuransi",
  "/dashboard/legal/cetak/keterangan-lunas": "Surat Keterangan Lunas",
  "/dashboard/legal/cetak/surat-samsat": "Surat Samsat",
  "/dashboard/legal/titipan/asuransi": "Dana Titipan Asuransi",
  "/dashboard/legal/titipan/notaris": "Dana Titipan Notaris",
  "/dashboard/legal/titipan/angsuran": "Dana Titipan Angsuran",
  "/dashboard/legal/progress/notaris": "Progress Notaris",
  "/dashboard/legal/progress/asuransi": "Progress Asuransi",
  "/dashboard/legal/progress/klaim": "Tracking Claim Asuransi",
  "/dashboard/legal/upload-ideb": "Upload Ideb",
  "/dashboard/legal/laporan/pihak-ketiga/dokumen":
    "Laporan Pihak 3 - Dokumen",
  "/dashboard/legal/laporan/pihak-ketiga/dana-titipan":
    "Laporan Pihak 3 - Dana Titipan",
  "/dashboard/legal/laporan": "Laporan Legal",
  "/dashboard/users": "Manajemen User",
  "/dashboard/parameter/role": "Setup Role",
  "/dashboard/parameter/role-menu": "Setup Akses Menu per Role",
  "/dashboard/parameter/divisi": "Setup Divisi",
  "/dashboard/parameter/jenis-dokumen": "Setup Jenis Dokumen",
  "/dashboard/parameter/tempat-penyimpanan": "Setup Lokasi Arsip",
  "/dashboard/parameter/prioritas-surat": "Setup Prioritas Surat",
  "/dashboard/parameter/pihak-ketiga/notaris": "Setup Notaris",
  "/dashboard/parameter/pihak-ketiga/perusahaan-asuransi":
    "Setup Perusahaan Asuransi",
  "/dashboard/parameter/template-penomoran": "Setup Template Penomoran",
  "/dashboard/parameter/checklist-dokumen": "Setup Checklist Dokumen",
  "/dashboard/parameter/produk-pembiayaan": "Setup Produk Pembiayaan",
  "/dashboard/parameter/jenis-akad": "Setup Jenis Akad",
  "/dashboard/parameter/kolektibilitas": "Setup Kolektibilitas",
  "/dashboard/parameter/cabang": "Setup Cabang",
  "/dashboard/parameter/profil-lembaga": "Setup Profil Lembaga",
  "/dashboard/parameter/sla-pengingat": "Setup SLA & Pengingat",
  "/dashboard/parameter/aktivitas-marketing": "Setup Aktivitas Marketing",
  "/dashboard/parameter/jenis-titipan": "Setup Jenis Titipan",
};

function getDashboardPageTitle(pathname: string) {
  if (
    pathname.startsWith(
      "/dashboard/arsip-digital/ruang-arsip/tempat-penyimpanan/",
    )
  ) {
    return "Detail Tempat Penyimpanan";
  }

  return DASHBOARD_TITLE_BY_PATH[pathname] ?? "Dashboard";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocumentPreviewProvider>
      <ArsipDigitalMasterDataProvider>
        <ArsipDigitalWorkflowProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </ArsipDigitalWorkflowProvider>
      </ArsipDigitalMasterDataProvider>
    </DocumentPreviewProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isPreviewOpen } = useDocumentPreviewContext();
  const router = useRouter();
  const { status, user, role, signOut, dashboardMenus } = useAuth();
  const { showToast } = useAppToast();
  const lastDeniedPathRef = useRef<string | null>(null);
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.sessionStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    if (stored === "0") return false;
    if (stored === "1") return true;
    return true;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [isDesktop, setIsDesktop] = useState(false);
  const routeDecision = getDashboardRouteDecision(pathname, role, user?.role_id);
  const pageTitle = getDashboardPageTitle(pathname);
  const lastScrollYRef = useRef(0);
  const scrollTickingRef = useRef(false);

  const updateSidebarOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setSidebarOpen((prev) => {
        const next =
          typeof value === "function"
            ? (value as (prev: boolean) => boolean)(prev)
            : value;

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            SIDEBAR_OPEN_STORAGE_KEY,
            next ? "1" : "0",
          );
        }

        return next;
      });
    },
    [],
  );

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, router, signOut]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const updateMatch = () => setIsDesktop(media.matches);
    updateMatch();
    media.addEventListener("change", updateMatch);
    return () => media.removeEventListener("change", updateMatch);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      if (window.innerWidth < 640) updateSidebarOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateSidebarOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleScroll = () => {
      if (scrollTickingRef.current) return;
      scrollTickingRef.current = true;

      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const shouldShowHeader = !(
          currentY > lastScrollYRef.current && currentY > 100
        );

        setHeaderVisible((prev) =>
          prev === shouldShowHeader ? prev : shouldShowHeader,
        );

        lastScrollYRef.current = currentY;
        scrollTickingRef.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const isFormField = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (target.isContentEditable) return true;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
        return true;
      return false;
    };

    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const handleFocusIn = (e: FocusEvent) => {
      if (isFormField(e.target)) setIsFocusMode(true);
    };

    const handleFocusOut = () => {
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        const active = document.activeElement;
        if (!isFormField(active)) setIsFocusMode(false);
      }, 120);
    };

    const handleSubmit = () => {
      setIsFocusMode(true);
      if (blurTimer) clearTimeout(blurTimer);
      blurTimer = setTimeout(() => setIsFocusMode(false), 1200);
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("submit", handleSubmit, true);

    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("submit", handleSubmit, true);
      if (blurTimer) clearTimeout(blurTimer);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsFocusMode(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const selector = '.modal-overlay, [data-dashboard-overlay="true"]';
    const updateOverlayState = () => {
      setIsOverlayOpen(Boolean(document.querySelector(selector)));
    };

    updateOverlayState();
    const observer = new MutationObserver(updateOverlayState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    if (status !== "authenticated" || !role) return;
    if (routeDecision.allowed) {
      lastDeniedPathRef.current = null;
      return;
    }

    if (lastDeniedPathRef.current === pathname) return;
    lastDeniedPathRef.current = pathname;

    showToast(
      routeDecision.reason === "FEATURE_BLOCKED"
        ? routeDecision.message ?? FEATURE_BLOCKED_MESSAGE
        : RBAC_DENIED_MESSAGE,
      "warning",
    );
    router.replace("/dashboard");
  }, [
    pathname,
    role,
    routeDecision.allowed,
    routeDecision.message,
    routeDecision.reason,
    router,
    showToast,
    status,
  ]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, [status]);

  const visibleMenus = useMemo(
    () => filterMenuTreeForRoleRead(user?.role_id, dashboardMenus),
    [user?.role_id, dashboardMenus],
  );

  if (status !== "authenticated" || !user || !role || !routeDecision.allowed) {
    return <PageLoader />;
  }

  const sidebarWidth = 280;
  const shouldOffsetMain =
    isDesktop && sidebarOpen && !isPreviewOpen && !isOverlayOpen;
  const isSidebarExpanded = !isDesktop || sidebarOpen;

  const handleSidebarNavClickCapture = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const anchor = target.closest(
      "a.sidebar-menu-item, a.sidebar-submenu-item",
    );
    if (!anchor) return;
    if (anchor.classList.contains("rbac-disabled")) return;

    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/dashboard")) return;

    updateSidebarOpen(false);
    setMobileMenuOpen(false);
  };
  const mainStyle: CSSProperties = {
    marginLeft: shouldOffsetMain ? `${sidebarWidth}px` : "0px",
    width: shouldOffsetMain ? `calc(100% - ${sidebarWidth}px)` : "100%",
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e6f2fa 100%)",
      }}
    >
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen transition-all duration-300 ease-in-out flex-col ${
          mobileMenuOpen ? "flex" : "hidden"
        } lg:flex`}
        style={{
          width: `${sidebarWidth}px`,
          background:
            "linear-gradient(180deg, #157ec3 0%, #0f5f96 50%, #0d5a8f 100%)",
          boxShadow: "4px 0 30px rgba(21, 126, 195, 0.2)",
          overflow: "hidden",
          transform:
            isPreviewOpen || isOverlayOpen || (isDesktop && !sidebarOpen)
              ? "translateX(-100%)"
              : "translateX(0)",
        }}
      >
        <div
          className="p-5 border-b"
          style={{
            borderColor: "rgba(255, 255, 255, 0.1)",
            background: "rgba(255, 255, 255, 0.05)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            {isSidebarExpanded ? (
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-[15px] font-extrabold text-white tracking-wide leading-tight">
                  RUWANG ARSIP
                </h1>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center">
                <span className="text-base font-extrabold text-white tracking-wide leading-none">
                  RA
                </span>
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <nav
          className="flex-1 py-3 sidebar-nav"
          onClickCapture={handleSidebarNavClickCapture}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.3) transparent",
            overflowX: "hidden",
            overflowY: "auto",
            maxWidth: "100%",
          }}
        >
          <DashboardSidebarMenu
            pathname={pathname}
            visibleMenus={visibleMenus}
            sidebarExpanded={isSidebarExpanded}
          />
        </nav>

        <div
          className="p-4 border-t"
          style={{
            borderColor: "rgba(255, 255, 255, 0.1)",
            background: "rgba(0, 0, 0, 0.15)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: "rgba(255, 255, 255, 0.2)", flexShrink: 0 }}
            >
              {user.name.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-white/70">
                  {getRoleLabel(role)}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              className="logout-btn"
              style={{ flexShrink: 0 }}
              disabled={isSigningOut}
              aria-label="Logout"
            >
              <div className="sign">
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="logout-text">
                {isSigningOut ? "Keluar..." : "Logout"}
              </div>
            </button>
          </div>
        </div>
      </aside>

      <main className="transition-all duration-300" style={mainStyle}>
        <header
          className={`px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 transition-all duration-300 transform ${
            headerVisible && !isPreviewOpen && !isFocusMode && !isOverlayOpen
              ? "translate-y-0 opacity-100"
              : "-translate-y-full opacity-0 pointer-events-none"
          }`}
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2 lg:gap-4">
            <button
              onClick={() => {
                updateSidebarOpen(true);
                setMobileMenuOpen(true);
              }}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Buka menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={() => updateSidebarOpen((prev) => !prev)}
              className="hidden lg:inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#157ec3] transition-colors hover:bg-[#157ec3]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157ec3]/30"
              aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
              title={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
              aria-pressed={sidebarOpen}
            >
              {sidebarOpen ? (
                <X className="h-7 w-7" aria-hidden="true" />
              ) : (
                <Menu className="h-7 w-7" aria-hidden="true" />
              )}
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {pageTitle}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Notification />
            <div
              className="hidden sm:flex items-center rounded-full border text-sm shadow-sm overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(21, 126, 195, 0.1) 0%, rgba(13, 90, 143, 0.06) 100%)",
                borderColor: "rgba(21, 126, 195, 0.18)",
              }}
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <Clock className="w-4 h-4 text-[#0d5a8f]" aria-hidden="true" />
                <span className="font-semibold tabular-nums text-[#0d5a8f]">
                  {now.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div
                className="h-9 w-px"
                style={{ background: "rgba(21, 126, 195, 0.16)" }}
              />

              <div className="flex items-center gap-2 px-4 py-2">
                <CalendarDays
                  className="w-4 h-4 text-[#0d5a8f]"
                  aria-hidden="true"
                />
                <span className="font-semibold text-[#0d5a8f] tabular-nums">
                  {formatDateDisplay(toIsoDate(now), "")}
                </span>
              </div>
            </div>

            <div
              className="sm:hidden flex items-center gap-2 px-3 py-2 rounded-full border text-sm shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, rgba(21, 126, 195, 0.1) 0%, rgba(13, 90, 143, 0.06) 100%)",
                borderColor: "rgba(21, 126, 195, 0.18)",
                color: "#0d5a8f",
              }}
            >
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span className="font-semibold tabular-nums">
                {now.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
