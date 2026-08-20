import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AUTH_STORAGE_KEYS } from "@/lib/auth-storage";
import {
  SessionRefreshRateLimitError,
  SessionRefreshTransientError,
} from "@/lib/axios";
import type { User } from "@/types/auth.types";

const mocks = vi.hoisted(() => ({
  getMenus: vi.fn(),
  getRoleMenus: vi.fn(),
  getAllRoleMenus: vi.fn(),
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/services/auth.service", () => ({
  authService: {
    login: mocks.login,
    logout: mocks.logout,
    refresh: mocks.refresh,
  },
}));

vi.mock("@/services/menu.service", () => ({
  menuService: { getAll: mocks.getMenus },
}));

vi.mock("@/services/role-menu.service", () => ({
  roleMenuService: {
    getAll: mocks.getAllRoleMenus,
    getByRoleId: mocks.getRoleMenus,
  },
}));

vi.mock("@/services/user.service", () => ({
  userService: { getMe: mocks.getMe },
}));

const USER: User = {
  id: "user-active",
  username: "admin",
  email: "admin@example.test",
  name: "Admin",
  role: "Admin",
  role_id: "role-admin",
  division_id: "division-1",
  can_access_restricted_documents: true,
  is_restrict: false,
  is_active: true,
};

function Probe() {
  const { refreshRbac, status, user } = useAuth();
  return (
    <div>
      <span>{status}</span>
      <span>{user?.username ?? "tanpa-user"}</span>
      <button type="button" onClick={() => void refreshRbac()}>
        Refresh akses
      </button>
    </div>
  );
}

describe("AuthProvider global request coordination", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    mocks.getMenus.mockResolvedValue([]);
    mocks.getRoleMenus.mockResolvedValue([]);
    mocks.getAllRoleMenus.mockResolvedValue([]);
    mocks.getMe.mockResolvedValue(USER);
    mocks.logout.mockResolvedValue(undefined);
    mocks.refresh.mockResolvedValue({
      status: true,
      message: "ok",
      data: { token: "fresh-token", user: USER },
    });
  });

  it("tidak mengambil ulang layout pada rangkaian focus cepat dan hanya memuat role aktif", async () => {
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEYS.sessionUser,
      JSON.stringify(USER),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await screen.findByText("authenticated");
    expect(mocks.getMenus).toHaveBeenCalledTimes(1);
    expect(mocks.getRoleMenus).toHaveBeenCalledTimes(1);
    expect(mocks.getRoleMenus).toHaveBeenCalledWith("role-admin");
    expect(mocks.getAllRoleMenus).not.toHaveBeenCalled();

    for (let index = 0; index < 100; index += 1) {
      window.dispatchEvent(new Event("focus"));
    }
    await Promise.resolve();

    expect(mocks.getMenus).toHaveBeenCalledTimes(1);
    expect(mocks.getRoleMenus).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Refresh akses" }));
    await waitFor(() => expect(mocks.getMenus).toHaveBeenCalledTimes(2));
    expect(mocks.getRoleMenus).toHaveBeenCalledTimes(2);
  });

  it("mempertahankan identitas browser ketika pemulihan sesi terkena 429", async () => {
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEYS.sessionUser,
      JSON.stringify(USER),
    );
    mocks.refresh.mockRejectedValue(
      new SessionRefreshRateLimitError("Dibatasi sementara", {
        retryAfterMs: 1_000,
      }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await screen.findByText("authenticated");
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionUser),
    ).toBe(JSON.stringify(USER));
    expect(mocks.getMenus).not.toHaveBeenCalled();
    expect(mocks.getRoleMenus).not.toHaveBeenCalled();
  });

  it("mempertahankan identitas browser ketika pemulihan sesi terkena gangguan server sementara", async () => {
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEYS.sessionUser,
      JSON.stringify(USER),
    );
    mocks.refresh.mockRejectedValue(
      new SessionRefreshTransientError("Gangguan sementara", {
        statusCode: 503,
      }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await screen.findByText("authenticated");
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionUser),
    ).toBe(JSON.stringify(USER));
    expect(mocks.getMenus).not.toHaveBeenCalled();
    expect(mocks.getRoleMenus).not.toHaveBeenCalled();
  });
});
