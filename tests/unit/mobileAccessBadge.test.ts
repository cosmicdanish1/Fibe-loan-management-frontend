import { describe, it, expect } from 'vitest';
import { phoneLabel, accessLabel } from '../../src/service/Masters/MemberMaster/components/MobileAccessBadge';

// ES-389: Member Master shows phone quality and mobile access status.
describe('phoneLabel', () => {
  it.each([
    ['OK', 0, 'Phone OK', 'good'],
    ['MISSING', 0, 'Phone missing', 'bad'],
    ['INVALID', 0, 'Phone invalid', 'bad'],
    ['SHARED', 5, 'Phone shared by 5 members', 'warn'],
  ])('%s', (status, n, text, tone) => {
    expect(phoneLabel(status as any, n as number)).toEqual({ text, tone });
  });
  it('unknown status is shown as unknown, not as OK', () => {
    expect(phoneLabel(undefined).tone).toBe('muted');
  });
});

describe('accessLabel', () => {
  it.each([
    ['ACTIVE', false, 'Mobile app: active', 'good'],
    ['LOCKED', false, 'Mobile app: locked', 'warn'],
    ['BLOCKED', false, 'Mobile app: blocked', 'bad'],
    ['NOT_ACTIVATED', false, 'Mobile app: not activated', 'muted'],
    ['NOT_ACTIVATED', true, 'Mobile app: request pending', 'info'],
    [undefined, false, 'Mobile app: not activated', 'muted'],
  ])('%s pending=%s', (status, pending, text, tone) => {
    expect(accessLabel(status as any, pending as boolean)).toEqual({ text, tone });
  });
  it('an active member with an old pending request is still shown as active', () => {
    expect(accessLabel('ACTIVE', true).text).toBe('Mobile app: active');
  });
});
