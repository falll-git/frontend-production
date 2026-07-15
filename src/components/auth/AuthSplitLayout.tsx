import Image from "next/image";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { TextAnimate } from "@/components/improve/TextAnimate";

type AuthSplitLayoutProps = {
  children: ReactNode;
  leftPanel?: ReactNode;
};

function DefaultAuthBrandPanel() {
  return (
    <div className="w-full max-w-[38rem] space-y-2">
      <div className="flex flex-col items-center">
        <Image
          src="/branding/logo-ruwang-arsip.png"
          alt="Logo Ruwang Arsip"
          width={1536}
          height={1024}
          priority
          unoptimized
          className="h-auto w-full object-contain"
          style={{ maxWidth: 405 }}
        />

        <div className="my-2 flex items-center justify-center">
          <X
            className="h-11 w-11 -translate-y-3 shrink-0 text-[#157ec3]"
            strokeWidth={3.4}
            aria-hidden="true"
          />
        </div>

        <Image
          src="/branding/logo-bprs-riyal-irsyadi.png"
          alt="Logo Bank Syariah Riyal Irsyadi"
          width={2465}
          height={346}
          priority
          unoptimized
          className="h-auto w-full object-contain"
          style={{ maxWidth: 520 }}
        />
      </div>

      <div className="pt-8">
        <TextAnimate
          as="h2"
          animation="slideLeft"
          by="character"
          className="text-center text-3xl font-extrabold leading-tight text-[#157ec3]"
        >
          Selamat Datang di Ruwang Arsip!
        </TextAnimate>
        <TextAnimate
          as="p"
          animation="slideLeft"
          by="character"
          delay={1.05}
          stagger={0.012}
          className="mx-auto mt-3 max-w-[32rem] text-center text-[0.9375rem] font-extrabold leading-6 text-[#157ec3]"
        >
          Sistem internal yang menghubungkan arsip, persuratan, dokumen legal,
          dan informasi pembiayaan dalam satu platform.
        </TextAnimate>
      </div>
    </div>
  );
}

export default function AuthSplitLayout({
  children,
  leftPanel,
}: AuthSplitLayoutProps) {
  return (
    <main className="m-0 flex h-screen w-full overflow-hidden p-0">
      <section className="hidden flex-1 items-center justify-center bg-white px-12 lg:flex">
        {leftPanel ?? <DefaultAuthBrandPanel />}
      </section>

      <section className="flex flex-1 items-center justify-center bg-[#157ec3] p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
