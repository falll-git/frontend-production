import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Edit2, Trash2 } from "lucide-react";
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
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("menuitem", { name: "Edit" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Hapus" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("dapat dibuka kembali setelah aksi edit mengubah data baris", async () => {
    const user = userEvent.setup();

    render(<ActionMenuWorkflowHarness />);

    const trigger = screen.getByRole("button", { name: "Buka aksi divisi" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(trigger).toHaveAttribute("aria-expanded", "false");

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
});
