import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import IdebDetailTabNavigation, {
  getIdebDetailTabElementId,
  type IdebDetailTab,
} from "@/components/informasi-debitur/IdebDetailTabNavigation";

function NavigationHarness() {
  const [activeTab, setActiveTab] = useState<IdebDetailTab>("SUMMARY");

  return (
    <>
      <IdebDetailTabNavigation activeTab={activeTab} onChange={setActiveTab} />
      <div
        id="ideb-detail-panel"
        role="tabpanel"
        aria-labelledby={getIdebDetailTabElementId(activeTab)}
      >
        {activeTab}
      </div>
    </>
  );
}

describe("IdebDetailTabNavigation", () => {
  it("menampilkan petunjuk overflow di HP tanpa mengubah tab strip desktop", async () => {
    render(<NavigationHarness />);
    const tabList = screen.getByTestId("ideb-detail-tablist");

    Object.defineProperties(tabList, {
      clientWidth: { configurable: true, value: 324 },
      scrollWidth: { configurable: true, value: 430 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });

    fireEvent(window, new Event("resize"));

    await waitFor(() =>
      expect(screen.getByTestId("ideb-tab-fade-right")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("ideb-tab-fade-left")).not.toBeInTheDocument();
    expect(screen.getByTestId("ideb-tab-visible-scroll-hint")).toHaveTextContent(
      "Geser untuk melihat tab lainnya",
    );
    expect(screen.getByTestId("ideb-tab-fade-right")).toHaveClass("md:hidden");
    expect(screen.getByTestId("ideb-tab-visible-scroll-hint")).toHaveClass(
      "md:hidden",
    );

    const describedBy = tabList.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Geser ke samping untuk melihat tab lainnya.",
    );

    Object.defineProperty(tabList, "scrollLeft", {
      configurable: true,
      value: 106,
      writable: true,
    });
    fireEvent.scroll(tabList);

    await waitFor(() =>
      expect(screen.getByTestId("ideb-tab-fade-left")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("ideb-tab-fade-right")).not.toBeInTheDocument();
  });

  it("menggulir tab aktif dan mendukung Arrow, Home, serta End", async () => {
    const user = userEvent.setup();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(<NavigationHarness />);
      const tabList = screen.getByRole("tablist", { name: "Bagian detail IDEB" });
      const summaryTab = within(tabList).getByRole("tab", { name: "Ringkasan" });
      const facilitiesTab = within(tabList).getByRole("tab", { name: "Fasilitas" });
      const conclusionTab = within(tabList).getByRole("tab", { name: "Kesimpulan" });

      expect(summaryTab).toHaveAttribute("tabindex", "0");
      expect(facilitiesTab).toHaveAttribute("tabindex", "-1");
      expect(summaryTab).toHaveAttribute("aria-controls", "ideb-detail-panel");
      expect(document.getElementById("ideb-detail-panel")).toHaveAttribute(
        "aria-labelledby",
        getIdebDetailTabElementId("SUMMARY"),
      );

      summaryTab.focus();
      scrollIntoView.mockClear();
      await user.keyboard("{ArrowRight}");

      expect(facilitiesTab).toHaveFocus();
      expect(facilitiesTab).toHaveAttribute("aria-selected", "true");
      expect(facilitiesTab).toHaveAttribute("tabindex", "0");
      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "nearest",
        inline: "nearest",
      });
      expect(document.getElementById("ideb-detail-panel")).toHaveAttribute(
        "aria-labelledby",
        getIdebDetailTabElementId("FACILITIES"),
      );

      await user.keyboard("{End}");
      expect(conclusionTab).toHaveFocus();
      expect(conclusionTab).toHaveAttribute("aria-selected", "true");

      await user.keyboard("{Home}");
      expect(summaryTab).toHaveFocus();
      expect(summaryTab).toHaveAttribute("aria-selected", "true");
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
