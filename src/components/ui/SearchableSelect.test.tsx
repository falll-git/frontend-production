import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SearchableSelect from "@/components/ui/SearchableSelect";

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

describe("SearchableSelect", () => {
  it("portals and flips the options panel above a trigger near the viewport bottom", async () => {
    const user = userEvent.setup();
    setViewport(360, 800);

    const { container } = render(
      <SearchableSelect
        id="owner"
        value=""
        options={[
          { value: "1", label: "Admin" },
          { value: "2", label: "Manager" },
        ]}
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Pilih data" });
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

    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveStyle({
      bottom: "108px",
      left: "33px",
      maxHeight: "320px",
      width: "284px",
    });
    expect(container.contains(listbox)).toBe(false);
    expect(screen.getByPlaceholderText("Cari data...")).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps long selected labels on one truncated line", () => {
    render(
      <SearchableSelect
        value="1"
        options={[
          {
            value: "1",
            label: "Pilihan dengan nama yang sangat panjang untuk ruang sempit",
          },
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Pilihan dengan nama yang sangat panjang untuk ruang sempit",
      ),
    ).toHaveClass("min-w-0", "truncate");
  });

  it("memfilter, menavigasi keyboard, dan memilih opsi yang aktif", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        name="owner_id"
        value=""
        options={[
          { value: "1", label: "Admin", description: "Kantor pusat" },
          { value: "2", label: "Manager", description: "Cabang timur" },
          { value: "3", label: "Duplikat", disabled: true },
          { value: "3", label: "Duplikat kedua" },
        ]}
        onChange={onChange}
        maxVisibleOptions={3}
        required
      />,
    );

    const trigger = screen.getByRole("button", { name: "Pilih data" });
    expect(document.querySelector('input[name="owner_id"]')).toHaveValue("");
    expect(trigger).toHaveAttribute("data-required", "true");
    trigger.focus();
    await user.keyboard("{Enter}");
    const search = screen.getByPlaceholderText("Cari data...");
    await user.type(search, "cabang");
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{ArrowUp}{Enter}");

    expect(onChange).toHaveBeenCalledWith(
      "2",
      expect.objectContaining({ label: "Manager" }),
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("mengabaikan opsi disabled dan dapat membersihkan pilihan", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <SearchableSelect
        value="blocked"
        options={[{ value: "blocked", label: "Tidak dapat dipilih", disabled: true }]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tidak dapat dipilih" }));
    await user.click(screen.getByRole("option", { name: "Tidak dapat dipilih" }));
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <SearchableSelect
        value="active"
        selectedOption={{ value: "active", label: "Pilihan aktif" }}
        options={[]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Bersihkan pilihan" }));
    expect(onChange).toHaveBeenLastCalledWith("", null);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("tidak membuka kontrol disabled dan menutup popup saat klik di luar", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SearchableSelect value="" options={[]} onChange={vi.fn()} disabled />,
    );
    const disabledTrigger = screen.getByRole("button", { name: "Pilih data" });
    fireEvent.keyDown(disabledTrigger, { key: "ArrowDown" });
    expect(screen.queryByRole("listbox")).toBeNull();

    rerender(
      <div>
        <SearchableSelect value="" options={[]} onChange={vi.fn()} />
        <button type="button">Di luar</button>
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Pilih data" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Di luar" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("memuat opsi async, mempertahankan pilihan terakhir, dan menampilkan kegagalan", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const loadOptions = vi
      .fn<(query: string) => Promise<Array<{ value: string; label: string }>>>()
      .mockResolvedValueOnce([{ value: "async-1", label: "Hasil async" }])
      .mockRejectedValueOnce(new Error("network"));
    const { rerender } = render(
      <SearchableSelect
        value=""
        loadOptions={loadOptions}
        onChange={onChange}
        debounceMs={0}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pilih data" }));
    await waitFor(() => expect(loadOptions).toHaveBeenCalledWith(""));
    await user.click(await screen.findByRole("option", { name: "Hasil async" }));
    expect(onChange).toHaveBeenCalledWith(
      "async-1",
      expect.objectContaining({ label: "Hasil async" }),
    );

    rerender(
      <SearchableSelect
        value="async-1"
        loadOptions={loadOptions}
        onChange={onChange}
        debounceMs={0}
      />,
    );
    expect(screen.getByRole("button", { name: "Hasil async" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hasil async" }));
    await waitFor(() =>
      expect(screen.getByText("Gagal memuat data. Coba cari ulang.")).toBeInTheDocument(),
    );
  });
});
