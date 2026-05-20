"use client";

import { Suspense } from "react";
import SetPasswordContent from "@/components/auth/SetPasswordContent";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordContent />
    </Suspense>
  );
}
