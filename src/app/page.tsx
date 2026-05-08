"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { useAppToast } from "@/components/ui/AppToastProvider";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";

function humanizeLoginError(message: string): string {
  if (/activation is pending/i.test(message)) {
    return "Akun Anda belum aktif. Silakan cek email untuk membuat password pertama.";
  }

  if (/invalid username or password/i.test(message)) {
    return "Username atau password salah.";
  }

  if (/user is inactive/i.test(message)) {
    return "Akun Anda sedang tidak aktif. Silakan hubungi administrator.";
  }

  return message || "Terjadi kesalahan saat masuk. Silakan coba lagi.";
}

export default function LoginPage() {
  const router = useRouter();
  const { status, signIn } = useAuth();
  const { showToast } = useAppToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [router, status]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedUsername = username.trim();
    const isPasswordEmpty = !password.trim();

    if (!trimmedUsername && isPasswordEmpty) {
      showToast("Username dan password harap diisi.", "warning");
      return;
    }

    if (!trimmedUsername) {
      showToast("Username harap diisi.", "warning");
      return;
    }

    if (isPasswordEmpty) {
      showToast("Password harap diisi.", "warning");
      return;
    }

    setIsLoading(true);
    const result = await signIn(trimmedUsername, password, {
      remember: rememberMe,
    });
    setIsLoading(false);

    if (!result.ok) {
      showToast(humanizeLoginError(result.message), "error");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <AuthSplitLayout>
      <div className="space-y-4">
        <div className="auth-card animate-auth-in rounded-3xl px-7 py-8 sm:px-8 sm:py-9">
          <div className="relative z-10">
            <header className="mb-7">
              <div className="text-left">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  Masuk ke Ruwang Arsip
                </h1>
              </div>
            </header>

            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Username
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#157ec3]"
                    aria-hidden="true"
                  />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="auth-input"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#157ec3]"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="auth-input auth-input-with-action"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-[#157ec3] transition-colors hover:text-[#0d5a8f]"
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <UiverseCheckbox
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                  label="Ingat Saya"
                  className="auth-remember-checkbox"
                />

                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-[#157ec3] transition-colors hover:text-[#0d5a8f]"
                >
                  Lupa Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="button mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    <span>MEMPROSES...</span>
                  </>
                ) : (
                  <span>Masuk</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#157ec3]">
                &copy; 2026 RuwangArsip &middot; v1.0.0
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Belum memiliki akun?{" "}
                <span className="font-semibold text-[#157ec3]">
                  Hubungi administrator.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
