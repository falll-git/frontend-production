import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayoutContent from './DashboardLayoutContent';

const context = vi.hoisted(() => ({ pathname: '/dashboard/seputar-jaminan/profil', roleLabel: 'Operator' }));
vi.mock('next/navigation', () => ({ usePathname: () => context.pathname, useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ status: 'authenticated', user: { name: 'Operator uji', role_id: 'test-role' }, role: {}, signOut: vi.fn(), dashboardMenus: [] }) }));
vi.mock('@/components/ui/DocumentPreviewContext', () => ({ useDocumentPreviewContext: () => ({ isPreviewOpen: false }) }));
vi.mock('@/components/ui/AppToastProvider', () => ({ useAppToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/components/Notification', () => ({ default: () => null }));
vi.mock('@/lib/rbac', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/rbac')>(), RBAC_DENIED_MESSAGE: 'Ditolak', filterMenuTreeForRoleRead: () => [], getMenuTitleForPath: () => 'Halaman uji', getRoleLabel: () => context.roleLabel, getDashboardRouteDecision: () => ({ allowed: true }) }));

describe('Shared mobile navigation', () => {
  beforeEach(() => { sessionStorage.clear(); context.roleLabel = 'Operator'; });
  it('preserves the complete long role and wraps unbroken labels inside the account column', () => {
    context.roleLabel = 'SJ browserMaker 5c94ac3e972acbee66a8865dd6d639d4';
    render(<DashboardLayoutContent><button>Kontrol halaman</button></DashboardLayoutContent>);
    fireEvent.click(screen.getByRole('button', { name: 'Buka menu' }));
    const label = screen.getByText(context.roleLabel);
    expect(label).toHaveClass('[overflow-wrap:anywhere]');
    expect(label.parentElement).toHaveClass('min-w-0');
    expect(label.closest('a')).toHaveAttribute('href', '/dashboard/account/security');
    expect(screen.getByRole('button', { name: 'Logout' })).toBeEnabled();
  });
  for (const route of ['/dashboard/seputar-jaminan/profil', '/dashboard/arsip']) {
    it(`contains focus, closes with Escape and restores focus on ${route}`, async () => {
      context.pathname = route;
      render(<DashboardLayoutContent><button>Kontrol halaman</button></DashboardLayoutContent>);
      const trigger = screen.getByRole('button', { name: 'Buka menu' });
      trigger.focus();fireEvent.click(trigger);
      const dialog = screen.getByRole('dialog', { name: 'Menu navigasi' });
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      expect(document.body.style.overflow).toBe('hidden');
      expect(screen.queryByRole('button', { name: 'Kontrol halaman' })).not.toBeInTheDocument();
      fireEvent.keyDown(dialog, { key: 'Escape' });
      await waitFor(() => expect(trigger).toHaveFocus());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Kontrol halaman' })).toBeVisible();
      expect(document.body.style.overflow).not.toBe('hidden');
    });
  }
});
