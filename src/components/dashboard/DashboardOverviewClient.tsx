"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  FolderArchive,
  Grid2x2,
  Mail,
  Scale,
  TrendingDown,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import DashboardModal from "@/components/ui/DashboardModal";
import LaporanAktivitasMarketingSection from "@/components/dashboard/LaporanAktivitasMarketingSection";
import LaporanNPFSection from "@/components/dashboard/LaporanNPFSection";
import LaporanPihakKetigaSection from "@/components/dashboard/LaporanPihakKetigaSection";
import LaporanTitipanSection from "@/components/dashboard/LaporanTitipanSection";
import StorageOverviewWidget from "@/components/dashboard/StorageOverviewWidget";
import ProtectedLink from "@/components/rbac/ProtectedLink";
import { getRoleLabel } from "@/lib/rbac";
import { menuService } from "@/services/menu.service";
import type { DashboardMenuNode } from "@/types/rbac.types";

type DashboardCardTone = {
  accentColor: string;
  icon: ReactNode;
};

const MODULE_REPORT_COMPONENT_PREFIX = "dashboard.module_report.";
const STORAGE_USAGE_COMPONENT_KEY = "dashboard.storage_usage";
type DashboardReportSectionProps = {
  widget: DashboardMenuNode;
  showTitle?: boolean;
};
const DASHBOARD_REPORT_SECTION_RENDERERS: Record<
  string,
  ComponentType<DashboardReportSectionProps>
> = {
  "dashboard.report.third_party_documents": LaporanPihakKetigaSection,
  "dashboard.report.third_party_deposit_funds": LaporanTitipanSection,
  "dashboard.report.npf": LaporanNPFSection,
  "dashboard.report.marketing_activity": LaporanAktivitasMarketingSection,
};
const DASHBOARD_REPORT_SECTION_ORDER: Record<string, number> = {
  "dashboard.report.third_party_documents": 10,
  "dashboard.report.third_party_deposit_funds": 20,
  "dashboard.report.npf": 30,
  "dashboard.report.marketing_activity": 40,
};
const DASHBOARD_MODAL_REPORT_KEYS = new Set<string>();

