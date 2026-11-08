import { expect, it } from 'vitest';
import { formatSjDate } from './presentation';

it('formats timestamps with timezone and handles absent/invalid values without crashing', () => {
  expect(formatSjDate('2026-09-26T12:34:00Z')).toMatch(/2026/);
  expect(formatSjDate('2026-09-26T12:34:00Z')).not.toContain('T12:34');
  expect(formatSjDate(null)).toBe('Belum tercatat');
  expect(formatSjDate('not-a-date')).toBe('Waktu belum tersedia');
});
