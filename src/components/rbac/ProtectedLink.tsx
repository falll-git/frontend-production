"use client";

import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import {
  RBAC_DENIED_MESSAGE,
  getRoleLabel,
  getDashboardRouteDecision,
  type RouteAccessDecision,
  type Role,
} from "@/lib/rbac";

function stripQuery(href: string): string {
  const idx = href.indexOf("?");
  if (idx === -1) return href;
  return href.slice(0, idx);
}

function getDeniedTooltip(
  decision: RouteAccessDecision,
  role: Role | null,
): string {
  const roleLabel = role ? getRoleLabel(role) : "Belum login";
  switch (decision.reason) {
    case "AUTH_REQUIRED":
      return "Silakan login terlebih dahulu.";
    case "ROLE_REQUIRED": {
      const allowedRoles =
        decision.allowedRoles?.map((allowedRole) => getRoleLabel(allowedRole)) ??
        [];
      if (allowedRoles.length === 0) {
        return `Akses ditolak untuk role ${roleLabel}.`;
      }

      return `${decision.label ?? "Fitur ini"} hanya dapat diakses oleh ${allowedRoles.join(", ")}. (Role Anda: ${roleLabel})`;
    }
    case "UNKNOWN_ROUTE_DENIED":
      return `Tidak ada akses untuk route ini. (Role Anda: ${roleLabel})`;
    case "ALLOWED":
    default:
      return "";
  }
}

export interface ProtectedLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  title?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  toastMessage?: string;
}

export default function ProtectedLink({
  href,
  className,
  children,
  title,
  style,
  onClick,
  toastMessage,
}: ProtectedLinkProps) {
  const { role, status, user } = useAuth();
  const roleId = status === "authenticated" ? user?.role_id ?? null : null;
  const { showToast } = useAppToast();

  const shouldCheck = href.startsWith("/dashboard");
  const decision = shouldCheck
    ? getDashboardRouteDecision(
        stripQuery(href),
        status === "authenticated" ? role : null,
        roleId,
      )
    : ({ allowed: true, reason: "ALLOWED" } as const);

  const isDenied = shouldCheck && !decision.allowed;
  const tooltip = isDenied ? getDeniedTooltip(decision, role) : title;

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (isDenied) {
      e.preventDefault();
      e.stopPropagation();
      showToast(toastMessage ?? RBAC_DENIED_MESSAGE, "warning");
      return;
    }

    onClick?.(e);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`${className ?? ""}${isDenied ? " rbac-disabled" : ""}`}
      aria-disabled={isDenied}
      title={tooltip}
      style={style}
    >
      {children}
    </Link>
  );
}
