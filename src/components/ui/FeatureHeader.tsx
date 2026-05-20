"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SETUP_PAGE_BACK_BUTTON_CLASS } from "@/components/ui/setupPageStyles";

function shouldShowDashboardBack(pathname: string | null) {
  return (
    pathname?.startsWith("/dashboard/arsip-digital") ||
    pathname?.startsWith("/dashboard/manajemen-surat")
  );
}

export default function FeatureHeader({
  title,
  subtitle,
  icon,
  actions,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <>
      {shouldShowDashboardBack(pathname) ? (
        <div className="mb-4">
          <Link href="/dashboard" className={SETUP_PAGE_BACK_BUTTON_CLASS}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>
      ) : null}

      <div className={`page-header ${className}`.trim()}>
        <div className="page-header__inner">
          <div className="page-header__left">
            <div className="page-header__icon" aria-hidden="true">
              {icon}
            </div>
            <div className="page-header__text">
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="page-header__actions">{actions}</div> : null}
        </div>
      </div>
    </>
  );
}
