import { fireEvent, render, screen } from "@testing-library/react";
import { Archive, Box } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import StorageSummaryCard from "@/components/arsip/StorageSummaryCard";

describe("StorageSummaryCard", () => {
  it.each(["Lihat Rak", "Lihat Dokumen"])(
    "keeps the %s action at least 44px tall",
    (actionLabel) => {
      const onAction = vi.fn();

      render(
        <StorageSummaryCard
          actionLabel={actionLabel}
          icon={<Archive />}
          onAction={onAction}
          rows={[{ icon: <Box />, label: "Kode", value: "A-01" }]}
          total={1}
        />,
      );

      const action = screen.getByRole("button", { name: actionLabel });
      expect(action).toHaveClass("min-h-11");

      fireEvent.click(action);
      expect(onAction).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps an interactive information row at least 44px tall", () => {
    const onRowClick = vi.fn();

    render(
      <StorageSummaryCard
        actionLabel="Lihat Rak"
        icon={<Archive />}
        onAction={vi.fn()}
        rows={[
          {
            icon: <Box />,
            label: "Dokumen Disposisi",
            value: 2,
            onClick: onRowClick,
          },
        ]}
        total={2}
      />,
    );

    const row = screen.getByRole("button", { name: /Dokumen Disposisi\s*2/i });
    expect(row).toHaveClass("min-h-11");

    fireEvent.click(row);
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });
});
