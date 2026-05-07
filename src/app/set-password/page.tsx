"use client";

import { Suspense } from "react";
import PasswordActionPage from "@/components/auth/PasswordActionPage";
import { authService } from "@/services/auth.service";

function SetPasswordContent() {
  return (
    <PasswordActionPage
      mode="set"
      heading="Aktivasi Akun"
      submitLabel="SIMPAN DAN AKTIFKAN AKUN"
      submittingLabel="MENYIMPAN..."
      successTitle="Akun Berhasil Diaktifkan"
      successDescription="Password Anda berhasil dibuat. Silakan masuk menggunakan akun Anda."
      invalidTitle="Link Aktivasi Tidak Valid"
      invalidDescription="Link aktivasi tidak valid atau sudah kedaluwarsa."
      verifyToken={authService.verifySetPasswordToken}
      submitPassword={authService.setPassword}
    />
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordContent />
    </Suspense>
  );
}
