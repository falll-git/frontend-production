"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserRound } from "lucide-react";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import FeatureHeader from "@/components/ui/FeatureHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { authService } from "@/services/auth.service";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#157ec3] focus:ring-2 focus:ring-[#157ec3]/20";
const PRIMARY_BUTTON =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0d5a8f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#084a76] disabled:cursor-not-allowed disabled:opacity-60";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function AccountSecurityPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { showToast } = useAppToast();
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 12) {
      showToast("Password baru minimal 12 karakter.", "warning");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("Konfirmasi password tidak sesuai.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      await authService.changePassword(passwordForm);
      showToast(
        "Password diperbarui. Seluruh sesi dicabut; silakan masuk kembali.",
        "success",
      );
      await signOut();
      router.replace("/");
    } catch (error) {
      showToast(errorMessage(error, "Password gagal diperbarui."), "error");
      setSubmitting(false);
    }
  };

  return (
    <DashboardPageShell variant="form" spacing="md">
      <FeatureHeader
        title="Profil"
        subtitle="Perbarui password akun Anda."
        icon={<UserRound className="h-6 w-6" />}
      />

      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="password-heading"
      >
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-[#0d5a8f]" aria-hidden="true" />
          <h2 id="password-heading" className="text-lg font-bold text-slate-950">
            Ganti password
          </h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Gunakan minimal 12 karakter yang mengandung huruf dan angka. Setelah
          password berubah, Anda perlu masuk kembali.
        </p>

        <form
          onSubmit={changePassword}
          className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-2"
        >
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Password saat ini
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.oldPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  oldPassword: event.target.value,
                }))
              }
              className={INPUT_CLASS}
              required
              maxLength={128}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Password baru
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
              className={INPUT_CLASS}
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Konfirmasi password baru
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              className={INPUT_CLASS}
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className={`${PRIMARY_BUTTON} sm:col-span-2 sm:justify-self-start`}
          >
            {submitting ? "Menyimpan..." : "Ganti password"}
          </button>
        </form>
      </section>
    </DashboardPageShell>
  );
}
