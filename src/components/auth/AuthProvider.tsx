"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AUTH_STORAGE_KEYS, clearAuthBrowserStorage } from "@/lib/auth-storage";
import { setAccessToken } from "@/lib/axios";
import {
  clearRuntimeRbacData,
  setRuntimeRbacData,
  type Role,
} from "@/lib/rbac";
import { authService } from "@/services/auth.service";
import { menuService } from "@/services/menu.service";
import { roleMenuService } from "@/services/role-menu.service";
import { userService } from "@/services/user.service";
import type { StoredUser, User } from "@/types/auth.types";
import type { DashboardMenuNode } from "@/types/rbac.types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface SignInResultSuccess {
  ok: true;
  user: User;
}

interface SignInResultFailure {
  ok: false;
  message: string;
}

type SignInResult = SignInResultSuccess | SignInResultFailure;

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  role: Role | null;
  dashboardMenus: DashboardMenuNode[];
  refreshRbac: () => Promise<void>;
  signIn: (
    username: string,
    password: string,
    options?: { remember?: boolean },
  ) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function parseRole(role: unknown): Role | null {
  if (typeof role === "string") {
    const trimmed = role.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof role === "object" && role !== null) {
    const record = role as Record<string, unknown>;
    return (
      parseRole(record.role) ??
      parseRole(record.role_name) ??
      parseRole(record.roleName) ??
      parseRole(record.name) ??
      parseRole(record.label) ??
      parseRole(record.code)
    );
  }

  return null;
}

function readJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toPublicUser(user: StoredUser | User): User {
  const { ...publicUser } = user;
  return publicUser;
}

function normalizeUserPayload(payload: unknown): User | null {
  if (typeof payload !== "object" || payload === null) return null;

  const record = payload as Record<string, unknown>;
  const rawUsername =
    typeof record.username === "string" ? record.username : null;
  const roleValue =
    record.role ??
    record.role_name ??
    record.roleName ??
    (typeof record.role === "object" && record.role !== null
      ? (record.role as Record<string, unknown>).name
      : null);
  const divisionRecord =
    typeof record.division === "object" && record.division !== null
      ? (record.division as Record<string, unknown>)
      : null;
  const roleRecord =
    typeof record.role === "object" && record.role !== null
      ? (record.role as Record<string, unknown>)
      : null;
  const role = parseRole(roleValue);
  const id = record.id;
  const username = record.username;
  const email = record.email;
  const name =
    record.name ?? record.full_name ?? record.fullName ?? rawUsername;

  if (
    typeof id !== "string" ||
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof name !== "string" ||
    !role
  ) {
    return null;
  }

  return {
    id,
    username,
    email,
    name,
    role,
    role_id:
      typeof record.role_id === "string"
        ? record.role_id
        : typeof record.roleId === "string"
          ? record.roleId
          : roleRecord && typeof roleRecord.id === "string"
            ? roleRecord.id
            : "",
    division_id:
      typeof record.division_id === "string"
        ? record.division_id
        : typeof record.divisionId === "string"
          ? record.divisionId
          : divisionRecord && typeof divisionRecord.id === "string"
            ? divisionRecord.id
            : "",
    is_restrict: Boolean(record.is_restrict ?? record.isRestrict ?? false),
    is_active:
      typeof record.is_active === "boolean"
        ? record.is_active
        : typeof record.isActive === "boolean"
          ? record.isActive
          : true,
  };
}

function extractUser(payload: unknown): User | null {
  if (typeof payload !== "object" || payload === null) return null;
  const data = payload as Record<string, unknown>;
  const authEnvelope =
    typeof data.data === "object" && data.data !== null
      ? (data.data as Record<string, unknown>)
      : null;

  return (
    normalizeUserPayload(data.data) ??
    normalizeUserPayload(data.user) ??
    (authEnvelope
      ? (normalizeUserPayload(authEnvelope) ??
        normalizeUserPayload(authEnvelope.data) ??
        normalizeUserPayload(authEnvelope.user))
      : null)
  );
}

function extractToken(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const data = payload as Record<string, unknown>;
  const authEnvelope =
    typeof data.data === "object" && data.data !== null
      ? (data.data as Record<string, unknown>)
      : null;

  if (authEnvelope && typeof authEnvelope.token === "string") {
    return authEnvelope.token;
  }

  if (typeof data.token === "string") return data.token;

  return null;
}

function extractRefreshToken(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const data = payload as Record<string, unknown>;
  const authEnvelope =
    typeof data.data === "object" && data.data !== null
      ? (data.data as Record<string, unknown>)
      : null;

  if (authEnvelope && typeof authEnvelope.refreshToken === "string") {
    return authEnvelope.refreshToken;
  }

  if (typeof data.refreshToken === "string") return data.refreshToken;

  return null;
}

function clearStoredSession() {
  clearAuthBrowserStorage();
}