function hexToRgb(value: string): string | null {
  const hex = value.replace("#", "").trim();
  if (hex.length !== 3 && hex.length !== 6) return null;

  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function DashboardWidgetCard({
  title,
  icon,
  href,
  subtitle,
  badge,
  accentColor,
  buttonText = "Lihat Detail",
  className = "",
}: {
  title: string;
  icon: ReactNode;
  href: string;
  subtitle: string;
  badge?: string;
  accentColor: string;
  buttonText?: string;
  className?: string;
}) {
  const accentRgb = hexToRgb(accentColor) ?? "21, 126, 195";

  return (
    <ProtectedLink
      href={href}
      className={["uiverse-card", className].filter(Boolean).join(" ")}
      style={
        {
          "--card-accent": accentColor,
          "--card-accent-rgb": accentRgb,
        } as CSSProperties
      }
      title={title}
    >
      <div className="uiverse-card-shine" aria-hidden="true" />
      <div className="uiverse-card-glow" aria-hidden="true" />
      <div className="uiverse-card-content">
        {badge ? <div className="uiverse-card-badge">{badge}</div> : null}
        <div className="uiverse-card-image">
          <div className="text-white">{icon}</div>
        </div>
        <div className="uiverse-card-text">
          <p className="uiverse-card-title">{title}</p>
          <p className="uiverse-card-description">{subtitle}</p>
        </div>
        <div className="uiverse-card-footer">
          <div className="uiverse-card-price">{buttonText}</div>
          <div className="uiverse-card-button">
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </ProtectedLink>
  );
}

function DashboardModuleReportCard({
  widget,
  tone,
}: {
  widget: DashboardMenuNode;
  tone: DashboardCardTone;
}) {
  return (
    <DashboardWidgetCard
      title={widget.name}
      href={widget.url}
      subtitle={getWidgetSubtitle(widget)}
      accentColor={tone.accentColor}
      icon={tone.icon}
      buttonText="Akses Laporan"
      className="uiverse-card--module-report"
    />
  );
}

function DashboardReportShortcutCard({
  widget,
  tone,
  onOpen,
}: {
  widget: DashboardMenuNode;
  tone: DashboardCardTone;
  onOpen: (widget: DashboardMenuNode) => void;
}) {
  const accentRgb = hexToRgb(tone.accentColor) ?? "21, 126, 195";

  return (
    <button
      type="button"
      className="uiverse-card text-left"
      aria-label={`Buka ${widget.name}`}
      style={
        {
          "--card-accent": tone.accentColor,
          "--card-accent-rgb": accentRgb,
        } as CSSProperties
      }
      onClick={() => onOpen(widget)}
    >
      <div className="uiverse-card-shine" aria-hidden="true" />
      <div className="uiverse-card-glow" aria-hidden="true" />
      <div className="uiverse-card-content">
        <div className="uiverse-card-badge">Dashboard</div>
        <div className="uiverse-card-image">
          <div className="text-white">{tone.icon}</div>
        </div>
        <div className="uiverse-card-text">
          <p className="uiverse-card-title">{widget.name}</p>
          <p className="uiverse-card-description">{getWidgetSubtitle(widget)}</p>
        </div>
        <div className="uiverse-card-footer">
          <div className="uiverse-card-price">Buka Laporan</div>
          <div className="uiverse-card-button">
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </button>
  );
}

function DashboardSkeletonLine({
  width = "100%",
  height = "14px",
}: {
  width?: string;
  height?: string;
}) {
  return <div className="skeleton-line" style={{ width, height }} />;
}

function DashboardSkeletonModules({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card skeleton-card--module-report">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <DashboardSkeletonLine width="60%" height="14px" />
              <DashboardSkeletonLine width="70%" height="12px" />
              <DashboardSkeletonLine width="50%" height="12px" />
            </div>
            <div className="skeleton-icon" />
          </div>
          <div className="mt-6">
            <DashboardSkeletonLine width="45%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeletonBanner() {
  return (
    <div className="skeleton-banner">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <DashboardSkeletonLine width="45%" height="28px" />
          <DashboardSkeletonLine width="65%" height="16px" />
        </div>
        <div className="hidden skeleton-icon-lg md:block" />
      </div>
    </div>
  );
}

function getWidgetTone(widget: DashboardMenuNode): DashboardCardTone {
  switch (widget.component_key) {
    case "dashboard.module_report.digital_archive":
      return {
        accentColor: "#157ec3",
        icon: <FolderArchive className="h-8 w-8" aria-hidden="true" />,
      };
    case "dashboard.module_report.correspondence":
      return {
        accentColor: "#7c3aed",
        icon: <Mail className="h-8 w-8" aria-hidden="true" />,
      };
    case "dashboard.module_report.debtor":
      return {
        accentColor: "#0f766e",
        icon: <Users className="h-8 w-8" aria-hidden="true" />,
      };
    case "dashboard.module_report.legal":
      return {
        accentColor: "#d97706",
        icon: <Scale className="h-8 w-8" aria-hidden="true" />,
      };
    case "dashboard.report.npf":
      return {
        accentColor: "#dc2626",
        icon: <TrendingDown className="h-8 w-8" aria-hidden="true" />,
      };
    case "dashboard.report.marketing_activity":
      return {
        accentColor: "#0f766e",
        icon: <Activity className="h-8 w-8" aria-hidden="true" />,
      };
    default:
      return {
        accentColor: "#157ec3",
        icon: <BarChart3 className="h-8 w-8" aria-hidden="true" />,
      };
  }
}

function getWidgetSubtitle(widget: DashboardMenuNode): string {
  switch (widget.component_key) {
    case "dashboard.module_report.digital_archive":
      return "Dokumen dan penyimpanan";
    case "dashboard.module_report.correspondence":
      return "Surat dan memorandum";
    case "dashboard.module_report.debtor":
      return "Debitur dan pembiayaan";
    case "dashboard.module_report.legal":
      return "Legal dan pihak ketiga";
    case "dashboard.report.npf":
      return "Rasio NPF, kolektibilitas, dan tren pembiayaan";
    case "dashboard.report.marketing_activity":
      return "Action plan, kunjungan, dan langkah penanganan";
    default:
      break;
  }

  if (widget.parent) return `Widget dashboard ${widget.parent}`;
  if (widget.component_key) return widget.component_key;
  return "Widget dashboard";
}

function isModuleReportWidget(widget: DashboardMenuNode): boolean {
  return Boolean(widget.component_key?.startsWith(MODULE_REPORT_COMPONENT_PREFIX));
}

function isDashboardReportSectionWidget(widget: DashboardMenuNode): boolean {
  return Boolean(
    widget.component_key &&
      DASHBOARD_REPORT_SECTION_RENDERERS[widget.component_key],
  );
}

function isDashboardModalReportWidget(widget: DashboardMenuNode): boolean {
  return Boolean(
    widget.component_key && DASHBOARD_MODAL_REPORT_KEYS.has(widget.component_key),
  );
}

function isStorageUsageWidget(widget: DashboardMenuNode): boolean {
  return widget.component_key === STORAGE_USAGE_COMPONENT_KEY;
}

function canRenderDashboardWidget(widget: DashboardMenuNode): boolean {
  if (
    widget.menu_type !== "DASHBOARD_WIDGET" ||
    widget.placement !== "DASHBOARD" ||
    widget.role_permissions?.can_read === false
  ) {
    return false;
  }

  if (isStorageUsageWidget(widget)) return true;

  return true;
}

function getDashboardReportSectionOrder(widget: DashboardMenuNode): number {
  if (widget.component_key && widget.component_key in DASHBOARD_REPORT_SECTION_ORDER) {
    return DASHBOARD_REPORT_SECTION_ORDER[widget.component_key];
  }

  return 1000 + widget.order;
}

export default function DashboardOverviewClient() {
  const { user, role, status } = useAuth();
  const [isWidgetLoading, setIsWidgetLoading] = useState(false);
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardMenuNode[]>(
    [],
  );
  const [activeReportWidget, setActiveReportWidget] =
    useState<DashboardMenuNode | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setDashboardWidgets([]);
      return;
    }

    let ignore = false;

    async function loadDashboardWidgets() {
      setIsWidgetLoading(true);
      try {
        const items = await menuService.getDashboardWidgets();
        if (!ignore) setDashboardWidgets(items);
      } catch {
        if (!ignore) setDashboardWidgets([]);
      } finally {
        if (!ignore) setIsWidgetLoading(false);
      }
    }

    void loadDashboardWidgets();

    return () => {
      ignore = true;
    };
  }, [status]);

  const widgetCards = useMemo(
    () => dashboardWidgets.filter(canRenderDashboardWidget),
    [dashboardWidgets],
  );
  const moduleReportCards = useMemo(
    () => widgetCards.filter(isModuleReportWidget),
    [widgetCards],
  );
  const storageUsageWidget = useMemo(
    () => widgetCards.find(isStorageUsageWidget) ?? null,
    [widgetCards],
  );
  const dashboardReportSections = useMemo(
    () =>
      widgetCards
        .filter(isDashboardReportSectionWidget)
        .filter((widget) => !isDashboardModalReportWidget(widget))
        .sort(
          (left, right) =>
            getDashboardReportSectionOrder(left) -
              getDashboardReportSectionOrder(right) ||
            left.name.localeCompare(right.name, "id-ID"),
        ),
    [widgetCards],
  );
  const modalReportCards = useMemo(
    () =>
      widgetCards
        .filter(isDashboardModalReportWidget)
        .sort(
          (left, right) =>
            getDashboardReportSectionOrder(left) -
              getDashboardReportSectionOrder(right) ||
            left.name.localeCompare(right.name, "id-ID"),
        ),
    [widgetCards],
  );
  const secondaryReportCards = useMemo(
    () =>
      widgetCards.filter(
        (widget) =>
          !isModuleReportWidget(widget) &&
          !isDashboardReportSectionWidget(widget) &&
          !isDashboardModalReportWidget(widget) &&
          !isStorageUsageWidget(widget),
      ),
    [widgetCards],
  );
  const activeReportComponentKey = activeReportWidget?.component_key ?? "";
  const ActiveReportSection =
    activeReportComponentKey.length > 0
      ? DASHBOARD_REPORT_SECTION_RENDERERS[activeReportComponentKey]
      : null;

  if (status === "loading") {
    return (
      <div className="space-y-8">
        <DashboardSkeletonBanner />
        <DashboardSkeletonModules count={4} />
      </div>
    );
  }

  return (
    <>
      <div
        className="welcome-banner rounded-2xl p-4 text-white animate-fade-in lg:p-8"
        style={{
          background: "linear-gradient(135deg, #157ec3 0%, #0d5a8f 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="mb-2 text-xl font-bold leading-tight lg:text-3xl">
              Assalamualaikum, {user?.name ?? "Pengguna"}!
            </h1>
          </div>

          <div className="hidden items-center md:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
              <span className="text-sm font-semibold">
                {getRoleLabel(role)}
              </span>
              <span className="text-white/45">|</span>
              <span className="text-sm text-white/80">Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {!isWidgetLoading && storageUsageWidget ? (
        <div className="mt-8 animate-fade-in">
          <StorageOverviewWidget widget={storageUsageWidget} />
        </div>
      ) : null}

      {isWidgetLoading ? (
        <div className="mt-8 animate-fade-in">
          <DashboardSkeletonModules count={4} />
        </div>
      ) : moduleReportCards.length > 0 ? (
        <div className="mt-8 animate-fade-in">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
            <Grid2x2 className="h-6 w-6 text-gray-600" aria-hidden="true" />
            Laporan Modul
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {moduleReportCards.map((widget) => {
              const tone = getWidgetTone(widget);

              return (
                <DashboardModuleReportCard
                  key={widget.id}
                  widget={widget}
                  tone={tone}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {!isWidgetLoading && dashboardReportSections.length > 0 ? (
        <div className="mt-8 space-y-8 animate-fade-in">
          {dashboardReportSections.map((widget) => {
            const Section =
              widget.component_key &&
              DASHBOARD_REPORT_SECTION_RENDERERS[widget.component_key];

            return Section ? <Section key={widget.id} widget={widget} /> : null;
          })}
        </div>
      ) : null}

      {!isWidgetLoading && modalReportCards.length > 0 ? (
        <div className="mt-8 animate-fade-in">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
            <BarChart3 className="h-6 w-6 text-gray-600" aria-hidden="true" />
            Shortcut Laporan
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modalReportCards.map((widget) => (
              <DashboardReportShortcutCard
                key={widget.id}
                widget={widget}
                tone={getWidgetTone(widget)}
                onOpen={setActiveReportWidget}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!isWidgetLoading && secondaryReportCards.length > 0 ? (
        <div className="mt-8 animate-fade-in">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
            <BarChart3 className="h-6 w-6 text-gray-600" aria-hidden="true" />
            Laporan Lainnya
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondaryReportCards.map((widget) => {
              const tone = getWidgetTone(widget);

              return (
                <DashboardWidgetCard
                  key={widget.id}
                  title={widget.name}
                  href={widget.url}
                  subtitle={getWidgetSubtitle(widget)}
                  badge="Dashboard"
                  accentColor={tone.accentColor}
                  icon={tone.icon}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      <DashboardModal
        isOpen={Boolean(activeReportWidget && ActiveReportSection)}
        title={activeReportWidget?.name ?? "Laporan"}
        description={
          activeReportWidget ? getWidgetSubtitle(activeReportWidget) : undefined
        }
        onClose={() => setActiveReportWidget(null)}
        maxWidth="5xl"
        bodyClassName="bg-slate-50 p-3 sm:p-4 lg:p-5"
      >
        {activeReportWidget && ActiveReportSection ? (
          <ActiveReportSection widget={activeReportWidget} showTitle={false} />
        ) : null}
      </DashboardModal>
    </>
  );
}
