import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SetupState from "@/components/ui/SetupState";

describe("SetupState", () => {
  it("mengumumkan error sebagai alert", () => {
    render(
      <SetupState
        variant="error"
        title="Data gagal dimuat"
        description="Silakan coba kembali."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Data gagal dimuat");
  });

  it("mengumumkan loading tanpa mengganggu fokus", () => {
    render(<SetupState variant="loading" title="Memuat data" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
