import axios from "axios";
import api from "@/lib/axios";
import type {
  ForgotPasswordResponse,
  LoginResponse,
  PasswordMutationResponse,
  PasswordTokenVerificationResponse,
  RefreshResponse,
} from "@/types/auth.types";

type PasswordTokenPayload = {
  token: string;
  password: string;
  confirmPassword: string;
};

type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const authService = {
  login: async (
    username: string,
    password: string,
    options?: { remember?: boolean },
  ): Promise<LoginResponse> => {
    const res = await api.post("/auth/login", {
      username,
      password,
      remember: Boolean(options?.remember),
    });
    return res.data;
  },
  refresh: async (options?: { remember?: boolean }): Promise<RefreshResponse> => {
    const res = await api.post("/auth/refresh", {
      remember: Boolean(options?.remember),
    });
    return res.data;
  },
  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },
  verifySetPasswordToken: async (
    token: string,
  ): Promise<PasswordTokenVerificationResponse> => {
    const res = await api.post("/auth/set-password/verify", { token });
    return res.data;
  },
  setPassword: async (
    payload: PasswordTokenPayload,
  ): Promise<PasswordMutationResponse> => {
    const res = await api.post("/auth/set-password", payload);
    return res.data;
  },
  verifyResetPasswordToken: async (
    token: string,
  ): Promise<PasswordTokenVerificationResponse> => {
    const res = await api.post("/auth/reset-password/verify", { token });
    return res.data;
  },
  resetPassword: async (
    payload: PasswordTokenPayload,
  ): Promise<PasswordMutationResponse> => {
    const res = await api.post("/auth/reset-password", payload);
    return res.data;
  },
  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await api.post("/auth/change-password", payload);
  },
  logout: async () => {
    await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
      undefined,
      {
        withCredentials: true,
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 401 || status === 403,
      },
    );
  },
};
