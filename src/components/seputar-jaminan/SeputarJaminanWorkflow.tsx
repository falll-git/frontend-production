"use client";

import { useState } from "react";
import DashboardModal from "@/components/ui/DashboardModal";
import usePageScrollLock from "@/hooks/usePageScrollLock";
import SetupRecordDetailSection from "@/components/ui/SetupRecordDetailSection";
import SetupState from "@/components/ui/SetupState";
import type { SjActionAvailability, SjProfile, SjPublicationVersion, SjSyncState } from "@/types/seputar-jaminan.types";
import { sjAction } from "./actionAvailability";
import { ATTRIBUTE_LABEL, VOCABULARY_LABEL, SjStatusBadge, SjSecondaryButton } from "./SeputarJaminanUI";

/** Bank state and transport are separate facts. Public evidence lives in Observation. */
export function SjWorkflowSummary({ state, syncState }: { state: string; syncState: SjSyncState }) {
  return <SetupRecordDetailSection title="Proses di bank" rows={[
    { label: "Pengajuan / keputusan", value: <SjStatusBadge state={state} /> },
    { label: "Pengiriman ke SJ", value: <SjStatusBadge state={syncState} kind="sync" /> },
  ]} />;
}

type ActionSubject = { lock_version: number; action_availability?: SjActionAvailability };

/** Only caller-selected, supported actions; never interpret absence as success. */
export function SjActionRequirements({ subject, actions }: {
  subject: ActionSubject;
  actions: Array<{ name: string; label: string }>;
}) {
  const checks = actions.map(action => ({ ...action, assessment: sjAction(subject, action.name) }))
    .filter(({assessment})=>!assessment.available && assessment.reason_code!=='PERMISSION_DENIED');
  if (!checks.length) return null;
  return <section aria-label="Kesiapan tindakan" className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
    <h3 className="text-sm font-semibold text-slate-900">Perlu diselesaikan</h3>
    <ul className="space-y-2 text-sm text-slate-700">
      {checks.map(({ name, label, assessment }) => <li key={name} className="min-w-0 break-words">
        <span className="font-semibold">{label}: </span>
        {assessment.available
          ? assessment.mode === "REQUEST_CONTROL" ? "Bisa diajukan ke Control." : "Bisa dilanjutkan."
          : assessment.reason || "Belum bisa dilakukan. Muat ulang untuk memeriksa alasannya."}
      </li>)}
    </ul>
  </section>;
}

type ComparisonValue = string | number | null | undefined;
export type SjVersionColumn = { id: string; number: number; values: Record<string, ComparisonValue> };

function display(value: ComparisonValue) {
  return value === null || value === undefined || value === "" ? "Belum diisi" : String(value);
}

