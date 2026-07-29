import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Pagination from "@/components/ui/Pagination";

describe("Pagination", () => {
  it("memindahkan halaman melalui tombol dan input keyboard", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <Pagination
        page={2}
        lastPage={5}
        total={46}
        limit={10}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("Total 46 data")).toBeInTheDocument();
    expect(screen.getByText("Halaman 2 dari 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);

    const input = screen.getByRole("spinbutton", { name: "Halaman" });
    await user.clear(input);
    await user.type(input, "99{Enter}");
    expect(onPageChange).toHaveBeenLastCalledWith(5);
  });

  it("menonaktifkan navigasi selama data dimuat", () => {
    render(
      <Pagination
        page={2}
        lastPage={3}
        isLoading
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Halaman sebelumnya" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Halaman berikutnya" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Halaman" })).toBeDisabled();
  });

  it("tidak merender navigasi untuk satu halaman", () => {
    const { container } = render(
      <Pagination page={1} lastPage={1} total={4} limit={10} onPageChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
