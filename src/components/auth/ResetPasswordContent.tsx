"use client";

import PasswordActionPage from "@/components/auth/PasswordActionPage";
import { authService } from "@/services/auth.service";

export default function ResetPasswordContent() {
  return (
    <PasswordActionPage
      mode="reset"
      heading="Reset Password"
      submitLabel="SIMPAN PASSWORD BARU"
      submittingLabel="MENYIMPAN..."
      successTitle="Password Berhasil Diperbarui"
      successDescription="Password Anda sudah diperbarui. Silakan masuk kembali."
      invalidTitle="Link Reset Tidak Valid"
      invalidDescription="Link reset password tidak valid atau sudah kedaluwarsa."
      verifyToken={authService.verifyResetPasswordToken}
      submitPassword={authService.resetPassword}
    />
  );
}
