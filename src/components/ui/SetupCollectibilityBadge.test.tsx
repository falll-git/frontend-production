import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SetupCollectibilityBadge, {
  formatCollectibilityLabel,
  getCollectibilityLevel,
} from "@/components/ui/SetupCollectibilityBadge";

describe("SetupCollectibilityBadge", () => {
  it.each([
    [1, "1 - Lancar"],
    [2, "2 - Dalam Perhatian Khusus"],
    [3, "3 - Kurang Lancar"],
    [4, "4 - Diragukan"],
    [5, "5 - Macet"],
  ])("menampilkan level %s dengan nama kanonis", (value, label) => {
    render(<SetupCollectibilityBadge value={value} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("mengenali nama KOL ketika kode tidak tersedia", () => {
    expect(getCollectibilityLevel("Dalam Perhatian Khusus")).toBe(2);
    expect(getCollectibilityLevel("Kurang Lancar")).toBe(3);
    expect(formatCollectibilityLabel(null, "Macet")).toBe("5 - Macet");
  });

  it("mempertahankan nilai tidak dikenal tanpa menebak level", () => {
    expect(formatCollectibilityLabel("BELUM DITENTUKAN")).toBe(
      "BELUM DITENTUKAN",
    );
  });
});
