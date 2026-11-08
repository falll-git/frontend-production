import { useState } from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import DashboardModal from '@/components/ui/DashboardModal';
import type { SjPublicationVersion } from '@/types/seputar-jaminan.types';
import { SjActionRequirements, SjPublicationVersions, SjVersionComparison, SjWorkflowSummary } from './SeputarJaminanWorkflow';
import { SjPrimaryButton, SjSecondaryButton } from './SeputarJaminanUI';

const approved = { id: 'v1', number: 1, values: { title: 'Judul disetujui', area: 0 } };
const working = { id: 'v2', number: 2, values: { title: 'Judul perubahan '.repeat(50), area: null } };
const fields = [{ key: 'title', label: 'Judul' }, { key: 'area', label: 'Luas' }];

it('separates bank decision and delivery without claiming public availability', () => {
  render(<SjWorkflowSummary state="PUBLISHED" syncState="ACKNOWLEDGED" />);
  expect(screen.getByText('Pengajuan / keputusan')).toBeInTheDocument();
  expect(screen.getByText('Pengiriman ke SJ')).toBeInTheDocument();
  expect(screen.getByText('Diterima tujuan')).toBeInTheDocument();
  expect(screen.queryByText(/^Tayang$/)).not.toBeInTheDocument();
});

it('compares long and missing values, preserving zero and bank/public distinction', async () => {
  render(<SjVersionComparison approved={approved} working={working} fields={fields} />);
  expect(screen.getByText(/Versi publik ditampilkan pada hasil pengecekan/)).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Bandingkan versi' }));
  expect(screen.getByText('0')).toBeVisible();
  expect(screen.getByText('Belum diisi')).toBeVisible();
  expect(screen.getAllByText(/ · Berbeda$/)).toHaveLength(2);
  expect(screen.getByText(/Ini bukan bukti penayangan di SJ/)).toBeVisible();
  expect(screen.getByText(working.values.title.trim())).toBeVisible();
});

it('distinguishes missing versions from identical approved/working versions', async () => {
  const view = render(<SjVersionComparison approved={null} working={null} fields={fields} />);
  expect(screen.getByText('Data versi belum tersedia')).toBeInTheDocument();
  view.rerender(<SjVersionComparison approved={approved} working={approved} fields={fields} />);
  expect(screen.getByText(/Belum ada perubahan dari versi yang disetujui/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Bandingkan versi' })).not.toBeInTheDocument();
  expect(screen.queryByText('Berbeda')).not.toBeInTheDocument();
  view.rerender(<SjVersionComparison approved={null} working={working} fields={fields} />);
  await userEvent.click(screen.getByRole('button', { name: 'Bandingkan versi' }));
  expect(screen.getAllByText('Belum ada versi yang disetujui.')).toHaveLength(fields.length);
});

it('shows server reasons and fails closed on stale action assessment', () => {
  const subject = { lock_version: 3, action_availability: {
    scope: 'START_ACTION' as const, expected_version: 3, revalidated_on_submit: true as const,
    actions: { submit: { available: false, reason: 'Kontak belum disetujui.', reason_code: 'CONTACT_NOT_READY', mode: 'DIRECT' as const } },
  } };
  const view = render(<SjActionRequirements subject={subject} actions={[{ name: 'submit', label: 'Ajukan' }]} />);
  expect(screen.getByText(/Kontak belum disetujui/)).toBeInTheDocument();
  view.rerender(<SjActionRequirements subject={{ ...subject, lock_version: 4 }} actions={[{ name: 'submit', label: 'Ajukan' }]} />);
  expect(screen.getByText(/Muat ulang untuk memeriksa tindakan/)).toBeInTheDocument();
  expect(screen.queryByText(/Bisa dilanjutkan/)).not.toBeInTheDocument();
});

it('does not repeat an available action as an extra requirements panel', () => {
  render(<SjActionRequirements subject={{ lock_version: 0, action_availability: {
    scope: 'START_ACTION', expected_version: 0, revalidated_on_submit: true,
    actions: { unpublish: { available: true, reason: null, reason_code: null, mode: 'REQUEST_CONTROL' } },
  } }} actions={[{ name: 'unpublish', label: 'Tarik publikasi' }]} />);
  expect(screen.queryByRole('region',{name:'Kesiapan tindakan'})).not.toBeInTheDocument();
  expect(screen.queryByText('Tarik publikasi:')).not.toBeInTheDocument();
});

it('publication adapter only displays named public attributes, not internal snapshot fields', async () => {
  const version = { id: 'v1', version_number: 1, title: 'Tanah', description: '', city_regency: '', province: '', whatsapp_contact: null, media: [], attributes: { land_area_m2: 0, internal_note: 'PRIVATE_TEST_SENTINEL' } } as unknown as SjPublicationVersion;
  render(<SjPublicationVersions working={version} approved={null} />);
  await userEvent.click(screen.getByRole('button', { name: 'Bandingkan versi' }));
  expect(screen.getByText('Luas tanah (m²)')).toBeVisible();
  expect(screen.queryByText('PRIVATE_TEST_SENTINEL')).not.toBeInTheDocument();
  expect(screen.getAllByText('0')).toHaveLength(2);
});

it('loading/disabled buttons cannot trigger actions and keep accessible names', async () => {
  const action = vi.fn();
  render(<><SjPrimaryButton loading onClick={action}>Simpan</SjPrimaryButton><SjSecondaryButton disabled onClick={action}>Kirim</SjSecondaryButton></>);
  await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
  await userEvent.click(screen.getByRole('button', { name: 'Kirim' }));
  expect(action).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Simpan' })).toHaveAttribute('aria-busy', 'true');
});

it('comparison participates in shared modal focus trap and restores focus on Escape', async () => {
  function Example() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>Buka versi</button><DashboardModal isOpen={open} onClose={() => setOpen(false)} title="Perbandingan versi">
      <SjVersionComparison approved={approved} working={working} fields={fields} />
    </DashboardModal></>;
  }
  const user = userEvent.setup(); render(<Example />);
  const trigger = screen.getByRole('button', { name: 'Buka versi' });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog');
  const comparisonTrigger = within(dialog).getByRole('button', {name:'Bandingkan versi'});
  await user.click(comparisonTrigger);
  const comparison = screen.getByRole('dialog', {name:'Bandingkan versi di bank'});
  await waitFor(() => expect(comparison.contains(document.activeElement)).toBe(true));
  // The shared modal marks the background overlay inert, not its inner dialog.
  const background = dialog.closest('[data-dashboard-overlay="true"]');
  expect(background).toHaveAttribute('aria-hidden', 'true');
  expect(background).toHaveAttribute('inert');
  expect(document.documentElement.style.overflow).toBe('hidden');
  for (let i = 0; i < 8; i++) { await user.tab(); expect(comparison.contains(document.activeElement)).toBe(true); }
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog', {name:'Bandingkan versi di bank'})).not.toBeInTheDocument();
  expect(comparisonTrigger).toHaveFocus();
  for (let i = 0; i < 8; i++) { await user.tab(); expect(dialog.contains(document.activeElement)).toBe(true); }
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(document.documentElement.style.overflow).not.toBe('hidden');
});
