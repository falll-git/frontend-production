import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardPageShell from "./DashboardPageShell";

describe("DashboardPageShell", () => {
  it("tidak menganimasikan seluruh konten secara default", () => {
    render(
      <DashboardPageShell>
        <p>Konten dashboard</p>
      </DashboardPageShell>,
    );

    const shell = screen.getByText("Konten dashboard").parentElement;

    expect(shell).not.toHaveClass("animate-dashboard-page-in");
    expect(shell).not.toHaveClass("animate-fade-in");
  });

  it("menyediakan entrance singkat tanpa opacity hanya ketika diminta eksplisit", () => {
    render(
      <DashboardPageShell animated>
        <p>Konten prioritas</p>
      </DashboardPageShell>,
    );

    const shell = screen.getByText("Konten prioritas").parentElement;

    expect(shell).toHaveClass("animate-dashboard-page-in");
    expect(shell).not.toHaveClass("animate-fade-in");
  });
});