export function AuthProvider({ children }: AuthProviderProps): ReactNode {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [dashboardMenus, setDashboardMenus] = useState<DashboardMenuNode[]>([]);

  const syncRuntimeRbac = useCallback(async () => {
    try {
      const [menus, roleMenus] = await Promise.all([
        menuService.getAll(),
        roleMenuService.getAll(),
      ]);

      setRuntimeRbacData({ menus, roleMenus });
      setDashboardMenus(menus);
    } catch {
      clearRuntimeRbacData();
      setDashboardMenus([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const restoreSession = async () => {
      try {
        const rawUser =
          window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionUser) ??
          window.localStorage.getItem(AUTH_STORAGE_KEYS.persistedUser);
        const rawToken =
          window.sessionStorage.getItem(AUTH_STORAGE_KEYS.sessionAccessToken) ??
          window.localStorage.getItem(AUTH_STORAGE_KEYS.persistedAccessToken);

        const parsedUser = readJson<User>(rawUser);
        let nextUser =
          parsedUser && parsedUser.is_active ? toPublicUser(parsedUser) : null;

        if (!rawToken) {
          clearStoredSession();
          clearRuntimeRbacData();
          setDashboardMenus([]);
          setAccessToken(null);
          if (cancelled) return;
          setUser(null);
          setStatus("unauthenticated");
          return;
        }

        setAccessToken(rawToken);

        const me = await userService.getMe().catch(() => null);
        const fromServer = me ? normalizeUserPayload(me as unknown) : null;
        if (fromServer && fromServer.is_active) {
          nextUser = toPublicUser(fromServer);
        }

        if (!nextUser) {
          clearStoredSession();
          clearRuntimeRbacData();
          setDashboardMenus([]);
          setAccessToken(null);
          if (cancelled) return;
          setUser(null);
          setStatus("unauthenticated");
          return;
        }

        await syncRuntimeRbac();

        if (cancelled) return;

        setUser(nextUser);
        setStatus("authenticated");
      } catch {
        clearStoredSession();
        clearRuntimeRbacData();
        setDashboardMenus([]);
        if (cancelled) return;
        setAccessToken(null);
        setUser(null);
        setStatus("unauthenticated");
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [syncRuntimeRbac]);

  const signIn = useCallback(
    async (
      username: string,
      password: string,
      options?: { remember?: boolean },
    ): Promise<SignInResult> => {
      const remember = options?.remember ?? false;

      let payload: unknown;
      try {
        payload = await authService.login(
          normalizeUsername(username),
          password,
        );
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan pada server",
        };
      }

      const token = extractToken(payload);
      const refreshToken = extractRefreshToken(payload);

      if (!token) {
        return {
          ok: false,
          message: "Respons login tidak valid dari server",
        };
      }

      setAccessToken(token);
      const nextUser =
        (await userService
          .getMe()
          .then((me) => normalizeUserPayload(me as unknown))
          .catch(() => null)) ?? extractUser(payload);

      if (!nextUser) {
        setAccessToken(null);
        return {
          ok: false,
          message: "Respons user login tidak valid dari server",
        };
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(AUTH_STORAGE_KEYS.legacyUserId);

        const serializedUser = JSON.stringify(nextUser);

        if (remember) {
          window.localStorage.setItem(
            AUTH_STORAGE_KEYS.persistedUser,
            serializedUser,
          );
          window.localStorage.setItem(
            AUTH_STORAGE_KEYS.persistedAccessToken,
            token,
          );
          window.sessionStorage.removeItem(AUTH_STORAGE_KEYS.sessionUser);
          window.sessionStorage.removeItem(
            AUTH_STORAGE_KEYS.sessionAccessToken,
          );

          if (refreshToken) {
            window.localStorage.setItem(
              AUTH_STORAGE_KEYS.persistedRefreshToken,
              refreshToken,
            );
          } else {
            window.localStorage.removeItem(
              AUTH_STORAGE_KEYS.persistedRefreshToken,
            );
          }

          window.sessionStorage.removeItem(
            AUTH_STORAGE_KEYS.sessionRefreshToken,
          );
        } else {
          window.sessionStorage.setItem(
            AUTH_STORAGE_KEYS.sessionUser,
            serializedUser,
          );
          window.sessionStorage.setItem(
            AUTH_STORAGE_KEYS.sessionAccessToken,
            token,
          );
          window.localStorage.removeItem(AUTH_STORAGE_KEYS.persistedUser);
          window.localStorage.removeItem(
            AUTH_STORAGE_KEYS.persistedAccessToken,
          );

          if (refreshToken) {
            window.sessionStorage.setItem(
              AUTH_STORAGE_KEYS.sessionRefreshToken,
              refreshToken,
            );
          } else {
            window.sessionStorage.removeItem(
              AUTH_STORAGE_KEYS.sessionRefreshToken,
            );
          }

          window.localStorage.removeItem(
            AUTH_STORAGE_KEYS.persistedRefreshToken,
          );
        }
      }

      await syncRuntimeRbac();

      const publicUser = toPublicUser(nextUser);
      setUser(publicUser);
      setStatus("authenticated");
      return { ok: true, user: publicUser };
    },
    [syncRuntimeRbac],
  );

  const signOut = useCallback(async () => {
    try {
      const token =
        typeof window === "undefined"
          ? null
          : (window.sessionStorage.getItem(
              AUTH_STORAGE_KEYS.sessionAccessToken,
            ) ??
            window.localStorage.getItem(
              AUTH_STORAGE_KEYS.persistedAccessToken,
            ));

      if (token) {
        setAccessToken(token);
        await authService.logout().catch(() => null);
      }
    } finally {
      clearStoredSession();
      clearRuntimeRbacData();
      setDashboardMenus([]);
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const refreshRbac = useCallback(async () => {
    await syncRuntimeRbac();
  }, [syncRuntimeRbac]);

  const value = useMemo<AuthContextValue>(() => {
    const resolvedRole = user ? parseRole(user.role) : null;
    return {
      status,
      user,
      role: resolvedRole,
      dashboardMenus,
      refreshRbac,
      signIn,
      signOut,
    };
  }, [dashboardMenus, refreshRbac, signIn, signOut, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
