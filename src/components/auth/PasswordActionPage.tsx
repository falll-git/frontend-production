"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { useAppToast } from "@/components/ui/AppToastProvider";
import type {
  PasswordMutationResponse,
  PasswordTokenVerificationResponse,
} from "@/types/auth.types";

type PasswordActionMode = "set" | "reset";

type PasswordActionPageProps = {
  mode: PasswordActionMode;
  heading: string;
  submitLabel: string;
  submittingLabel: string;
  successTitle: string;
  successDescription: string;
  invalidTitle: string;
  invalidDescription: string;
  verifyToken: (token: string) => Promise<PasswordTokenVerificationResponse>;
  submitPassword: (payload: {
    token: string;
    password: string;
    confirmPassword: string;
  }) => Promise<PasswordMutationResponse>;
};

type PageState = "verifying" | "ready" | "invalid" | "success";

const PASSWORD_REQUIREMENT_MESSAGE =
  "Password minimal 8 karakter serta wajib mengandung huruf dan angka.";
const PASSWORD_MAX_LENGTH_MESSAGE = "Password maksimal 128 karakter.";

function isPasswordRequirementValid(value: string): boolean {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function buildUsedMessage(mode: PasswordActionMode): string {
  return mode === "set"
    ? "Link aktivasi ini sudah pernah digunakan."
    : "Link reset password ini sudah pernah digunakan.";
}

function buildFallbackInvalidMessage(mode: PasswordActionMode): string {
  return mode === "set"
    ? "Link aktivasi tidak dapat diverifikasi saat ini. Silakan minta undangan baru ke admin."
    : "Link reset password tidak dapat diverifikasi saat ini. Silakan minta link reset baru.";
}

function humanizeVerifyError(
  mode: PasswordActionMode,
  message: string,
  invalidDescription: string,
): string {
  if (/already been completed/i.test(message)) {
    return buildUsedMessage(mode);
  }

  if (/invalid|expired/i.test(message)) {
    return invalidDescription;
  }

  return buildFallbackInvalidMessage(mode);
}

function humanizeSubmitError(
  mode: PasswordActionMode,
  message: string,
  invalidDescription: string,
): string {
  if (/confirmation/i.test(message) || /does not match/i.test(message)) {
    return "Konfirmasi password tidak sesuai.";
  }

  if (/maximal 128|maksimal 128|max.*128/i.test(message)) {
    return PASSWORD_MAX_LENGTH_MESSAGE;
  }

  if (
    /at least 8|minimal 8|huruf dan angka|letter.*number|wajib mengandung/i.test(
      message,
    )
  ) {
    return PASSWORD_REQUIREMENT_MESSAGE;
  }

  if (/already been completed/i.test(message)) {
    return buildUsedMessage(mode);
  }

  if (/invalid|expired/i.test(message)) {
    return invalidDescription;
  }

  return "Terjadi kesalahan saat memproses password. Silakan coba lagi.";
}

export default function PasswordActionPage({
  mode,
  heading,
  submitLabel,
  submittingLabel,
  successTitle,
  successDescription,
  invalidTitle,
  invalidDescription,
  verifyToken,
  submitPassword,
}: PasswordActionPageProps) {
  const searchParams = useSearchParams();
  const { showToast } = useAppToast();
  const token = searchParams.get("token")?.trim() ?? "";

  const [pageState, setPageState] = useState<PageState>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!token) {
        setFeedbackMessage(invalidDescription);
        setPageState("invalid");
        return;
      }

      setPageState("verifying");
      setFeedbackMessage("");

      try {
        await verifyToken(token);
        if (cancelled) return;

        setPageState("ready");
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error ? error.message : invalidDescription;
        setFeedbackMessage(
          humanizeVerifyError(mode, message, invalidDescription),
        );
        setPageState("invalid");
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [invalidDescription, mode, token, verifyToken]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedPassword && !trimmedConfirmPassword) {
      showToast("Password baru dan konfirmasi password harap diisi.", "warning");
      return;
    }

    if (!trimmedPassword) {
      showToast("Password baru harap diisi.", "warning");
      return;
    }

    if (!trimmedConfirmPassword) {
      showToast("Konfirmasi password harap diisi.", "warning");
      return;
    }

    if (password.length > 128) {
      showToast(PASSWORD_MAX_LENGTH_MESSAGE, "warning");
      return;
    }

    if (!isPasswordRequirementValid(password)) {
      showToast(PASSWORD_REQUIREMENT_MESSAGE, "warning");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Konfirmasi password tidak sesuai.", "warning");
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage("");

    try {
      await submitPassword({
        token,
        password,
        confirmPassword,
      });
      setPageState("success");
      showToast(successTitle, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan pada server";
      showToast(humanizeSubmitError(mode, message, invalidDescription), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="auth-card animate-auth-in rounded-[28px] px-7 py-8 sm:px-8 sm:py-9">
        <div className="relative z-10">
          {pageState === "verifying" ? (
            <div className="py-8 text-center">
              <div
                className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(21, 126, 195, 0.18) 0%, rgba(21, 126, 195, 0.1) 100%)",
                }}
              >
                <span
                  className="button-spinner"
                  aria-hidden="true"
                  style={{
                    ["--spinner-track" as string]: "rgba(21, 126, 195, 0.16)",
                    ["--spinner-head" as string]: "#157ec3",
                  }}
                />
              </div>
              <p className="mt-3 text-base font-semibold text-slate-800">
                Memverifikasi link...
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Tunggu sebentar, kami sedang memeriksa link yang Anda buka.
              </p>
            </div>
          ) : null}

          {pageState === "invalid" ? (
            <div className="py-3 text-center">
              <div
                className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 45%, #b45309 100%)",
                  boxShadow: "0 12px 28px rgba(180, 83, 9, 0.26)",
                }}
              >
                <ShieldAlert className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-800">
                {invalidTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {feedbackMessage || invalidDescription}
              </p>

              <div className="mt-6 space-y-3">
                <Link href="/" className="button">
                  <ArrowLeft className="h-5 w-5" />
                  <span>KEMBALI KE LOGIN</span>
                </Link>

                {mode === "reset" ? (
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#157ec3] transition-colors hover:text-[#0d5a8f]"
                  >
                    Minta Link Reset Baru
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {pageState === "success" ? (
            <div className="py-3 text-center">
              <div
                className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, #34d399 0%, #10b981 45%, #059669 100%)",
                  boxShadow: "0 12px 28px rgba(16, 185, 129, 0.32)",
                }}
              >
                <Check className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-800">
                {successTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {successDescription}
              </p>

              <div className="mt-6">
                <Link href="/" className="button">
                  <span>KE HALAMAN LOGIN</span>
                </Link>
              </div>
            </div>
          ) : null}

          {pageState === "ready" ? (
            <>
              <header className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-slate-800">
                  {heading}
                </h2>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor={`${mode}-password`}
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#157ec3]" />
                    <input
                      id={`${mode}-password`}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (feedbackMessage) setFeedbackMessage("");
                      }}
                      placeholder="Masukkan password baru"
                      className="auth-input auth-input-with-action"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-[#157ec3] transition-colors hover:text-[#0d5a8f]"
                      aria-label={
                        showPassword ? "Sembunyikan password" : "Tampilkan password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`${mode}-confirm-password`}
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#157ec3]" />
                    <input
                      id={`${mode}-confirm-password`}
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        if (feedbackMessage) setFeedbackMessage("");
                      }}
                      placeholder="Ulangi password baru"
                      className="auth-input auth-input-with-action"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-[#157ec3] transition-colors hover:text-[#0d5a8f]"
                      aria-label={
                        showConfirmPassword
                          ? "Sembunyikan konfirmasi password"
                          : "Tampilkan konfirmasi password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="button-spinner" aria-hidden="true" />
                      <span>{submittingLabel}</span>
                    </>
                  ) : (
                    <span>{submitLabel}</span>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#157ec3] transition-colors hover:text-[#0d5a8f]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Halaman Login
                </Link>
              </div>
            </>
          ) : null}

          <div className="mt-6 text-center">
            <p className="text-sm text-[#157ec3]">
              &copy; 2026 RuwangArsip &middot; v1.0.0
            </p>
          </div>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
