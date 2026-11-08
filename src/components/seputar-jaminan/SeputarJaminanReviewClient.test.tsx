import { findRowAction } from './rowAction.test-helper';
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SjReviewPublication } from "@/types/seputar-jaminan.types";

import SeputarJaminanReviewClient from "./SeputarJaminanReviewClient";

const service = vi.hoisted(() => ({
  getReviews: vi.fn(),
  getProfile: vi.fn(),
  getContacts: vi.fn(),
  getSettings: vi.fn(),
  publicationCommand: vi.fn(),
  requestPublicationRevision: vi.fn(),
  profileCommand: vi.fn(),
  requestProfileRevision: vi.fn(),
  contactCommand: vi.fn(),
  requestContactRevision: vi.fn(),
}));
const access = vi.hoisted(()=>({hasCapability:vi.fn(()=>true)}));

vi.mock("@/services/seputar-jaminan.service", () => ({
  seputarJaminanService: {...service,
    getReviewPage:async()=>({items:await service.getReviews(),page_info:{next_cursor:null}}),
    getContactPage:async()=>({items:await service.getContacts(),page_info:{next_cursor:null}}),
  },
}));

vi.mock("@/hooks/useProtectedAction", () => ({
  useProtectedAction: () => ({ ensureFeature: () => true, hasCapability: access.hasCapability }),
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
  action_availability:{scope:'START_ACTION',expected_version:2,revalidated_on_submit:true,actions:{
    request_revision:{available:true,reason:null,reason_code:null,mode:'DIRECT'},
    approve:{available:true,reason:null,reason_code:null,mode:'DIRECT'},
  }},
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
    access.hasCapability.mockReturnValue(true);
    vi.clearAllMocks();
    service.getProfile.mockResolvedValue(null);
    service.getContacts.mockResolvedValue([]);
    service.getSettings.mockResolvedValue({ review_authority: "local" });
    service.publicationCommand.mockResolvedValue(pendingPublication);
    service.requestPublicationRevision.mockResolvedValue(pendingPublication);
  });

  it("shows one clear empty state without a zero summary", async () => {
    service.getReviews.mockResolvedValue([]);

    render(<SeputarJaminanReviewClient />);

    expect(await screen.findByText("Tidak ada pengajuan yang menunggu")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ringkasan antrean pemeriksaan")).not.toBeInTheDocument();
    expect(screen.queryByText("Katalog menunggu pemeriksaan")).not.toBeInTheDocument();
    expect(screen.getByText("Tidak ada pengajuan yang menunggu dalam daftar ini.").parentElement?.parentElement).toHaveClass("text-slate-900");
  });

  it("keeps revision validation inline and focuses the textarea", async () => {
    service.getReviews.mockResolvedValue([pendingPublication]);

    render(<SeputarJaminanReviewClient />);

    const revisionTrigger = await findRowAction('Minta perbaikan');
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

  it("opens the primary approval action and retains explicit confirmation", async () => {
    service.getReviews.mockResolvedValue([pendingPublication]);

    render(<SeputarJaminanReviewClient />);

    fireEvent.click(await screen.findByRole('button',{name:'Setujui & kirim'}));
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

  it('keeps the full long identity in the decision content without treating dismissal as a decision', async () => {
    const name = 'IdentitasPengajuanPanjang'.repeat(6);
    service.getReviews.mockResolvedValue([{ ...pendingPublication, title: name, current_version: { ...pendingPublication.current_version, title: name } }]);
    render(<SeputarJaminanReviewClient />);
    fireEvent.click(await screen.findByRole('button',{name:'Setujui & kirim'}));
    const dialog = screen.getByRole('dialog', { name: 'Setujui pengajuan?' });
    expect(dialog).toHaveTextContent(name);
    expect(dialog).toHaveTextContent('Pengajuan yang diperiksa');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(service.publicationCommand).not.toHaveBeenCalled();
  });

  it("keeps a centrally reviewed bank read-only", async () => {
    service.getReviews.mockResolvedValue([pendingPublication]);
    service.getSettings.mockResolvedValue({ review_authority: "central" });

    render(<SeputarJaminanReviewClient />);

    expect(await screen.findByText("Pemeriksaan dilakukan melalui Ruwang Control")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Aksi pemeriksaan / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Minta revisi" })).not.toBeInTheDocument();
  });
  it('blocks maker approval based on the server even when the local permission hook allows it',async()=>{
    service.getReviews.mockResolvedValue([{...pendingPublication,action_availability:{...pendingPublication.action_availability,actions:{
      ...pendingPublication.action_availability.actions,
      approve:{available:false,reason:'Minta rekan yang tidak membuat pengajuan untuk memeriksanya.',reason_code:'MAKER_CHECKER',mode:'DIRECT'},
    }}}]);
    render(<SeputarJaminanReviewClient/>);
    const approve=await screen.findByRole('button',{name:'Setujui & kirim'});
    expect(approve).toBeDisabled();
    expect(approve).toHaveAccessibleDescription('Minta rekan yang tidak membuat pengajuan untuk memeriksanya.');
    fireEvent.click(approve);
    expect(service.publicationCommand).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("does not call profile/contact endpoints without their read permissions",async()=>{
    access.hasCapability.mockReturnValue(false);
    service.getReviews.mockResolvedValue([]);
    render(<SeputarJaminanReviewClient/>);
    await screen.findByText("Tidak ada pengajuan yang menunggu");
    expect(service.getProfile).not.toHaveBeenCalled();
    expect(service.getContacts).not.toHaveBeenCalled();
    expect(screen.getByText("Daftar mengikuti izin akses Anda")).toBeInTheDocument();
  });

});
