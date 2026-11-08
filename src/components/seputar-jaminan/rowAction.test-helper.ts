import { fireEvent, screen } from '@testing-library/react';

/** Exercise the real shared menu before selecting a row action. */
export async function findRowAction(name: string, trigger: RegExp = /^Aksi /) {
  fireEvent.click(await screen.findByRole('button', { name: trigger }));
  return screen.findByRole('menuitem', { name });
}
