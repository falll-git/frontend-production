import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AppErrorState from "@/components/system/AppErrorState";

describe("AppErrorState", () => {
  it("menampilkan pesan aman, referensi, dan menyediakan pemulihan", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();

    render(
      <AppErrorState
        title="Konten gagal dimuat"
        description="Silakan coba kembali."
        referenceId="ref-123"
        onRetry={retry}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Konten gagal dimuat" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Kode referensi: ref-123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kembali ke dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );

    await user.click(screen.getByRole("button", { name: /coba lagi/i }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("tidak menampilkan kontrol retry jika callback tidak diberikan", () => {
    render(<AppErrorState />);

    expect(
      screen.queryByRole("button", { name: /coba lagi/i }),
    ).not.toBeInTheDocument();
  });
});
