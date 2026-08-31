import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const componentNames = [
  "SeputarJaminanUI.tsx",
  "SeputarJaminanDashboardClient.tsx",
  "SeputarJaminanCatalogClient.tsx",
  "SeputarJaminanReviewClient.tsx",
  "SeputarJaminanProfileContactClient.tsx",
];

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Seputar Jaminan presentation contract", () => {
  it("uses the shared Ruwang presentation primitives", () => {
    const uiSource = source(
      "src/components/seputar-jaminan/SeputarJaminanUI.tsx",
    );

    expect(uiSource).toContain("FeatureHeader");
    expect(uiSource).toContain("SetupPrimaryButton");
    expect(uiSource).toContain("SetupStatusBadge");
    expect(uiSource).toContain("SETUP_PAGE_BACK_BUTTON_CLASS");
    expect(uiSource).toContain("SETUP_PAGE_PANEL_HEADER_CLASS");
    expect(uiSource).toContain("SETUP_PAGE_TABLE_CARD_CLASS");
  });

  it("does not reintroduce the former purple palette or oversized rounding", () => {
    const allSources = componentNames
      .map((name) => source(`src/components/seputar-jaminan/${name}`))
      .join("\n");

    for (const forbiddenToken of [
      "#4255ff",
      "#7c3aed",
      "#d946ef",
      "#157ec3",
      "#0d5a8f",
      "rounded-2xl",
      "rounded-xl",
    ]) {
      expect(allSources).not.toContain(forbiddenToken);
    }
  });

  it("keeps the agreed action hierarchy on the rendered module pages", () => {
    const uiSource = source(
      "src/components/seputar-jaminan/SeputarJaminanUI.tsx",
    );
    const dashboardSource = source(
      "src/components/seputar-jaminan/SeputarJaminanDashboardClient.tsx",
    );
    const catalogSource = source(
      "src/components/seputar-jaminan/SeputarJaminanCatalogClient.tsx",
    );
    const reviewSource = source(
      "src/components/seputar-jaminan/SeputarJaminanReviewClient.tsx",
    );
    const profileSource = source(
      "src/components/seputar-jaminan/SeputarJaminanProfileContactClient.tsx",
    );

    expect(uiSource).toContain("aria-busy={loading || undefined}");
    expect(uiSource).toContain("disabled={loading || disabled}");
    expect(dashboardSource).toContain("<SjSecondaryButton onClick={() => void load()} loading={loading}>");
    expect(dashboardSource).toContain('<SjSecondaryButton loading={reconciling}');
    expect(dashboardSource).toContain('className="mt-1 text-sm leading-5 text-slate-500"');
    expect(catalogSource).toContain("<SetupViewButton");
    expect(catalogSource).toContain("uiverse-modal-button--danger");
    expect(catalogSource).toContain("Arsipkan katalog");
    expect(catalogSource).toContain("Ubah");
    expect(catalogSource).not.toContain("\n                        Edit\n");
    expect(profileSource).toContain('profile?.state === "DRAFT" ? <SjSecondaryButton');
    expect(profileSource).toContain('loading={savingAction === "profile-submit"}');
    expect(profileSource).toContain("Ajukan pemeriksaan");
    expect(reviewSource).toContain("<SjSecondaryButton className=\"w-full sm:w-auto\"");
    expect(reviewSource).toContain("<SjPrimaryButton onClick={() => begin");
  });

  it("keeps the publication dashboard compact without repeated navigation cards", () => {
    const dashboardSource = source(
      "src/components/seputar-jaminan/SeputarJaminanDashboardClient.tsx",
    );

    expect(dashboardSource).toContain('title="Ringkasan publikasi"');
    expect(dashboardSource).toContain('aria-label="Pekerjaan Seputar Jaminan"');
    expect(dashboardSource).toContain("md:grid-cols-3 md:divide-x md:divide-y-0");
    expect(dashboardSource).toContain("focus-visible:ring-inset focus-visible:ring-sky-600/20");
    expect(dashboardSource).toContain('title="Belum ada publikasi"');
    expect(dashboardSource).not.toContain("SjQuickLink");
    expect(dashboardSource).not.toContain("SETUP_PAGE_PANEL_CLASS");
    expect(dashboardSource).not.toContain("motion-safe:hover:-translate");
  });

  it("uses the shared responsive Ruwang index for the publication catalog", () => {
    const catalogSource = source(
      "src/components/seputar-jaminan/SeputarJaminanCatalogClient.tsx",
    );

    expect(catalogSource).toContain("SetupDataTable");
    expect(catalogSource).toContain('variant="crud"');
    expect(catalogSource).toContain('density="compact"');
    expect(catalogSource).toContain('aria-label="Daftar publikasi Seputar Jaminan"');
    expect(catalogSource).toContain("<SetupDataTableHeaderCell>Kode</SetupDataTableHeaderCell>");
    expect(catalogSource).toContain("<SetupDataTableHeaderCell>Kategori</SetupDataTableHeaderCell>");
    expect(catalogSource).toContain("<SetupDataTableHeaderCell>Judul</SetupDataTableHeaderCell>");
    expect(catalogSource).toContain("<SetupDataTableHeaderCell>Lokasi</SetupDataTableHeaderCell>");
    expect(catalogSource).toContain("<SetupDataTableHeaderCell>Status</SetupDataTableHeaderCell>");
    expect(catalogSource).toContain('aria-label="Muat ulang daftar katalog"');
    expect(catalogSource).toContain('containerClassName="col-span-2 lg:col-span-1"');
    expect(catalogSource).toContain("<SetupDataTableEmptyRow");
    expect(catalogSource).toContain('"Katalog tidak ditemukan" : "Belum ada katalog"');
    expect(catalogSource).toContain('<SjStatusBadge state={publication.state} />');
    expect(catalogSource).toContain('<SetupViewButton disabled={actionLoading} label="Lihat detail"');
    expect(catalogSource).toContain('<Pagination page={page} lastPage={lastPage} total={total} limit={20}');
    expect(catalogSource).not.toContain('<article key={publication.id}');
  });

  it("groups the publication form with the shared Ruwang section pattern", () => {
    const catalogSource = source(
      "src/components/seputar-jaminan/SeputarJaminanCatalogClient.tsx",
    );

    expect(catalogSource).toContain('import SetupFormSection from "@/components/ui/SetupFormSection"');
    for (const sectionTitle of [
      "Sumber data",
      "Informasi publik",
      "Lokasi dan spesifikasi",
      "Kontak marketing",
      "Media publik",
    ]) {
      expect(catalogSource).toContain(`title="${sectionTitle}"`);
    }
    expect(catalogSource).toContain('id="sj-publication-source-collateral"');
    expect(catalogSource).toContain('id="sj-publication-taxonomy"');
    expect(catalogSource).toContain('id="sj-publication-title"');
    expect(catalogSource).toContain('id="sj-publication-city"');
    expect(catalogSource).toContain('id="sj-publication-whatsapp-contact"');
    expect(catalogSource).toContain('id="sj-publication-add-media"');
    expect(catalogSource).toContain('footer={<><SjSecondaryButton');
    expect(catalogSource).toContain("function validateForm(form: CatalogForm, sourceIsLocked: boolean)");
    expect(catalogSource).toContain("function toPayload(form: CatalogForm): SjPublicationDraftPayload");
  });

  it("uses the shared Ruwang upload fields and a consistent media hierarchy", () => {
    const catalogSource = source(
      "src/components/seputar-jaminan/SeputarJaminanCatalogClient.tsx",
    );
    const profileSource = source(
      "src/components/seputar-jaminan/SeputarJaminanProfileContactClient.tsx",
    );

    expect(catalogSource).toContain("MultiFileUploadField");
    expect(profileSource).toContain("FileUploadField");
    expect(catalogSource).toContain("validateSjPublicImage");
    expect(profileSource).toContain("validateSjPublicImage");
    expect(catalogSource).toContain("onValidationError={setMediaUploadError}");
    expect(profileSource).toContain("onValidationError={setLogoUploadError}");
    expect(catalogSource).toContain("SjMediaPreview");
    expect(profileSource).toContain("SjMediaPreview");
    expect(catalogSource).toContain('label="Gambar utama"');
    expect(catalogSource).toContain("Hapus dari katalog");
    expect(catalogSource).toContain("role=\"progressbar\"");
    expect(profileSource).toContain("role=\"progressbar\"");
    expect(catalogSource).not.toContain("watermark-type-button");
  });

  it("uses a normal Ruwang form section for the logo and a responsive contact index", () => {
    const profileSource = source(
      "src/components/seputar-jaminan/SeputarJaminanProfileContactClient.tsx",
    );

    expect(profileSource).toContain('import SetupFormSection from "@/components/ui/SetupFormSection"');
    expect(profileSource).toContain('title="Logo publik BPRS"');
    expect(profileSource).toContain('aria-label="Daftar kontak WhatsApp marketing"');
    expect(profileSource).toContain('variant="crud"');
    expect(profileSource).toContain('density="compact"');
    expect(profileSource).toContain("SetupDataTableEmptyRow");
    expect(profileSource).toContain("Dapat digunakan pada beberapa katalog");
    expect(profileSource).toContain("Berakhir {contact.phone_e164.slice(-4)}");
    expect(profileSource).toContain('title={editingContact ? "Perbarui kontak WhatsApp" : "Tambah kontak WhatsApp"}');
    expect(profileSource).not.toContain('<article key={contact.id}');
    expect(profileSource).not.toContain("{contact.phone_e164}</p>");
  });

  it("keeps publication detail inside DashboardModal with record rows and a simple history list", () => {
    const catalogSource = source(
      "src/components/seputar-jaminan/SeputarJaminanCatalogClient.tsx",
    );

    expect(catalogSource).toContain("DashboardModal");
    expect(catalogSource).toContain('data-ui="sj-publication-detail-records"');
    expect(catalogSource).toContain("divide-y divide-slate-200 border-y border-slate-200");
    expect(catalogSource).toContain('data-ui="sj-publication-review-history"');
    expect(catalogSource).toContain("REVIEW_ACTION_LABEL[review.action] ?? review.action");
    expect(catalogSource).toContain('dateTime={review.created_at}');
    expect(catalogSource).toContain('description?.trim() || "Belum ada deskripsi."');
    expect(catalogSource).toContain("const detailTriggerRef = useRef<HTMLElement | null>(null)");
    expect(catalogSource).toContain("if (detail || !detailTriggerRef.current) return");
    expect(catalogSource).not.toContain("grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2");
    expect(catalogSource).not.toContain("flex items-start gap-3 rounded-lg border border-slate-200 p-3");
  });

  it("keeps the review queue compact and the decision modal accessible", () => {
    const reviewSource = source(
      "src/components/seputar-jaminan/SeputarJaminanReviewClient.tsx",
    );

    expect(reviewSource).toContain('aria-label="Ringkasan antrean pemeriksaan"');
    expect(reviewSource).toContain('title="Tidak ada pengajuan yang menunggu"');
    expect(reviewSource).toContain('title={mode === "approve" ? "Setujui pengajuan?" : "Minta revisi?"}');
    expect(reviewSource).toContain('id="sj-review-revision-reason"');
    expect(reviewSource).toContain('aria-invalid={Boolean(reasonError)}');
    expect(reviewSource).toContain('role={reasonError ? "alert" : undefined}');
    expect(reviewSource).toContain("DashboardModal");
    expect(reviewSource).not.toContain("SETUP_PAGE_PANEL_CLASS");
  });

  it("keeps both sidebar contexts and the public-catalog module boundary", () => {
    const sidebarSource = source(
      "src/components/dashboard/DashboardSidebarMenu.tsx",
    );

    expect(sidebarSource).toContain('title="Ruwang Arsip"');
    expect(sidebarSource).toContain(
      'description="Arsip dan operasional internal BPRS."',
    );
    expect(sidebarSource).toContain('title="Seputar Jaminan"');
    expect(sidebarSource).toContain(
      'description="Siapkan katalog aset untuk masyarakat."',
    );
  });
});
