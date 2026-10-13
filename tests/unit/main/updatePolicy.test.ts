import { describe, it, expect } from 'vitest';
import { compareVersions, classifyUpdate } from '../../../src/main/updatePolicy';

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
