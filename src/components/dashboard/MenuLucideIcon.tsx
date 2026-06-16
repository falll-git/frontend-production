"use client";

import { LayoutDashboard } from "lucide-react";
import { DynamicIcon, dynamicIconImports, type IconName } from "lucide-react/dynamic";

function iconClassToKebab(iconClass: string | undefined): string | null {
  if (!iconClass?.trim()) return null;
  const tokens = iconClass.trim().split(/\s+/);
  const token =
    tokens.find((item) => item.startsWith("lucide-") && item !== "lucide") ?? null;
  if (!token) return null;
  return token.replace(/^lucide-/, "");
}

function resolveIconName(iconClass: string | undefined): IconName | null {
  const kebab = iconClassToKebab(iconClass);
  if (!kebab) return null;
  return kebab in dynamicIconImports ? (kebab as IconName) : null;
}

export function MenuLucideIcon({
  icon,
  className,
}: {
  icon?: string;
  className?: string;
}) {
  const iconName = resolveIconName(icon);

  if (!iconName) {
    return <LayoutDashboard className={className} aria-hidden />;
  }

  return <DynamicIcon name={iconName} className={className} aria-hidden />;
}
