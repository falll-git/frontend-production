import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppToastProvider } from "@/components/ui/AppToastProvider";

export const metadata = {
  title: "Ruwang Arsip - Sistem Manajemen Arsip Digital",
  description: "Sistem Manajemen Arsip Digital Terpadu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <AppToastProvider>{children}</AppToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