/** Explicit field allowlist supplied by the adapter; no raw snapshot/secret rendering. */
export function SjVersionComparison({ working, approved, fields }: {
  working: SjVersionColumn | null;
  approved: SjVersionColumn | null;
  fields: Array<{ key: string; label: string; uncertain?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  usePageScrollLock(open && Boolean(working || approved));
  if (!working && !approved) return <SetupState compact title="Data versi belum tersedia" description="Muat ulang detail untuk memeriksa versi yang tersimpan." />;
  const sameVersion = working?.id === approved?.id;
  if (sameVersion) return <p className="text-sm leading-6 text-slate-600">Belum ada perubahan dari versi yang disetujui di bank.</p>;
  return <div className="min-w-0 space-y-3">
    <p className="text-sm leading-6 text-slate-600">Perubahan belum menggantikan versi yang disetujui. Versi publik ditampilkan pada hasil pengecekan.</p>
    <SjSecondaryButton onClick={() => setOpen(true)}>Bandingkan versi</SjSecondaryButton>
    <DashboardModal isOpen={open} onClose={() => setOpen(false)} title="Bandingkan versi di bank" maxWidth="4xl"
      description="Versi disetujui dan perubahan yang sedang dikerjakan. Ini bukan bukti penayangan di SJ."
      footer={<SjSecondaryButton onClick={() => setOpen(false)}>Tutup</SjSecondaryButton>}>
      <div className="min-w-0 space-y-4">
        {fields.map(field => {
          const changed = Boolean(!field.uncertain && approved && working && display(approved.values[field.key]) !== display(working.values[field.key]));
          return <SetupRecordDetailSection key={field.key} title={field.label + (changed ? " · Berbeda" : "")} rows={[
            { label: approved ? `Disetujui di bank · versi ${approved.number}` : "Disetujui di bank", value: approved ? display(approved.values[field.key]) : "Belum ada versi yang disetujui.", valueClassName: "[overflow-wrap:anywhere]" },
            { label: working ? `Sedang dikerjakan · versi ${working.number}` : "Sedang dikerjakan", value: working ? display(working.values[field.key]) : "Data versi kerja belum tersedia.", valueClassName: "[overflow-wrap:anywhere]" },
          ]} />;
        })}
      </div>
    </DashboardModal>
  </div>;
}

export function SjPublicationVersions({ working, approved }: { working: SjPublicationVersion | null; approved: SjPublicationVersion | null }) {
  const attributes = Object.keys(ATTRIBUTE_LABEL).filter(key =>
    Object.hasOwn(working?.attributes ?? {}, key) || Object.hasOwn(approved?.attributes ?? {}, key));
  function column(version: SjPublicationVersion | null): SjVersionColumn | null {
    if (!version) return null;
    return { id: version.id, number: version.version_number, values: {
      title: version.title, description: version.description,
      location: [version.city_regency, version.province].filter(Boolean).join(", "),
      contact: version.whatsapp_contact ? `${version.whatsapp_contact.label} · berakhir ${version.whatsapp_contact.phone_ending}` : null,
      photos: version.media.length,
      ...Object.fromEntries(attributes.map(key => [key, typeof version.attributes[key] === "string" ? VOCABULARY_LABEL[version.attributes[key]] ?? version.attributes[key] : version.attributes[key]])),
    } };
  }
  return <SjVersionComparison working={column(working)} approved={column(approved)} fields={[
    { key: "title", label: "Judul" }, { key: "description", label: "Deskripsi" },
    { key: "location", label: "Lokasi" }, { key: "contact", label: "Kontak WhatsApp" },
    { key: "photos", label: "Jumlah foto" }, ...attributes.map(key => ({ key, label: ATTRIBUTE_LABEL[key] })),
  ]} />;
}

export function SjProfileVersions({ profile }: { profile: SjProfile }) {
  const approved = profile.approved_version;
  const working = profile.pending_version;
  // No second version, no comparison. Approval still does not prove visibility.
  if (!approved || !working || approved.id === working.id) return null;
  const fields = [
    { key: 'public_name', label: 'Nama BPRS' }, { key: 'public_slug', label: 'Alamat profil' },
    { key: 'short_description', label: 'Deskripsi' }, { key: 'office_city_regency', label: 'Kota / kabupaten' },
    { key: 'office_province', label: 'Provinsi' }, { key: 'website_url', label: 'Website' },
  ];
  function column(version: SjProfile['approved_version']): SjVersionColumn | null {
    return version ? { id: version.id, number: version.version_number, values: Object.fromEntries(fields.map(field => [field.key,
      Object.hasOwn(version.payload, field.key) ? version.payload[field.key as keyof typeof version.payload] : 'Tidak tercatat pada versi ini.',
    ])) } : null;
  }
  const approvedColumn = column(approved)!;
  const workingColumn = column(working)!;
  const changedFields = fields.filter(field => display(approvedColumn.values[field.key]) !== display(workingColumn.values[field.key]))
    .map(field => ({ ...field, uncertain: !Object.hasOwn(approved.payload, field.key) || !Object.hasOwn(working.payload, field.key) }));
  // Bank logo IDs and SJ public marks belong to different namespaces. Compare
  // only matching keys; never claim equality by comparing unrelated identifiers.
  const logoKey = (['public_mark', 'logo_media_id'] as const).find(key => approved.payload[key] && working.payload[key]);
  if (logoKey && approved.payload[logoKey] !== working.payload[logoKey]) {
    changedFields.push({ key: 'logo', label: 'Logo', uncertain: false });
    approvedColumn.values.logo = 'Logo versi disetujui';
    workingColumn.values.logo = 'Logo pengganti';
  }
  return <div className="space-y-3">
    {changedFields.length ? <SjVersionComparison approved={approvedColumn} working={workingColumn} fields={changedFields} /> : null}
    {!logoKey ? <p className="text-sm text-slate-600">Logo kedua versi belum bisa dibandingkan dari data yang tersedia.</p> : null}
  </div>;
}
