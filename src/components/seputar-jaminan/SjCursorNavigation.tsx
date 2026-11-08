"use client";
import { useState } from 'react';
import { SjSecondaryButton } from './SeputarJaminanUI';

export default function SjCursorNavigation({ label, count, cursor, next, onNavigate, busy = false }: {
  label: string; count: number; cursor: string; next: string | null; onNavigate: (cursor: string) => void; busy?: boolean;
}) {
  const [previous, setPrevious] = useState<Record<string, string>>({});
  return <nav aria-label={`Halaman ${label}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
    <p className="text-sm text-slate-600" aria-live="polite">{busy ? "Memuat halaman…" : `${count} ${label} pada halaman ini`}</p>
    <div className="flex gap-2">
      {cursor ? <SjSecondaryButton disabled={busy} onClick={() => onNavigate('')}>Kembali ke awal</SjSecondaryButton> : null}
      {cursor && Object.hasOwn(previous, cursor) ? <SjSecondaryButton disabled={busy} onClick={() => onNavigate(previous[cursor])} aria-label={`${label} sebelumnya`}>Sebelumnya</SjSecondaryButton> : null}
      <SjSecondaryButton disabled={!next || busy} onClick={() => { if (next) { setPrevious(current => ({ ...current, [next]: cursor })); onNavigate(next); } }} aria-label={`${label} berikutnya`}>Berikutnya</SjSecondaryButton>
    </div>
  </nav>;
}
