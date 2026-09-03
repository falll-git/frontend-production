import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SjReviewPublication } from "@/types/seputar-jaminan.types";

import SeputarJaminanReviewClient from "./SeputarJaminanReviewClient";

const service = vi.hoisted(() => ({
  getReviews: vi.fn(),
  getProfile: vi.fn(),
  getContacts: vi.fn(),
  publicationCommand: vi.fn(),
  requestPublicationRevision: vi.fn(),
  profileCommand: vi.fn(),
  requestProfileRevision: vi.fn(),
  contactCommand: vi.fn(),
  requestContactRevision: vi.fn(),
}));

vi.mock("@/services/seputar-jaminan.service", () => ({
  seputarJaminanService: service,
}));

vi.mock("@/hooks/useProtectedAction", () => ({
  useProtectedAction: () => ({ ensureFeature: () => true }),
}));

vi.mock("@/components/ui/AppToastProvider", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

const pendingPublication = {
  id: "publication-review-1",
  reference_code: "SJ-REVIEW01",
  source_type: "COLLATERAL",
  source_collateral_id: "collateral-review-1",
  owner_division: { id: "division-review-1", name: "Marketing" },
  asset_category: "BUILDING",
  state: "IN_REVIEW",
  sync_state: "NOT_QUEUED",
  aggregate_version: 1,
  lock_version: 2,
  next_reconfirmation_at: null,
  last_confirmed_at: null,
  last_sync_error_code: null,
  title: "Rumah untuk pemeriksaan",
  city_regency: "Bandung",
  province: "Jawa Barat",
  cover: null,
  current_version: {
    id: "version-review-1",
    version_number: 1,
    state: "SUBMITTED",
    taxonomy_version: 1,
    subcategory: "HOUSE",
    title: "Rumah untuk pemeriksaan",
    description: "Deskripsi publik khusus pengujian disposable.",
    city_regency: "Bandung",
    province: "Jawa Barat",
    availability: "AVAILABLE",
    whatsapp_contact: {
      id: "contact-review-1",
      version_id: "contact-version-review-1",
      label: "Marketing katalog",
      phone_ending: "1234",
    },
    profile_version_id: "profile-version-review-1",
    attributes: { building_area_m2: 120 },
    media: [],
    submitted_at: "2026-08-28T00:00:00.000Z",
    approved_at: null,
    rejection_reason: null,
    created_at: "2026-08-28T00:00:00.000Z",
  },
  published_version: null,
  created_at: "2026-08-28T00:00:00.000Z",
  updated_at: "2026-08-28T00:00:00.000Z",
  review_source: {
    type: "COLLATERAL",
    collateral: {
      id: "collateral-review-1",
      collateral_number: "AGUNAN-REVIEW-1",
      collateral_type: "SHM",
      location_city_code: null,
      description: "Rumah tinggal",
      period_month: null,
    },
  },
} satisfies SjReviewPublication;

describe("Seputar Jaminan review presentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getProfile.mockResolvedValue(null);
    service.getContacts.mockResolvedValue([]);
    service.publicationCommand.mockResolvedValue(pendingPublication);
    service.requestPublicationRevision.mockResolvedValue(pendingPublication);
  });

  it("shows one clear empty state without a zero summary", async () => {
    service.getReviews.mockResolvedValue([]);

    render(<SeputarJaminanReviewClient />);

    expect(await screen.findByText("Tidak ada pengajuan yang menunggu")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ringkasan antrean pemeriksaan")).not.toBeInTheDocument();
    expect(screen.queryByText("Katalog menunggu pemeriksaan")).not.toBeInTheDocument();
    expect(screen.getByText("Semua pengajuan sudah selesai diperiksa.").parentElement?.parentElement).toHaveClass("text-slate-900");
  });

  it("keeps revision validation inline and focuses the textarea", async () => {
    service.getReviews.mockResolvedValue([pendingPublication]);

    render(<SeputarJaminanReviewClient />);

    const revisionTrigger = await screen.findByRole("button", { name: "Minta revisi" });
    fireEvent.click(revisionTrigger);
    fireEvent.click(screen.getByRole("button", { name: "Kirim catatan" }));

    const textarea = screen.getByLabelText(/Bagian yang perlu diperbaiki/);
    expect(await screen.findByRole("alert")).toHaveTextContent("sedikitnya 5 karakter");
    await waitFor(() => expect(textarea).toHaveFocus());
    expect(textarea).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(textarea, { target: { value: "Foto depan perlu diunggah ulang." } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kirim catatan" }));

    await waitFor(() => {
      expect(service.requestPublicationRevision).toHaveBeenCalledWith(
        "publication-review-1",
        2,
        "Foto depan perlu diunggah ulang.",
      );
    });
  });

  it("keeps approval as the primary workflow action", async () => {
    service.getReviews.mockResolvedValue([pendingPublication]);

    render(<SeputarJaminanReviewClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Setujui & tayangkan" }));
    expect(screen.getByText("Setujui pengajuan?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ya, setujui" }));

    await waitFor(() => {
      expect(service.publicationCommand).toHaveBeenCalledWith(
        "publication-review-1",
        "approve-and-publish",
        2,
      );
    });
  });

});
