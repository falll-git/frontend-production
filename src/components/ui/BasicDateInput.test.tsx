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

    const { container } = render(
      <BasicDateInput value="" onChange={vi.fn()} />,
    );

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
      left: "12px",
      maxHeight: "377px",
      top: "411px",
      width: "336px",
    });
    expect(container.contains(dialog)).toBe(false);
    expect(
      screen.getByRole("button", { name: "Bulan sebelumnya" }),
    ).toHaveClass("h-11", "w-11");
    expect(
      screen.getByRole("button", { name: "Bulan berikutnya" }),
    ).toHaveClass("h-11", "w-11");
    expect(
      screen.getByRole("button", { name: "1 Agustus 2026" }),
    ).toHaveClass("min-h-11");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
    expect(document.activeElement).toHaveAttribute("data-calendar-date");
  });

  it("mendukung navigasi panah di kalender", async () => {
    const user = userEvent.setup();
    render(<BasicDateInput value="2026-08-10" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Pilih tanggal" }));
    const selected = screen.getByRole("button", { name: "10 Agustus 2026" });
    expect(selected).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("button", { name: "11 Agustus 2026" }),
    ).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("button", { name: "18 Agustus 2026" }),
    ).toHaveFocus();
  });

  it("memberi ruang 44px untuk setiap hari pada viewport tablet", async () => {
    const user = userEvent.setup();
    setViewport(768, 900);

    const { container } = render(
      <BasicDateInput value="2026-08-10" onChange={vi.fn()} />,
    );
    const trigger = screen.getByRole("button", { name: "Pilih tanggal" });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      bottom: 144,
      height: 44,
      left: 32,
      right: 432,
      top: 100,
      width: 400,
      x: 32,
      y: 100,
      toJSON: () => ({}),
    });

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Pilih tanggal" });
    expect(dialog).toHaveStyle({ width: "366px" });
    expect(container.contains(dialog)).toBe(false);
    expect(
      screen.getByRole("button", { name: "10 Agustus 2026" }),
    ).toHaveClass("min-h-11", "w-full");
  });

  it("mengembalikan fokus ke pemicu setelah kalender ditutup dengan Escape", async () => {
    const user = userEvent.setup();
    render(<BasicDateInput value="2026-08-10" onChange={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Pilih tanggal" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Pilih tanggal" })).toBeNull();
    expect(trigger).toHaveFocus();
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

  it("menutup kalender dan meneruskan fokus saat Tab", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <BasicDateInput value="2026-08-10" onChange={vi.fn()} />
        <button type="button">Kontrol berikutnya</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Pilih tanggal" }));
    await user.keyboard("{Tab}");

    expect(screen.queryByRole("dialog", { name: "Pilih tanggal" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Kontrol berikutnya" }),
    ).toHaveFocus();
  });
});
