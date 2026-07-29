import "./globals.css";
import "@/components/styles/index.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppToastProvider } from "@/components/ui/AppToastProvider";
import { connection } from "next/server";
import ClientErrorMonitor from "@/components/system/ClientErrorMonitor";

export const metadata = {
  title: "Ruwang Arsip - Sistem Manajemen Arsip Digital",
  description: "Sistem Manajemen Arsip Digital Terpadu",
  icons: {
    icon: "/branding/logo-ruwang-arsip.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  return (
    <html lang="id">
      <body>
        <ClientErrorMonitor />
        <AuthProvider>
          <AppToastProvider>{children}</AppToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
