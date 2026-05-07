"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import type { ToastType } from "@/components/ui/Toast";
import {
  RBAC_DENIED_MESSAGE,
  hasDashboardCapability,
  hasDashboardFeature,
  type PermissionCapability,
  type RouteAccessDecision,
  type Role,
} from "@/lib/rbac";

export interface DenyBehavior {
  message?: string;
  toastType?: ToastType;
  redirectTo?: string | null;
}

interface UseProtectedActionResult {
  role: Role | null;
  roleId: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  hasCapability: (
    pathname: string,
    capability: PermissionCapability,
  ) => boolean;
  hasFeature: (pathname: string, feature: string) => boolean;
  ensureAllowed: (
    isAllowed: (role: Role) => boolean,
    behavior?: DenyBehavior,
  ) => boolean;
  ensureCapability: (
    pathname: string,
    capability: PermissionCapability,
    behavior?: DenyBehavior,
  ) => boolean;
  ensureFeature: (
    pathname: string,
    feature: string,
    behavior?: DenyBehavior,
  ) => boolean;
  ensureRouteAllowed: (
    decision: RouteAccessDecision,
    behavior?: DenyBehavior,
  ) => decision is RouteAccessDecision & { allowed: true };
  wrap: <Args extends unknown[]>(
    isAllowed: (role: Role) => boolean,
    action: (...args: Args) => void,
    behavior?: DenyBehavior,
  ) => (...args: Args) => void;
}

export function useProtectedAction(): UseProtectedActionResult {
  const router = useRouter();
  const { role, status, user } = useAuth();
  const { showToast } = useAppToast();
  const roleId = user?.role_id ?? null;

  const deny = useCallback(
    (behavior?: DenyBehavior) => {
      showToast(
        behavior?.message ?? RBAC_DENIED_MESSAGE,
        behavior?.toastType ?? "warning",
      );
      if (behavior?.redirectTo) router.replace(behavior.redirectTo);
    },
    [router, showToast],
  );

  const ensureAllowed = useCallback(
    (
      isAllowed: (role: Role) => boolean,
      behavior?: DenyBehavior,
    ): boolean => {
      if (status !== "authenticated" || !role) {
        deny({ ...behavior, redirectTo: "/" });
        return false;
      }

      if (isAllowed(role)) return true;
      deny(behavior);
      return false;
    },
    [deny, role, status],
  );

  const hasCapability = useCallback(
    (pathname: string, capability: PermissionCapability): boolean => {
      if (status !== "authenticated" || !role) return false;
      return hasDashboardCapability(pathname, role, roleId, capability);
    },
    [role, roleId, status],
  );

  const hasFeature = useCallback(
    (pathname: string, feature: string): boolean => {
      if (status !== "authenticated" || !role) return false;
      return hasDashboardFeature(pathname, role, roleId, feature);
    },
    [role, roleId, status],
  );

  const ensureCapability = useCallback(
    (
      pathname: string,
      capability: PermissionCapability,
      behavior?: DenyBehavior,
    ): boolean => {
      if (status !== "authenticated" || !role) {
        deny({ ...behavior, redirectTo: "/" });
        return false;
      }

      if (hasDashboardCapability(pathname, role, roleId, capability)) {
        return true;
      }

      deny(behavior);
      return false;
    },
    [deny, role, roleId, status],
  );

  const ensureFeature = useCallback(
    (pathname: string, feature: string, behavior?: DenyBehavior): boolean => {
      if (status !== "authenticated" || !role) {
        deny({ ...behavior, redirectTo: "/" });
        return false;
      }

      if (hasDashboardFeature(pathname, role, roleId, feature)) {
        return true;
      }

      deny(behavior);
      return false;
    },
    [deny, role, roleId, status],
  );

  const ensureRouteAllowed = useCallback(
    (
      decision: RouteAccessDecision,
      behavior?: DenyBehavior,
    ): decision is RouteAccessDecision & { allowed: true } => {
      if (decision.allowed) return true;
      deny(behavior);
      return false;
    },
    [deny],
  );

  const wrap = useCallback(
    <Args extends unknown[]>(
      isAllowed: (role: Role) => boolean,
      action: (...args: Args) => void,
      behavior?: DenyBehavior,
    ) => {
      return (...args: Args) => {
        if (!ensureAllowed(isAllowed, behavior)) return;
        action(...args);
      };
    },
    [ensureAllowed],
  );

  return {
    role,
    roleId,
    status,
    hasCapability,
    hasFeature,
    ensureAllowed,
    ensureCapability,
    ensureFeature,
    ensureRouteAllowed,
    wrap,
  };
}
