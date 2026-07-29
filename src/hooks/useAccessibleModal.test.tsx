import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";

import useAccessibleModal from "./useAccessibleModal";

function TestModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useAccessibleModal({ onClose });
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Modal pengujian"
      tabIndex={-1}
    >
      <button type="button">Pertama</button>
      <button type="button">Terakhir</button>
    </div>
  );
}

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Buka
      </button>
      {open ? <TestModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

test("modal mengunci fokus, ditutup dengan Escape, dan mengembalikan fokus", async () => {
  render(<ModalHarness />);
  const trigger = screen.getByRole("button", { name: "Buka" });
  trigger.focus();
  fireEvent.click(trigger);

  const first = screen.getByRole("button", { name: "Pertama" });
  const last = screen.getByRole("button", { name: "Terakhir" });
  await waitFor(() => expect(first).toHaveFocus());

  last.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(first).toHaveFocus();

  first.focus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(last).toHaveFocus();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

function NestedModal({ onClose }: { onClose: (name: string) => void }) {
  const outerRef = useAccessibleModal({ onClose: () => onClose("outer") });
  const innerRef = useAccessibleModal({ onClose: () => onClose("inner") });
  return (
    <>
      <div
        ref={outerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Luar"
        tabIndex={-1}
      >
        <button type="button">Aksi luar</button>
      </div>
      <div
        ref={innerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Dalam"
        tabIndex={-1}
      >
        <button type="button">Aksi dalam</button>
      </div>
    </>
  );
}

test("Escape hanya ditangani modal paling atas", () => {
  const onClose = vi.fn();
  render(<NestedModal onClose={onClose} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledWith("inner");
});
