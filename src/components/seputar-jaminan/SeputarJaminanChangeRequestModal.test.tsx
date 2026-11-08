import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SeputarJaminanChangeRequestModal from './SeputarJaminanChangeRequestModal';

const create = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/services/seputar-jaminan.service', () => ({ seputarJaminanService: { createProfileRemovalRequest: create, createContactRemovalRequest: create } }));
vi.mock('@/components/ui/AppToastProvider', () => ({ useAppToast: () => ({ showToast: toast }) }));

describe('Change request identity and safe dismissal', () => {
  beforeEach(() => { create.mockReset(); toast.mockReset(); });
  it.each(['profile', 'contact'] as const)('keeps %s request failures in the dialog without a duplicate toast', async (kind) => {
    create.mockRejectedValueOnce(new Error('Permintaan belum terkirim. Coba lagi.'));
    const close = vi.fn(), submitted = vi.fn();
    render(<SeputarJaminanChangeRequestModal open target={{ kind, id: 'target-test', label: 'Data uji', version: 4 }} actions={[kind === 'profile' ? 'HIDE_PROFILE' : 'REVOKE_CONTACT']} onClose={close} onSubmitted={submitted} />);
    const reason = screen.getByRole('textbox');
    fireEvent.change(reason, { target: { value: 'Alasan yang masih perlu diperiksa.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Permintaan belum terkirim. Coba lagi.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(reason).toHaveValue('Alasan yang masih perlu diperiksa.');
    expect(create).toHaveBeenCalledWith(...(kind === 'profile' ? [4, 'Alasan yang masih perlu diperiksa.'] : ['target-test', 4, 'Alasan yang masih perlu diperiksa.']));
    expect(toast).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(submitted).not.toHaveBeenCalled();
  });
  it('uses contact-specific wording without presenting a contact as a public page', () => {
    render(<SeputarJaminanChangeRequestModal open target={{ kind: 'contact', id: 'contact-test', label: 'Marketing cabang', version: 4 }} actions={['REVOKE_CONTACT']} onClose={vi.fn()} onSubmitted={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Ajukan pencabutan kontak' });
    expect(within(dialog).getByLabelText(/Alasan pencabutan/)).toHaveAttribute('placeholder', 'Tuliskan alasan kontak ini perlu dicabut.');
    expect(within(dialog).getByText(/Kontak yang masih dipakai publikasi harus diganti terlebih dahulu/)).toBeVisible();
    expect(within(dialog).queryByText(/website publik/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kirim permintaan' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Tulis alasan pencabutan sedikitnya 10 karakter.');
    expect(within(dialog).getByLabelText(/Alasan pencabutan/)).toHaveFocus();
  });
  it('keeps the complete long target readable separately from the concise dialog header', () => {
    const name = 'NamaBPRSPanjang'.repeat(10);
    const close = vi.fn();
    render(<SeputarJaminanChangeRequestModal open target={{ kind: 'profile', id: 'test', label: name, version: 2 }} actions={['HIDE_PROFILE']} onClose={close} onSubmitted={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Ajukan perubahan publik' });
    expect(within(dialog).getByText(name)).toBeVisible();
    expect(within(dialog).getByText('Data yang akan diubah')).toBeVisible();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  });

  it('retains the target and explanation when local reason validation fails', () => {
    render(<SeputarJaminanChangeRequestModal open target={{ kind: 'profile', id: 'test', label: 'BPRS uji', version: 2 }} actions={['HIDE_PROFILE']} onClose={vi.fn()} onSubmitted={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('sedikitnya 10 karakter');
    expect(screen.getByText('BPRS uji')).toBeVisible();
    expect(screen.getByText(/Data di bank tidak dihapus/)).toBeVisible();
    expect(screen.getByText(/profil BPRS dan aset terkait tidak ditampilkan/)).toBeVisible();
    expect(screen.getByText(/bukan penarikan atau pengarsipan aset/)).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });
});
