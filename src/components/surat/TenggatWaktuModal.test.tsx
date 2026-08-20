import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import TenggatWaktuModal from "@/components/surat/TenggatWaktuModal";

function Harness({
  onCancel,
  onSave,
  onSkip,
}: {
  onCancel: () => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Buka tenggat
      </button>
      <TenggatWaktuModal
        isOpen={isOpen}
        title="Tenggat Tindak Lanjut"
        onCancel={() => {
          onCancel();
          setIsOpen(false);
        }}
        onSave={() => {
          onSave();
          setIsOpen(false);
        }}
        onSkip={() => {
          onSkip();
          setIsOpen(false);
        }}
      />
    </>
  );
}

describe("TenggatWaktuModal", () => {
  test("Escape membatalkan modal tanpa menjalankan aksi simpan", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSave = vi.fn();
    const onSkip = vi.fn();

    render(
      <Harness onCancel={onCancel} onSave={onSave} onSkip={onSkip} />,
    );

    const trigger = screen.getByRole("button", { name: "Buka tenggat" });
    await user.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Tenggat Tindak Lanjut" }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/Tambahkan instruksi/i),
      "Catatan yang harus dibersihkan ketika dibatalkan",
    );
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Tenggat Tindak Lanjut" }),
      ).not.toBeInTheDocument(),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());

    await user.click(trigger);
    expect(screen.getByPlaceholderText(/Tambahkan instruksi/i)).toHaveValue("");
  });
});
