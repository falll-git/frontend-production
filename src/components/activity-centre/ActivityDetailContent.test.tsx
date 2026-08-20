import { render, screen } from "@testing-library/react";
import { KeyRound } from "lucide-react";
import { describe, expect, it } from "vitest";

import ActivityDetailContent from "@/components/activity-centre/ActivityDetailContent";
import type { ActivityCentreDetail } from "@/types/activity-centre.types";

function detail(
  overrides: Partial<ActivityCentreDetail> = {},
): ActivityCentreDetail {
  return {
    id: "activity-internal-id",
    actor_id: "actor-internal-id",
    actor: {
      id: "actor-internal-id",
      name: "Admin",
      username: "admin",
      email: "admin@example.test",
      role: { id: "role-id", name: "Admin" },
      division: { id: "division-id", name: "IT" },
    },
    module: "AUTH",
    module_label: "Autentikasi",
    action: "LOGIN",
    action_label: "Login",
    created_at: "2026-08-17T01:09:00.000Z",
    title: "Login Autentikasi",
    summary: null,
    result_label: "Berhasil",
    result_tone: "emerald",
    context: {
      kind: "AUTH",
      title: "Informasi Login",
      fields: [],
      changed_fields: [],
      target_path: null,
      target_label: null,
    },
    ...overrides,
  };
}

describe("ActivityDetailContent", () => {
  it("menampilkan informasi umum tanpa referensi dan istilah teknis", () => {
    render(
      <ActivityDetailContent
        actorName="Admin"
        detail={detail()}
        moduleIcon={KeyRound}
      />,
    );

    expect(screen.getByText("Login Autentikasi")).toBeInTheDocument();
    expect(screen.getByText("Berhasil")).toBeInTheDocument();
    expect(screen.getByText("Pelaku")).toBeInTheDocument();
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Peran")).toBeInTheDocument();
    expect(screen.getByText("Divisi")).toBeInTheDocument();
    expect(screen.getByText("Modul")).toBeInTheDocument();
    expect(screen.queryByText("Referensi Sistem")).not.toBeInTheDocument();
    expect(screen.queryByText("Jenis Data")).not.toBeInTheDocument();
    expect(screen.queryByText("Status Respons")).not.toBeInTheDocument();
    expect(screen.queryByText("Sumber")).not.toBeInTheDocument();
    expect(screen.queryByText("activity-internal-id")).not.toBeInTheDocument();
    expect(screen.queryByText("Informasi Login")).not.toBeInTheDocument();
  });

  it("menampilkan rincian bisnis hanya ketika ada informasi tambahan", () => {
    render(
      <ActivityDetailContent
        actorName="Admin"
        detail={detail({
          summary: "Status pengajuan telah diperbarui.",
          context: {
            kind: "WORKFLOW",
            title: "Rincian Proses",
            fields: [
              { key: "status", label: "Status Sesudah", value: "Selesai" },
            ],
            changed_fields: ["Status"],
            target_path: "/dashboard/arsip-digital/peminjaman/laporan",
            target_label: "Buka Modul Terkait",
          },
        })}
        moduleIcon={KeyRound}
      />,
    );

    expect(screen.getByText("Rincian Proses")).toBeInTheDocument();
    expect(screen.getByText("Keterangan")).toBeInTheDocument();
    expect(
      screen.getByText("Status pengajuan telah diperbarui."),
    ).toBeInTheDocument();
    expect(screen.getByText("Status Sesudah")).toBeInTheDocument();
    expect(screen.getByText("Informasi yang Diubah")).toBeInTheDocument();
  });
});
