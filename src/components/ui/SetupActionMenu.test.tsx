import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download, Edit2, Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

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
  it('preserves the default hiding of unavailable actions for existing consumers', async()=>{
    const action=vi.fn();
    render(<SetupActionMenu items={[{key:'edit',label:'Ubah',icon:Edit2,onClick:action},{key:'delete',label:'Hapus',icon:Trash2,disabled:true,onClick:action}]} />);
    await userEvent.click(screen.getByRole('button',{name:'Buka aksi'}));
    expect(screen.getByRole('menuitem',{name:'Ubah'})).toBeVisible();
    expect(screen.queryByRole('menuitem',{name:'Hapus'})).not.toBeInTheDocument();
  });

  it('explains disabled actions without allowing pointer or keyboard activation', async()=>{
    const user=userEvent.setup(),action=vi.fn();
    const items=[{key:'delete',label:'Cabut kontak',icon:Trash2,disabled:true,disabledReason:'Kontak masih dipakai publikasi.',onClick:action}];
    const {rerender}=render(<SetupActionMenu showDisabledItems items={items} />);
    const trigger=screen.getByRole('button',{name:'Buka aksi'});
    await user.click(trigger);
    const item=screen.getByRole('menuitem',{name:'Cabut kontak'});
    expect(item).toHaveAttribute('aria-disabled','true');
    expect(item).toHaveAccessibleDescription('Kontak masih dipakai publikasi.');
    expect(item).toHaveFocus();
    await user.keyboard('{Enter} ');await user.click(item);
    expect(action).not.toHaveBeenCalled();expect(screen.getByRole('menu')).toBeVisible();
    await user.keyboard('{Escape}');expect(trigger).toHaveFocus();
    rerender(<SetupActionMenu showDisabledItems items={[{...items[0],disabled:false}]} />);
    await user.click(trigger);await user.click(screen.getByRole('menuitem',{name:'Cabut kontak'}));
    expect(action).toHaveBeenCalledOnce();
  });

  it('blocks an action that becomes unavailable while the menu is open', async()=>{
    const action=vi.fn(),item={key:'save',label:'Simpan',icon:Edit2,onClick:action};
    const {rerender}=render(<SetupActionMenu showDisabledItems items={[item]} />);
    await userEvent.click(screen.getByRole('button',{name:'Buka aksi'}));
    rerender(<SetupActionMenu showDisabledItems items={[{...item,disabled:true,disabledReason:'Sedang diproses.'}]} />);
    fireEvent.click(screen.getByRole('menuitem',{name:'Simpan'}));
    expect(action).not.toHaveBeenCalled();expect(screen.getByText('Sedang diproses.')).toBeVisible();
  });
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
