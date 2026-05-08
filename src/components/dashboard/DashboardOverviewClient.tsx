"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  FolderArchive,
  Grid2x2,
  Mail,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import ProtectedLink from "@/components/rbac/ProtectedLink";
import { getDashboardRouteDecision, getRoleLabel } from "@/lib/rbac";

type ModuleCard = {
  title: string;
  href: string;
  accentColor: string;
  icon: ReactNode;
  subtitle?: string;
  buttonText?: string;
};

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

function DashboardPremiumCard({
  title,
  icon,
  href,
  badge,
  subtitle,
  className = "",
  accentColor = "#157ec3",
  buttonText = "Akses Modul",
}: {
  title: string;
  icon: ReactNode;
  href: string;
  badge?: string;
  subtitle?: string;
  className?: string;
  accentColor?: string;
  buttonText?: string;
}) {
  const accentRgb = hexToRgb(accentColor) ?? "21, 126, 195";
  const cardStyle = {
    "--card-accent": accentColor,
    "--card-accent-rgb": accentRgb,
  } as CSSProperties;
  const cardClassName = `uiverse-card ${className}`.trim();
  const content = (
    <>
      <div className="uiverse-card-shine" aria-hidden="true" />
      <div className="uiverse-card-glow" aria-hidden="true" />
      <div className="uiverse-card-content">
        {badge ? <div className="uiverse-card-badge">{badge}</div> : null}
        <div className="uiverse-card-image">
          <div className="text-white">{icon}</div>
        </div>
        <div className="uiverse-card-text">
          <p className="uiverse-card-title">{title}</p>
          {subtitle ? (
            <p className="uiverse-card-description">{subtitle}</p>
          ) : null}
        </div>
        <div className="uiverse-card-footer">
          <div className="uiverse-card-price">{buttonText}</div>
          <div className="uiverse-card-button">
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <ProtectedLink
      href={href}
      className={cardClassName}
      style={cardStyle}
      title={title}
    >
      {content}
    </ProtectedLink>
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
        <div key={index} className="skeleton-card">
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

export default function DashboardOverviewClient() {
  const { user, role, status } = useAuth();
  const [isLoading] = useState(false);

  const moduleCards = useMemo<ModuleCard[]>(() => {
    const list: ModuleCard[] = [
      {
        title: "Laporan Arsip Digital",
        href: "/dashboard/arsip-digital/laporan",
        accentColor: "#157ec3",
        subtitle: "Dokumen dan penyimpanan",
        buttonText: "Akses Laporan",
        icon: <FolderArchive className="w-8 h-8" aria-hidden="true" />,
      },
      {
        title: "Laporan Persuratan",
        href: "/dashboard/manajemen-surat/laporan",
        accentColor: "#7c3aed",
        subtitle: "Surat dan memorandum",
        buttonText: "Akses Laporan",
        icon: <Mail className="w-8 h-8" aria-hidden="true" />,
      },
    ];

    if (status !== "authenticated" || !role) return [];

    return list.filter((card) =>
      getDashboardRouteDecision(card.href, role, user?.role_id).allowed,
    );
  }, [role, status, user?.role_id]);

  if (isLoading) {
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

      {moduleCards.length > 0 ? (
        <div className="mt-8 animate-fade-in">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800">
            <Grid2x2 className="h-6 w-6 text-gray-600" aria-hidden="true" />
            Laporan Modul
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {moduleCards.map((card) => (
              <DashboardPremiumCard
                key={card.href}
                title={card.title}
                href={card.href}
                accentColor={card.accentColor}
                icon={card.icon}
                subtitle={card.subtitle}
                buttonText={card.buttonText}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
