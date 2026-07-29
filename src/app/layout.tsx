import "./globals.css";
import "@/components/styles/index.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppToastProvider } from "@/components/ui/AppToastProvider";
import { connection } from "next/server";
import ClientErrorMonitor from "@/components/system/ClientErrorMonitor";
import { appBrand } from "@/config/branding";

export const metadata = {
  title: `${appBrand.productName} - Sistem Manajemen Arsip Digital`,
  description: "Sistem Manajemen Arsip Digital Terpadu",
  icons: {
    icon: appBrand.ruwangLogo.src,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  return (
    <html lang="id" data-app-brand={appBrand.key}>
      <body>
        <ClientErrorMonitor />
        <AuthProvider>
          <AppToastProvider>{children}</AppToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
