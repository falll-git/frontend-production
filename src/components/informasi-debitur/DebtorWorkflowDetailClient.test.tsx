import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DetailTabNav,
  IdebCreditPositionTable,
  SummaryTab,
  type TabConfig,
  type TabType,
} from "@/components/informasi-debitur/DebtorWorkflowDetailClient";
import type { IdebFacilityFilter } from "@/lib/ideb-facility-filter";
import type { DebtorWorkflow } from "@/types/debitur.types";

const creatorId = "11111111-2222-4333-8444-555555555555";
const detailTabs: TabConfig[] = [
  { id: "info", label: "Data Utama" },
  { id: "audit", label: "Audit Log" },
  { id: "ideb", label: "Hasil IDEB" },
];

const allDetailTabs: TabConfig[] = [
  { id: "info", label: "Data Utama" },
  { id: "summary", label: "Laporan Summary" },
  { id: "audit", label: "Audit Log" },
  { id: "ideb", label: "Hasil IDEB" },
  { id: "historis", label: "Historis Kol" },
  { id: "dokumen", label: "Dokumen" },
  { id: "agunan", label: "Agunan" },
  { id: "notaris", label: "Notaris & KJPP" },
  { id: "sp", label: "Surat Peringatan" },
  { id: "claim", label: "Asuransi & Klaim" },
  { id: "titipan", label: "Dana Titipan" },
];

function DetailTabNavHarness({ tabs = detailTabs }: { tabs?: TabConfig[] }) {
  const [activeTab, setActiveTab] = useState<TabType>("info");
  return (
    <>
      <DetailTabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      <div
        id="debtor-detail-panel"
        role="tabpanel"
        aria-labelledby={`debtor-detail-tab-${activeTab}`}
      >
        {activeTab}
      </div>
    </>
  );
}

const idebFacilities = Array.from({ length: 21 }, (_, index) => ({
  reporter_name: `Pelapor Pagination ${String(index + 1).padStart(2, "0")}`,
  account_number: `PAG-${String(index + 1).padStart(2, "0")}`,
  credit_type: "Pembiayaan",
  condition_code: "00",
  collectibility: "1",
  days_past_due: 0,
  plafond: 1_000_000,
  outstanding: 500_000,
}));

function IdebPaginationHarness() {
  const [filter, setFilter] = useState<IdebFacilityFilter>("ALL");
  return (
    <IdebCreditPositionTable
      facilities={idebFacilities}
      facilityFilter={filter}
      onFacilityFilterChange={setFilter}
    />
  );
}

function buildWorkflow(): DebtorWorkflow {
  return {
    marketing: {
      timeline: {
        dates: ["2026-08-09"],
        rows: [
          {
            id: "action-plan",
            label: "Action Plan",
            description: "Rencana tindak lanjut",
          },
          {
            id: "hasil-kunjungan",
            label: "Hasil Kunjungan",
            description: "Ringkasan hasil lapangan",
          },
          {
            id: "langkah-penanganan",
            label: "Langkah Penanganan",
            description: "Eksekusi penanganan",
          },
        ],
        entries: [
          {
            id: "activity-1",
            row_id: "action-plan",
            timeline_group_id: null,
            date: "2026-08-09",
            target_date: "2026-08-12",
            title: "Action Plan Pertama",
            summary: "Hubungi nasabah",
            detail: "Konfirmasi jadwal tindak lanjut.",
            status: "IN_PROGRESS",
            created_by: creatorId,
            creator: {
              id: creatorId,
              name: "Siti Marketing",
              username: "siti.marketing",
            },
            contract: {
              id: "contract-1",
              no_kontrak: "KTR-001",
            },
            activity_type: null,
            visit_address: null,
            visit_latitude: null,
            visit_longitude: null,
            visit_accuracy_m: null,
            file: null,
            files: [],
          },
          {
            id: "activity-2",
            row_id: "action-plan",
            timeline_group_id: null,
            date: "2026-08-09",
            target_date: null,
            title: "Action Plan Kedua",
            summary: "Siapkan surat tindak lanjut",
            detail: "Dokumen disiapkan oleh marketing.",
            status: "PENDING",
            created_by: creatorId,
            creator: {
              id: creatorId,
              name: "Siti Marketing",
              username: "siti.marketing",
            },
            contract: null,
            activity_type: null,
            visit_address: null,
            visit_latitude: null,
            visit_longitude: null,
            visit_accuracy_m: null,
            file: null,
            files: [],
          },
        ],
      },
    },
  } as unknown as DebtorWorkflow;
}

