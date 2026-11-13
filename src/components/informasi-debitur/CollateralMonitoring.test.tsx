import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CollateralExpiryModal } from "./CollateralMonitoring";
import type { DebtorCollateral } from "@/types/debitur.types";

const collateral = (id: string, note: string) => ({
  id, collateral_number: id, collateral_type: "Tanah",
  has_expiry_date: false, expiry_date: null, expiry_note: note,
}) as DebtorCollateral;

describe("CollateralExpiryModal", () => {
  it("initializes the active collateral immediately and resets drafts on reopen", () => {
    const first = collateral("A", "Catatan A");
    const second = collateral("B", "Catatan B");
    const props = { item: first, isOpen: true, onClose: vi.fn(), onSave: vi.fn() };
    const { rerender } = render(<CollateralExpiryModal {...props} />);
    expect(screen.getByLabelText("Keterangan Expired")).toHaveValue("Catatan A");
    fireEvent.change(screen.getByLabelText("Keterangan Expired"), { target: { value: "Draft A" } });
    rerender(<CollateralExpiryModal {...props} item={second} />);
    expect(screen.getByLabelText("Keterangan Expired")).toHaveValue("Catatan B");
    fireEvent.change(screen.getByLabelText("Keterangan Expired"), { target: { value: "Draft B" } });
    rerender(<CollateralExpiryModal {...props} item={second} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<CollateralExpiryModal {...props} item={second} />);
    expect(screen.getByLabelText("Keterangan Expired")).toHaveValue("Catatan B");
  });

  it("submits the active draft once and does not close a replacement record after a late save", async () => {
    let finishSave!: () => void;
    const onSave = vi.fn(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    const onClose = vi.fn();
    const props = { item: collateral("A", "Catatan A"), isOpen: true, onClose, onSave };
    const { rerender } = render(<CollateralExpiryModal {...props} />);
    fireEvent.change(screen.getByLabelText("Keterangan Expired"), { target: { value: "  Draft aktif  " } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(onSave).toHaveBeenCalledWith({ has_expiry_date: false, expiry_date: null, expiry_note: "Draft aktif" });
    expect(screen.getByRole("button", { name: "Menyimpan..." })).toBeDisabled();
    rerender(<CollateralExpiryModal {...props} item={collateral("B", "Catatan B")} />);
    await act(async () => finishSave());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Keterangan Expired")).toHaveValue("Catatan B");
  });
});
