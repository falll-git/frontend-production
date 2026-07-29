import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import BasicDateInput from "@/components/ui/BasicDateInput";

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

describe("BasicDateInput", () => {
  it("keeps the calendar inside a constrained mobile viewport", async () => {
    const user = userEvent.setup();
    setViewport(360, 800);

    render(<BasicDateInput value="" onChange={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Pilih tanggal" });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      bottom: 403,
      height: 44,
      left: 33,
      right: 317,
      top: 359,
      width: 284,
      x: 33,
      y: 359,
      toJSON: () => ({}),
    });

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Pilih tanggal" });
    expect(dialog).toHaveStyle({
      left: "28px",
      maxHeight: "377px",
      top: "411px",
      width: "320px",
    });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it("truncates a long placeholder without changing the control width", () => {
    render(
      <BasicDateInput
        value=""
        placeholder="Pilih tanggal operasional yang sangat panjang"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Pilih tanggal operasional yang sangat panjang"),
    ).toHaveClass("min-w-0", "truncate");
  });
});