describe("SummaryTab timeline aktivitas marketing", () => {
  it("menyediakan layout responsif dan mempertahankan semua aktivitas dalam satu sel", () => {
    render(<SummaryTab workflow={buildWorkflow()} onOpenFile={vi.fn()} />);

    const compactTimeline = screen.getByTestId("marketing-timeline-compact");
    const matrixTimeline = screen.getByTestId("marketing-timeline-matrix");

    expect(compactTimeline).toHaveClass("lg:hidden");
    expect(matrixTimeline).toHaveClass("hidden", "lg:block");
    expect(
      within(matrixTimeline).getByRole("button", {
        name: "Buka detail Action Plan: Hubungi nasabah",
      }),
    ).toBeInTheDocument();
    expect(
      within(matrixTimeline).getByRole("button", {
        name: "Buka detail Action Plan: Siapkan surat tindak lanjut",
      }),
    ).toBeInTheDocument();
  });

  it("membuka modal dengan satu klik, menyamarkan UUID, dan mengembalikan fokus", async () => {
    const user = userEvent.setup();
    render(<SummaryTab workflow={buildWorkflow()} onOpenFile={vi.fn()} />);

    const compactTimeline = screen.getByTestId("marketing-timeline-compact");
    const trigger = within(compactTimeline).getByRole("button", {
      name: "Buka detail Action Plan: Hubungi nasabah",
    });

    trigger.focus();
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Action Plan Pertama",
    });
    expect(within(dialog).getByText("Dalam Proses")).toBeInTheDocument();
    expect(within(dialog).getByText("Siti Marketing")).toBeInTheDocument();
    expect(within(dialog).queryByText(creatorId)).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("DetailTabNav", () => {
  it("menggunakan semantik tab dan mendukung navigasi panah", async () => {
    const user = userEvent.setup();
    render(<DetailTabNavHarness />);

    const tabList = screen.getByRole("tablist", {
      name: "Bagian detail debitur",
    });
    const dataTab = within(tabList).getByRole("tab", { name: "Data Utama" });
    const auditTab = within(tabList).getByRole("tab", { name: "Audit Log" });

    expect(dataTab).toHaveAttribute("aria-selected", "true");
    expect(dataTab).toHaveAttribute("tabindex", "0");
    expect(dataTab).toHaveAttribute("aria-controls", "debtor-detail-panel");
    expect(document.getElementById("debtor-detail-panel")).toBeInTheDocument();
    expect(auditTab).toHaveAttribute("tabindex", "-1");

    dataTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(auditTab).toHaveFocus();
    expect(auditTab).toHaveAttribute("aria-selected", "true");
    expect(auditTab).toHaveAttribute("aria-controls", "debtor-detail-panel");
    expect(document.getElementById("debtor-detail-panel")).toHaveAttribute(
      "aria-labelledby",
      "debtor-detail-tab-audit",
    );
    expect(dataTab).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{End}");
    expect(
      within(tabList).getByRole("tab", { name: "Hasil IDEB" }),
    ).toHaveFocus();
  });

  it("memberi petunjuk overflow dan menjaga fokus 11 tab tetap terlihat", async () => {
    const user = userEvent.setup();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(<DetailTabNavHarness tabs={allDetailTabs} />);
      const tabList = screen.getByTestId("debtor-detail-tablist");
      Object.defineProperties(tabList, {
        clientWidth: { configurable: true, value: 354 },
        scrollWidth: { configurable: true, value: 1331 },
        scrollLeft: { configurable: true, value: 0, writable: true },
      });

      fireEvent(window, new Event("resize"));
      await waitFor(() =>
        expect(screen.getByTestId("debtor-tab-fade-right")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("debtor-tab-fade-left")).not.toBeInTheDocument();
      expect(tabList).toHaveAttribute(
        "aria-describedby",
        "debtor-detail-tab-scroll-hint",
      );
      expect(
        screen.getByText("Geser ke samping untuk melihat tab lainnya."),
      ).toHaveClass("sr-only");

      const firstTab = within(tabList).getByRole("tab", { name: "Data Utama" });
      firstTab.focus();
      scrollIntoView.mockClear();
      await user.keyboard("{End}");

      const lastTab = within(tabList).getByRole("tab", { name: "Dana Titipan" });
      expect(lastTab).toHaveFocus();
      expect(lastTab).toHaveAttribute("aria-selected", "true");
      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "nearest",
        inline: "nearest",
      });

      Object.defineProperty(tabList, "scrollLeft", {
        configurable: true,
        value: 977,
        writable: true,
      });
      fireEvent.scroll(tabList);
      await waitFor(() =>
        expect(screen.getByTestId("debtor-tab-fade-left")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("debtor-tab-fade-right")).not.toBeInTheDocument();
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    }
  });
});

describe("IdebCreditPositionTable", () => {
  it("membatasi 20 fasilitas per halaman dan mereset halaman saat filter berubah", async () => {
    const user = userEvent.setup();
    render(<IdebPaginationHarness />);

    expect(screen.getByText("Total 21 data")).toBeInTheDocument();
    expect(screen.getByText("Halaman 1 dari 2")).toBeInTheDocument();
    expect(screen.getByText("Pelapor Pagination 01")).toBeInTheDocument();
    expect(screen.queryByText("Pelapor Pagination 21")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
    expect(screen.getByText("Halaman 2 dari 2")).toBeInTheDocument();
    expect(screen.getByText("Pelapor Pagination 21")).toBeInTheDocument();
    expect(screen.queryByText("Pelapor Pagination 01")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aktif" }));
    expect(screen.getByText("Halaman 1 dari 2")).toBeInTheDocument();
    expect(screen.getByText("Pelapor Pagination 01")).toBeInTheDocument();
    expect(screen.getByText("Total filter Aktif")).toBeInTheDocument();
  });
});
