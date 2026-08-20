import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type IncomingMailEditSectionLayoutProps = {
  identity: ReactNode;
  sender: ReactNode;
  receipt: ReactNode;
  filing: ReactNode;
  disposition: ReactNode;
  attachments: ReactNode;
};

export const INCOMING_MAIL_EDIT_SECTION_TITLES = [
  "Identitas Surat",
  "Informasi Pengirim",
  "Penerimaan",
  "Pengarsipan",
  "Disposisi",
  "Lampiran dan Informasi Tambahan",
] as const;

function IncomingMailEditSection({
  title,
  description,
  children,
  contentClassName,
}: {
  title: string;
  description: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <section className="border-t border-slate-200 py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="mb-4 min-w-0">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div
        className={cn(
          "grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default function IncomingMailEditSectionLayout({
  identity,
  sender,
  receipt,
  filing,
  disposition,
  attachments,
}: IncomingMailEditSectionLayoutProps) {
  return (
    <div data-ui="incoming-mail-edit-sections">
      <IncomingMailEditSection
        title={INCOMING_MAIL_EDIT_SECTION_TITLES[0]}
        description="Sifat, nomor, dan perihal utama surat masuk."
      >
        {identity}
      </IncomingMailEditSection>

      <IncomingMailEditSection
        title={INCOMING_MAIL_EDIT_SECTION_TITLES[1]}
        description="Nama dan alamat pihak yang mengirim surat."
      >
        {sender}
      </IncomingMailEditSection>

      <IncomingMailEditSection
        title={INCOMING_MAIL_EDIT_SECTION_TITLES[2]}
        description="Tanggal surat diterima dan dicatat oleh unit kerja."
        contentClassName="md:grid-cols-1"
      >
        {receipt}
      </IncomingMailEditSection>

      <IncomingMailEditSection
        title={INCOMING_MAIL_EDIT_SECTION_TITLES[3]}
        description="Lokasi fisik penyimpanan surat setelah diterima."
        contentClassName="md:grid-cols-1"
      >
        {filing}
      </IncomingMailEditSection>

      <IncomingMailEditSection
        title={INCOMING_MAIL_EDIT_SECTION_TITLES[4]}
        description="Tujuan disposisi awal yang telah ditetapkan saat surat dibuat."
        contentClassName="md:grid-cols-1"
      >
        {disposition}
      </IncomingMailEditSection>

      <IncomingMailEditSection
        title={INCOMING_MAIL_EDIT_SECTION_TITLES[5]}
        description="Keterangan pendukung dan file surat yang tersimpan."
        contentClassName="md:grid-cols-1"
      >
        {attachments}
      </IncomingMailEditSection>
    </div>
  );
}
