import { describe, it, expect } from 'vitest';
import { compareVersions, classifyUpdate, parseHealth } from '../../../src/main/updatePolicy';

describe('compareVersions', () => {
  it('compares numerically, not as strings', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
  });
  it('treats missing parts as zero', () => {
    expect(compareVersions('1.6', '1.6.0')).toBe(0);
  });
});

describe('classifyUpdate', () => {
  it('is minor when the backend already meets the requirement', () => {
    expect(classifyUpdate('1.6.0', '1.6.0')).toBe('minor');
    expect(classifyUpdate('1.7.2', '1.6.0')).toBe('minor');
  });
  it('is major when the backend is older than required', () => {
    expect(classifyUpdate('1.6.0', '1.7.0')).toBe('major');
  });
  it('is unverified when the backend version or requirement is unknown', () => {
    expect(classifyUpdate(undefined, '1.6.0')).toBe('unverified');
    expect(classifyUpdate('unknown', '1.6.0')).toBe('unverified');
    expect(classifyUpdate('1.6.0', undefined)).toBe('unverified');
  });
});

// ES-682: the reply captured from a real server (GET /api/v1/health). The version is inside `data`.
describe('parseHealth', () => {
  const real = {
    success: true, statusCode: 200, message: 'Operation completed successfully',
    data: { status: 'ok', version: '1.19.0', dayEndInProgress: false, timestamp: '2026-11-25T21:23:19.293Z', uptime: 532, environment: 'production' },
    timestamp: '2026-11-25T21:23:19.294Z',
  };
  it('reads the version and day-end flag from the wrapped reply', () => {
    expect(parseHealth(real)).toEqual({ version: '1.19.0', dayEndInProgress: false });
  });
  it('sees day-end running', () => {
    expect(parseHealth({ ...real, data: { ...real.data, dayEndInProgress: true } })?.dayEndInProgress).toBe(true);
  });
  it('still reads a plain reply with the fields at the top level', () => {
    expect(parseHealth({ version: '1.18.0', dayEndInProgress: false })).toEqual({ version: '1.18.0', dayEndInProgress: false });
  });
  it('gives no version for an empty or odd reply, so the update stays blocked', () => {
    expect(parseHealth(null)).toBeNull();
    expect(parseHealth('x')).toBeNull();
    expect(parseHealth({ success: true, data: {} })?.version).toBeUndefined();
  });
  it('a wrapped reply from a server that meets the requirement makes the update installable', () => {
    expect(classifyUpdate(parseHealth(real)?.version, '1.19.0')).toBe('minor');
    expect(classifyUpdate(parseHealth(real)?.version, '1.20.0')).toBe('major');
    expect(classifyUpdate(undefined, '1.19.0')).toBe('unverified');
  });
});
