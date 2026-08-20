import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test } from "vitest";

import DashboardModal from "@/components/ui/DashboardModal";
import {
  DocumentPreviewProvider,
  useDocumentPreviewContext,
} from "@/components/ui/DocumentPreviewContext";

function DetailModal({ onClose }: { onClose: () => void }) {
  const { openPreview } = useDocumentPreviewContext();

  return (
    <DashboardModal
      isOpen
      title="Detail dokumen"
      onClose={onClose}
      footer={<button type="button">Simpan</button>}
    >
      <button
        type="button"
        onClick={() =>
          openPreview(
            "data:application/pdf;base64,JVBERi0xLjQK",
            "dokumen-audit.pdf",
            "pdf",
          )
        }
      >
        Preview dokumen
      </button>
    </DashboardModal>
  );
}

function NestedPreviewHarness() {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <DocumentPreviewProvider>
      <button type="button" onClick={() => setIsDetailOpen(true)}>
        Buka detail
      </button>
      {isDetailOpen ? (
        <DetailModal onClose={() => setIsDetailOpen(false)} />
      ) : null}
    </DocumentPreviewProvider>
  );
}

describe("DocumentPreviewContext", () => {
  test("preview teratas mengunci fokus, meng-inert modal bawah, dan memulihkan fokus", async () => {
    const user = userEvent.setup();
    render(<NestedPreviewHarness />);

    const detailTrigger = screen.getByRole("button", { name: "Buka detail" });
    await user.click(detailTrigger);

    const detailDialog = await screen.findByRole("dialog", {
      name: "Detail dokumen",
    });
    const detailOverlay = detailDialog.closest<HTMLElement>(
      '[data-dashboard-overlay="true"]',
    );
    const previewTrigger = screen.getByRole("button", {
      name: "Preview dokumen",
    });

    await user.click(previewTrigger);

    const previewDialog = await screen.findByRole("dialog", {
      name: "dokumen-audit.pdf",
    });
    const closePreview = screen.getByRole("button", {
      name: "Tutup preview",
    });
    const downloadPreview = screen.getByRole("button", {
      name: "Unduh dokumen-audit.pdf",
    });

    expect(previewDialog).toHaveAttribute("aria-modal", "true");
    expect(previewDialog).toHaveAccessibleDescription("Dokumen PDF");
    expect(detailOverlay).not.toBeNull();
    expect(detailOverlay).toHaveAttribute("inert");
    expect(detailOverlay).toHaveAttribute("aria-hidden", "true");
    await waitFor(() => expect(closePreview).toHaveFocus());

    await user.tab();
    expect(downloadPreview).toHaveFocus();
    await user.tab({ shift: true });
    expect(closePreview).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "dokumen-audit.pdf" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("dialog", { name: "Detail dokumen" }),
    ).toBeInTheDocument();
    expect(detailOverlay).not.toHaveAttribute("inert");
    expect(detailOverlay).not.toHaveAttribute("aria-hidden");
    await waitFor(() => expect(previewTrigger).toHaveFocus());
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Detail dokumen" }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(detailTrigger).toHaveFocus());
  });
});
