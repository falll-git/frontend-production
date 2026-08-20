import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import BasicMonthInput from "@/components/ui/BasicMonthInput";

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

describe("BasicMonthInput", () => {
  it("menampilkan periode Indonesia dan memilih nilai YYYY-MM", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BasicMonthInput value="2026-03" onChange={onChange} name="period" />,
    );

    expect(screen.getByText("Maret 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pilih bulan" }));
    expect(screen.getByRole("button", { name: "Maret 2026" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Mei 2026" }));

    expect(onChange).toHaveBeenCalledWith("2026-05");
    expect(document.querySelector('input[name="period"]')).toHaveValue(
      "2026-03",
    );
  });

  it("mendukung navigasi panah dan memulihkan fokus dengan Escape", async () => {
    const user = userEvent.setup();
    render(<BasicMonthInput value="2026-03" onChange={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Pilih bulan" });
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Maret 2026" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "April 2026" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Pilih bulan" })).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("memportal popup di dalam viewport mobile dan memakai target sentuh 44px", async () => {
    const user = userEvent.setup();
    setViewport(360, 800);
    const { container } = render(
      <BasicMonthInput value="" onChange={vi.fn()} />,
    );

    const trigger = screen.getByRole("button", { name: "Pilih bulan" });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      bottom: 744,
      height: 44,
      left: 33,
      right: 317,
      top: 700,
      width: 284,
      x: 33,
      y: 700,
      toJSON: () => ({}),
    });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Pilih bulan" });
    expect(dialog).toHaveStyle({
      bottom: "108px",
      left: "28px",
      maxHeight: "330px",
      width: "320px",
    });
    expect(container.contains(dialog)).toBe(false);
    expect(
      screen.getByRole("button", { name: "Tahun sebelumnya" }),
    ).toHaveClass("h-11", "w-11");
    expect(screen.getByRole("button", { name: "Januari 2026" })).toHaveClass(
      "min-h-11",
    );
  });

  it("membersihkan nilai dan memulihkan fokus", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BasicMonthInput value="2026-08" onChange={onChange} />);

    const trigger = screen.getByRole("button", { name: "Pilih bulan" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Bersihkan" }));

    expect(onChange).toHaveBeenCalledWith("");
    expect(trigger).toHaveFocus();
  });

  it("menutup pemilih bulan dan meneruskan fokus saat Tab", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <BasicMonthInput value="2026-08" onChange={vi.fn()} />
        <button type="button">Kontrol berikutnya</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Pilih bulan" }));
    await user.keyboard("{Tab}");

    expect(screen.queryByRole("dialog", { name: "Pilih bulan" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Kontrol berikutnya" }),
    ).toHaveFocus();
  });
});
