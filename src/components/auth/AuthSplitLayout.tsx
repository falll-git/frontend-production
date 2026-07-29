import Image from "next/image";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { TextAnimate } from "@/components/improve/TextAnimate";
import { appBrand, type BrandLogoAsset } from "@/config/branding";

type AuthSplitLayoutProps = {
  children: ReactNode;
  leftPanel?: ReactNode;
};

function CroppedBrandLogo({
  logo,
  maxWidth,
  priority = false,
  testId,
}: {
  logo: BrandLogoAsset;
  maxWidth: number;
  priority?: boolean;
  testId: string;
}) {
  const { contentBox } = logo;
  const imageWidthPercent = (logo.sourceWidth / contentBox.width) * 100;
  const imageHeightPercent = (logo.sourceHeight / contentBox.height) * 100;
  const imageLeftPercent = -(contentBox.x / contentBox.width) * 100;
  const imageTopPercent = -(contentBox.y / contentBox.height) * 100;

  return (
    <div
      data-testid={testId}
      className="relative mx-auto w-full shrink-0 overflow-hidden"
      style={{
        maxWidth,
        aspectRatio: `${contentBox.width} / ${contentBox.height}`,
      }}
    >
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.sourceWidth}
        height={logo.sourceHeight}
        priority={priority}
        unoptimized
        className="absolute max-w-none object-contain"
        style={{
          width: `${imageWidthPercent}%`,
          height: `${imageHeightPercent}%`,
          left: `${imageLeftPercent}%`,
          top: `${imageTopPercent}%`,
        }}
      />
    </div>
  );
}

function DefaultAuthBrandPanel() {
  const partnerLogo = appBrand.partnerLogo;

  return (
    <div
      className="w-full max-w-[38rem] space-y-2"
      data-brand-key={appBrand.key}
    >
      <div className="flex flex-col items-center justify-center">
        <CroppedBrandLogo
          logo={appBrand.ruwangLogo}
          maxWidth={appBrand.authLogoLayout.ruwangMaxWidth}
          priority
          testId="ruwang-brand-logo"
        />

        {partnerLogo && appBrand.authLogoLayout.partnerMaxWidth ? (
          <>
            <div className="my-2.5 flex items-center justify-center">
              <X
                className="shrink-0 text-[#157ec3]"
                style={{
                  width: appBrand.authLogoLayout.separatorSize,
                  height: appBrand.authLogoLayout.separatorSize,
                }}
                strokeWidth={3.4}
                aria-hidden="true"
              />
            </div>

            <CroppedBrandLogo
              logo={partnerLogo}
              maxWidth={appBrand.authLogoLayout.partnerMaxWidth}
              priority
              testId="partner-brand-logo"
            />
          </>
        ) : null}
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
    <main
      className="m-0 flex h-screen w-full overflow-hidden p-0"
      data-app-brand={appBrand.key}
    >
      <section className="hidden flex-1 items-center justify-center bg-white px-12 lg:flex">
        {leftPanel ?? <DefaultAuthBrandPanel />}
      </section>

      <section className="flex flex-1 items-center justify-center bg-[#157ec3] p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
