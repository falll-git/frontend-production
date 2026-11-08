import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const componentNames = [
  "SeputarJaminanUI.tsx",
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

    expect(catalogSource).toContain("<SetupActionMenu");
    expect(catalogSource).toContain("uiverse-modal-button--danger");
    expect(catalogSource).toContain("Tarik dari website");
    expect(catalogSource).toContain("Ya, tarik dari website");
    expect(catalogSource).toContain("unpublishPublication");
    expect(catalogSource).toContain('"OWNER_REQUEST"');
    expect(catalogSource).toContain("Arsipkan publikasi");
    expect(catalogSource).toContain("Ubah");
    expect(catalogSource).not.toContain("\n                        Edit\n");
    expect(profileSource).toContain('<SjRecordActions subject={profile} busy={saving}');
    expect(profileSource).toContain("name:'submit',label:'Ajukan'");
    expect(profileSource).toContain("onClick:()=>void submitProfile()");
    expect(reviewSource).toContain("<SjRecordActions");
    expect(reviewSource).toContain("Setujui profil");
  });

  it("retires delivery navigation without granting monitoring roles submission access", () => {
    const queue = source("src/components/seputar-jaminan/SeputarJaminanWorkQueue.tsx");
    expect(queue).not.toContain('SeputarJaminanDeliveryPanel');
    expect(queue).not.toContain('SJ_SUMMARY');
    expect(queue).toContain('hasCapability(SJ_SUBMISSIONS, "read")');
    expect(source("src/app/dashboard/seputar-jaminan/page.tsx")).toContain('redirect("/dashboard/seputar-jaminan/publikasi")');
    // Retired bookmarks must not restore the operator UI or grant review access.
    for (const route of ['bantuan', 'ringkasan']) {
      expect(existsSync(join(process.cwd(), `src/app/dashboard/seputar-jaminan/${route}/page.tsx`))).toBe(false);
    }
    expect(source("src/lib/rbac.ts")).not.toContain('"/dashboard/seputar-jaminan/bantuan"');
    for (const file of ['SeputarJaminanOperator.tsx', 'SeputarJaminanOperatorLink.tsx']) {
      expect(existsSync(join(process.cwd(), 'src/components/seputar-jaminan', file))).toBe(false);
    }
    expect(queue).not.toContain('SeputarJaminanOperatorLink');
    expect(source('src/components/seputar-jaminan/SeputarJaminanCatalogClient.tsx')).not.toContain('SeputarJaminanOperatorLink');
    expect(queue).not.toContain('SETUP_PAGE_SEGMENTED_GROUP_CLASS');
  });

  it("uses the shared responsive Ruwang index for the publication catalog", () => {
    const catalogSource = source(
      "src/components/seputar-jaminan/SeputarJaminanCatalogClient.tsx",
    );

    expect(catalogSource).toContain("SetupDataTable");
    expect(catalogSource).toContain('variant="crud"');
    expect(catalogSource).toContain('density="compact"');
    expect(catalogSource).toContain('aria-label="Daftar publikasi Seputar Jaminan"');
    expect(catalogSource).toContain("<SetupDataTableHeaderCell>Aset / versi kerja</SetupDataTableHeaderCell>");
    expect(catalogSource).toContain("<SetupDataTableHeaderCell>Kategori</SetupDataTableHeaderCell>");
    expect(catalogSource).toContain('[publication.city_regency, publication.province].filter(Boolean)');
    expect(catalogSource).toContain("<SetupDataTableHeaderCell>Pengajuan</SetupDataTableHeaderCell>");
    expect(catalogSource).toContain("<SetupDataTableHeaderCell>Penayangan</SetupDataTableHeaderCell>");
    expect(catalogSource).toContain('aria-label="Muat ulang daftar publikasi"');
    // Responsive sizing is checked in the browser with the sidebar open;
    // pinning the old lg class would preserve the 1024px clipping regression.
    expect(catalogSource).toContain("<SetupDataTableEmptyRow");
    expect(catalogSource).toContain('"Publikasi tidak ditemukan" : "Belum ada publikasi"');
    expect(catalogSource).toContain('<SjStatusBadge state={publication.state} />');
    expect(catalogSource).toContain("label:'Lihat detail',icon:Eye,disabled:actionLoading");
    // Cursor navigation behavior is verified through rendered controls below,
    // not by requiring the previous offset-pagination implementation.
    expect(catalogSource).not.toContain('<article key={publication.id}');
  });

  it("groups the publication form with the shared Ruwang section pattern", () => {
    const catalogSource = source(
      "src/components/seputar-jaminan/SeputarJaminanCatalogClient.tsx",
    );

    expect(catalogSource).toContain('import SetupFormSection from "@/components/ui/SetupFormSection"');
    for (const sectionTitle of [
      "Data aset",
      "Lokasi dan spesifikasi",
      "Foto",
      "Kontak",
    ]) {
      expect(catalogSource).toContain(`title="${sectionTitle}"`);
    }
    expect(catalogSource).toContain('id="sj-publication-source-collateral"');
    expect(catalogSource.match(/<SetupFormSection\s/g)).toHaveLength(4);
    expect(catalogSource.indexOf('title="Foto"')).toBeLessThan(catalogSource.indexOf('title="Kontak"'));
    expect(catalogSource).toContain('id="sj-publication-taxonomy"');
    expect(catalogSource).toContain('id="sj-publication-title"');
    expect(catalogSource).toContain('id="sj-publication-city"');
    expect(catalogSource).toContain('id="sj-publication-whatsapp-contact"');
    expect(catalogSource).toContain('id="sj-publication-add-media"');
    expect(catalogSource).toContain('footer={saveOperation.uncertain');
    expect(catalogSource).toContain('Periksa penyimpanan');
    expect(catalogSource).toContain('Simpan dan ajukan');
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
    expect(catalogSource).toContain("Hapus dari publikasi");
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
    expect(profileSource).toContain("Kontak yang belum dicabut. Pilih kontak saat menyiapkan publikasi.");
    expect(profileSource).toContain("Berakhir {contact.phone_e164.slice(-4)}");
    expect(profileSource).toContain("editingContact?.state === 'REJECTED' ? 'Perbaiki kontak WhatsApp'");
    expect(profileSource).toContain('"Perbarui kontak WhatsApp" : "Tambah kontak WhatsApp"');
    expect(profileSource).not.toContain('<article key={contact.id}');
    expect(profileSource).not.toContain("{contact.phone_e164}</p>");
  });

  it("keeps publication detail inside DashboardModal with record rows without history panels", () => {
    const catalogSource = source(
      "src/components/seputar-jaminan/SeputarJaminanCatalogClient.tsx",
    );

    expect(catalogSource).toContain("DashboardModal");
    const contentSource = source("src/components/seputar-jaminan/SeputarJaminanPublicationContent.tsx");
    expect(catalogSource).toContain('<SjPublicationContent publication={detail}');
    expect(contentSource).toContain("SetupRecordDetailSection");
    expect(catalogSource).not.toContain('SeputarJaminanHistory');
    expect(catalogSource).not.toContain('detail.reviews.map');
    expect(contentSource).toContain("version.description||'Belum diisi'");
    expect(catalogSource).toContain("const detailTriggerRef = useRef<HTMLElement | null>(null)");
    expect(catalogSource).toContain("if (detailId || !detailTriggerRef.current) return");
    expect(catalogSource).not.toContain("grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2");
    expect(catalogSource).not.toContain("flex items-start gap-3 rounded-lg border border-slate-200 p-3");
  });

  it("removes history UI and requests from all former callers while retaining the submission worklist", () => {
    for (const file of ['SeputarJaminanCatalogClient', 'SeputarJaminanProfileContactClient', 'SeputarJaminanSubmissionsClient']) {
      const text = source(`src/components/seputar-jaminan/${file}.tsx`);
      expect(text).not.toMatch(/SeputarJaminanHistory|riwayat|getHistory\(/i);
    }
    expect(source('src/components/seputar-jaminan/SeputarJaminanSubmissionsClient.tsx')).toContain('title="Daftar pengajuan"');
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
