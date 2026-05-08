"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Mail } from "lucide-react";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { authService } from "@/services/auth.service";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function humanizeForgotPasswordError(message: string): string {
  if (/valid email/i.test(message)) {
    return "Masukkan alamat email yang valid.";
  }

  if (/email is required/i.test(message)) {
    return "Email harap diisi.";
  }

  return "Terjadi kesalahan saat mengirim permintaan. Silakan coba lagi.";
}

export default function ForgotPasswordPage() {
  const { showToast } = useAppToast();
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      showToast("Email harap diisi.", "warning");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      showToast("Masukkan alamat email yang valid.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword(trimmedEmail);
      setSubmittedEmail(trimmedEmail);
      setIsSuccess(true);
      showToast("Link reset password telah dikirim ke email Anda.", "success");
    } catch (error) {
      showToast(
        humanizeForgotPasswordError(
          error instanceof Error ? error.message : "",
        ),
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="auth-card animate-auth-in rounded-[28px] px-7 py-8 sm:px-8 sm:py-9">
        <div className="relative z-10">
          {!isSuccess ? (
            <>
              <header className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-slate-800">
                  Lupa Password?
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Masukkan email Anda dan kami akan mengirimkan link reset
                  password.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#157ec3]" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Masukkan email Anda"
                      className="auth-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="button"
                >
                  {isLoading ? (
                    <>
                      <span className="button-spinner" aria-hidden="true" />
                      <span>MEMPROSES...</span>
                    </>
                  ) : (
                    <span>KIRIM LINK RESET</span>
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
          ) : (
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
              <h2 className="mb-2 text-xl font-bold text-slate-800">
                Cek Email Anda
              </h2>
              <p className="text-sm text-slate-600">
                Link reset password telah dikirim ke email berikut:
              </p>
              <p className="mb-5 mt-1 text-sm font-semibold text-[#157ec3]">
                {submittedEmail}
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail(submittedEmail);
                  }}
                >
                  KIRIM ULANG EMAIL
                </button>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#157ec3] transition-colors hover:text-[#0d5a8f]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Halaman Login
                </Link>
              </div>
            </div>
          )}

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
