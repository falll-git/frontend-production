"use client";

import type { ComponentType } from "react";
import * as Lucide from "lucide-react";

function iconClassToKebab(iconClass: string | undefined): string | null {
  if (!iconClass?.trim()) return null;
  const tokens = iconClass.trim().split(/\s+/);
  const token =
    tokens.find((t) => t.startsWith("lucide-") && t !== "lucide") ?? null;
  if (!token) return null;
  return token.replace(/^lucide-/, "");
}

function kebabToPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((s) => s.slice(0, 1).toUpperCase() + s.slice(1))
    .join("");
}

export function MenuLucideIcon({
  icon,
  className,
}: {
  icon?: string;
  className?: string;
}) {
  const kebab = iconClassToKebab(icon) ?? "layout-dashboard";
  const pascal = kebabToPascalCase(kebab);
  const icons = Lucide as unknown as Record<
    string,
    ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }> | undefined
  >;
  const Cmp = icons[pascal] ?? Lucide.LayoutDashboard;
  return <Cmp className={className} aria-hidden />;
}
