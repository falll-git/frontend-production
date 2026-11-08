import { describe, expect, it } from 'vitest';
import { sjAction, sjActionButton } from './actionAvailability';

describe('server action assessment', () => {
  const record = { lock_version: 3, action_availability: {
    scope: 'START_ACTION' as const, expected_version: 3, revalidated_on_submit: true as const,
    actions: { submit: { available: true, reason: null, reason_code: null, mode: 'DIRECT' as const } },
  } };
  it('does not enable missing or stale assessments', () => {
    for (const subject of [null, {lock_version: 3}, {...record, lock_version: 4}]) {
      expect(sjActionButton(subject, 'submit').disabled).toBe(true);
    }
    expect(sjAction(record, 'unknown').available).toBe(false);
  });
  it('uses the matching server decision and does not turn rejection into availability', () => {
    expect(sjActionButton(record, 'submit').disabled).toBe(false);
    const blocked = {...record, action_availability: {...record.action_availability, actions: {
      submit: { available: false, reason: 'Tunggu logo selesai dikirim.', reason_code: 'LOGO_NOT_READY', mode: 'DIRECT' as const },
    }}};
    expect(sjActionButton(blocked, 'submit')).toEqual({disabled: true, title: 'Tunggu logo selesai dikirim.'});
  });
});
