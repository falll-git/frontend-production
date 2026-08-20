import { render, screen } from "@testing-library/react";
import { AlertTriangle } from "lucide-react";
import { describe, expect, it } from "vitest";

import SetupStatusBadge, {
  formatSetupStatusLabel,
  shouldShowSetupStatusIcon,
} from "@/components/ui/SetupStatusBadge";

function renderBadge(status: string) {
  const result = render(<SetupStatusBadge status={status} />);
  const badge = result.container.firstElementChild;

  if (!(badge instanceof HTMLElement)) {
    throw new Error("Badge status tidak dirender.");
  }

  return { ...result, badge };
}

describe("SetupStatusBadge", () => {
  it.each([
    ["ACTIVE", "Aktif", "bg-emerald-50"],
    ["INACTIVE", "Nonaktif", "bg-gray-50"],
    ["IN_PROGRESS", "Dalam Proses", "bg-violet-50"],
    ["in_progress", "Dalam Proses", "bg-violet-50"],
    ["PENDING", "Menunggu", "bg-blue-50"],
    ["COMPLETED", "Selesai", "bg-emerald-50"],
    ["Fasilitas aktif", "Fasilitas aktif", "bg-emerald-50"],
    ["CANCELLED", "Dibatalkan", "bg-gray-50"],
    ["REJECTED", "Ditolak", "bg-red-50"],
    ["YA", "Ya", "bg-emerald-50"],
    ["ADA", "Ada", "bg-emerald-50"],
    ["BELUM_ADA", "Belum Ada", "bg-gray-50"],
    ["MENUNGGU_REVIEW", "Menunggu Review", "bg-gray-50"],
  ])(
    "menampilkan status rutin %s tanpa ikon",
    (status, expectedLabel, expectedToneClass) => {
      const { badge } = renderBadge(status);

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      expect(badge).toHaveClass(expectedToneClass);
      expect(badge).toHaveAttribute("data-status-priority", "routine");
      expect(badge).toHaveAttribute("data-status-icon", "hidden");
      expect(badge.querySelector("svg")).not.toBeInTheDocument();
    },
  );

  it.each([
    ["DUE_SOON", "Segera Berakhir", "bg-amber-50"],
    ["EXPIRED", "Expired", "bg-red-50"],
    ["Sudah Berakhir", "Sudah Berakhir", "bg-red-50"],
    ["FAILED", "Gagal", "bg-red-50"],
    ["LEWAT_TENGGAT", "Lewat Tenggat", "bg-red-50"],
    ["LEWAT_TEMPO", "Lewat Tempo", "bg-red-50"],
    ["UNSUPPORTED", "Belum Didukung", "bg-amber-50"],
    ["AKURASI_RENDAH", "Akurasi Rendah", "bg-red-50"],
    ["ACTION_REQUIRED", "Perlu Tindakan", "bg-amber-50"],
    ["COMPLETED_WITH_ERRORS", "Selesai dengan Error", "bg-red-50"],
    ["Mendekati Limit", "Mendekati Limit", "bg-amber-50"],
    [
      "Melewati Kuota / Argo berjalan",
      "Melewati Kuota / Argo berjalan",
      "bg-red-50",
    ],
  ])(
    "mempertahankan ikon untuk status perhatian %s",
    (status, expectedLabel, expectedToneClass) => {
      const { badge } = renderBadge(status);

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      expect(badge).toHaveClass(expectedToneClass);
      expect(badge).toHaveAttribute("data-status-priority", "attention");
      expect(badge).toHaveAttribute("data-status-icon", "visible");
      expect(badge.querySelector("svg")).toBeInTheDocument();
    },
  );

  it("memisahkan arti status dari warna badge", () => {
    const { container } = render(
      <SetupStatusBadge status="Aktif" tone="red" />,
    );
    const badge = container.firstElementChild;
    if (!(badge instanceof HTMLElement)) {
      throw new Error("Badge status tidak ditemukan.");
    }

    expect(badge).toHaveClass("bg-red-50");
    expect(badge.querySelector("svg")).not.toBeInTheDocument();
  });

  it("mendukung label kontekstual tanpa mengubah prioritas status", () => {
    const { container } = render(
      <SetupStatusBadge status="Bermasalah" label="Ya" tone="red" />,
    );
    const badge = container.firstElementChild;

    expect(screen.getByText("Ya")).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-status-priority", "attention");
    expect(badge).toHaveAttribute("data-status-icon", "visible");
    expect(badge?.querySelector("svg")).toBeInTheDocument();
  });

  it("menghormati override ikon eksplisit", () => {
    const routine = render(
      <SetupStatusBadge status="Aktif" showIcon icon={AlertTriangle} />,
    ).container.firstElementChild;
    expect(routine?.querySelector("svg")).toBeInTheDocument();
    expect(routine).toHaveAttribute("data-status-priority", "routine");
    expect(routine).toHaveAttribute("data-status-icon", "visible");

    const warning = render(
      <SetupStatusBadge status="Gagal" showIcon={false} />,
    ).container.firstElementChild;
    expect(warning?.querySelector("svg")).not.toBeInTheDocument();
    expect(warning).toHaveAttribute("data-status-priority", "attention");
    expect(warning).toHaveAttribute("data-status-icon", "hidden");
  });

  it("menentukan label dan prioritas secara deterministik", () => {
    expect(formatSetupStatusLabel("IN_PROGRESS")).toBe("Dalam Proses");
    expect(formatSetupStatusLabel("waiting_review")).toBe("Waiting Review");
    expect(formatSetupStatusLabel("MENUNGGU_REVIEW")).toBe("Menunggu Review");
    expect(formatSetupStatusLabel("PAUSED")).toBe("Paused");
    expect(shouldShowSetupStatusIcon("Dalam Proses")).toBe(false);
    expect(shouldShowSetupStatusIcon("Selesai dengan Error")).toBe(true);
  });
});
