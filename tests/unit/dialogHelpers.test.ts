import { describe, it, expect, vi, beforeEach } from 'vitest';

const error = vi.fn();
vi.mock('antd', () => ({ Modal: { error: vi.fn(), warning: vi.fn(), info: vi.fn() }, message: { error: (...a: unknown[]) => error(...a) } }));

import { isFailure, toastError } from '../../src/utils/dialog';

// ES-473: a failed call is shown, never silently dropped.
describe('isFailure', () => {
  it('only an explicit success:false is a failure', () => {
    expect(isFailure({ success: false, message: 'x' })).toBe(true);
    expect(isFailure({ success: true })).toBe(false);
    expect(isFailure({ data: [] })).toBe(false);   // a bare array / object without the flag is not a failure
    expect(isFailure(null)).toBe(false);
    expect(isFailure(undefined)).toBe(false);
    expect(isFailure('oops')).toBe(false);
  });
});

describe('toastError', () => {
  beforeEach(() => error.mockClear());
  it('says what could not be done and why, in plain words', () => {
    toastError({ success: false, network: true } as any, 'load the head list unique-1');
    expect(error).toHaveBeenCalledTimes(1);
    const content = (error.mock.calls[0]![0] as { content: string }).content;
    expect(content).toMatch(/Could not load the head list unique-1/);
    expect(content).toMatch(/Cannot reach the server/);
    expect(content).not.toMatch(/Failed to fetch|HTTP \d{3}/);
  });
  it('the same action is shown once within a few seconds (a window that loads several lists does not stack toasts)', () => {
    toastError({ success: false, status: 500 } as any, 'load the member list unique-2');
    toastError({ success: false, status: 500 } as any, 'load the member list unique-2');
    expect(error).toHaveBeenCalledTimes(1);
    toastError({ success: false, status: 500 } as any, 'load another list unique-3');
    expect(error).toHaveBeenCalledTimes(2);
  });
});
