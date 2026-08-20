import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download, Edit2, Trash2 } from "lucide-react";
import { describe, expect, it } from "vitest";

import SetupActionMenu from "@/components/ui/SetupActionMenu";

function ActionMenuWorkflowHarness() {
  const [name, setName] = useState("Divisi Awal");
  const [draftName, setDraftName] = useState(name);
  const [isEditing, setIsEditing] = useState(false);

  const openEdit = () => {
    setDraftName(name);
    setIsEditing(true);
  };

  const saveEdit = () => {
    setName(draftName);
    setIsEditing(false);
  };

  return (
    <>
      <div>
        <button type="button">Sebelum menu</button>
        <span>{name}</span>
        <SetupActionMenu
          label="Buka aksi divisi"
          menuLabel={`Aksi untuk ${name}`}
          items={[
            {
              key: "edit",
              label: "Edit",
              icon: Edit2,
              onClick: openEdit,
            },
            {
              key: "delete",
              label: "Hapus",
              icon: Trash2,
              onClick: () => undefined,
            },
          ]}
        />
        <button type="button">Sesudah menu</button>
      </div>

      {isEditing ? (
        <div role="dialog" aria-label="Edit Divisi">
          <label htmlFor="division-name">Nama divisi</label>
          <input
            id="division-name"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
          />
          <button type="button" onClick={saveEdit}>
            Simpan
          </button>
        </div>
      ) : null}
    </>
  );
}

describe("SetupActionMenu", () => {
  it("dapat dibuka lewat keyboard dan menampilkan label aksi", async () => {
    const user = userEvent.setup();

    render(<ActionMenuWorkflowHarness />);

    const trigger = screen.getByRole("button", { name: "Buka aksi divisi" });
    expect(trigger).toHaveClass("size-11");
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("menuitem", { name: "Edit" }),
    ).toHaveClass("min-h-11");
    expect(
      screen.getByRole("menuitem", { name: "Hapus" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Hapus" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Hapus" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("dapat dibuka kembali setelah aksi edit mengubah data baris", async () => {
    const user = userEvent.setup();

    render(<ActionMenuWorkflowHarness />);

    const trigger = screen.getByRole("button", { name: "Buka aksi divisi" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();

    const nameInput = screen.getByRole("textbox", { name: "Nama divisi" });
    await user.clear(nameInput);
    await user.type(nameInput, "Divisi Diperbarui");
    await user.click(screen.getByRole("button", { name: "Simpan" }));

    expect(
      screen.getByText("Divisi Diperbarui", { exact: true }),
    ).toBeInTheDocument();

    await user.click(trigger);
    fireEvent.scroll(document);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("menuitem", { name: "Hapus" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["Tab", false],
    ["Shift+Tab", true],
  ])(
    "menutup menu saat navigasi %s meninggalkan menu",
    async (_label, shiftKey) => {
      const user = userEvent.setup();
      render(<ActionMenuWorkflowHarness />);

      const trigger = screen.getByRole("button", { name: "Buka aksi divisi" });
      await user.click(trigger);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole("menuitem", { name: "Edit" }), {
        key: "Tab",
        shiftKey,
      });

      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: shiftKey ? "Sebelum menu" : "Sesudah menu",
          }),
        ).toHaveFocus(),
      );
    },
  );

  it("memperlebar menu untuk label panjang tanpa memotong teks", async () => {
    const user = userEvent.setup();
    render(
      <SetupActionMenu
        label="Buka aksi dokumen"
        items={[
          {
            key: "download",
            label: "Unduh dokumen pendukung yang sudah ditandatangani",
            icon: Download,
            onClick: () => undefined,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Buka aksi dokumen" }));

    const menu = screen.getByRole("menu");
    const menuContainer = menu.parentElement;
    expect(Number.parseFloat(menuContainer?.style.width ?? "0")).toBeGreaterThan(168);
    expect(
      screen.getByText("Unduh dokumen pendukung yang sudah ditandatangani"),
    ).not.toHaveClass("truncate");
  });
});
