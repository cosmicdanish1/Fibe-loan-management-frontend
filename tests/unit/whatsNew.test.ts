import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import {
  compareVersions, isUpgrade, RELEASES, selectLatest, selectUnseen, type Release,
} from '../../src/features/onboarding/whatsNew/whatsNew';

const r = (version: string): Release => ({ version, new: [`note ${version}`] });
const history = [r('1.6.0'), r('1.8.0'), r('1.7.0'), r('1.10.0'), r('1.9.0')];

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('1.8.0', '1.8.0')).toBe(0);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.7.9', '1.8.0')).toBe(-1);
  });
});

describe('selectUnseen', () => {
  it('shows only releases newer than the last seen one, newest first', () => {
    expect(selectUnseen(history, '1.9.0', '1.7.0').map((x) => x.version)).toEqual(['1.9.0', '1.8.0']);
  });

  it('never shows a release newer than the running version', () => {
    expect(selectUnseen(history, '1.8.0', '1.6.0').map((x) => x.version)).toEqual(['1.8.0', '1.7.0']);
  });

  it('shows nothing when the person is up to date', () => {
    expect(selectUnseen(history, '1.8.0', '1.8.0')).toEqual([]);
    expect(selectUnseen(history, '1.7.0', '1.8.0')).toEqual([]); // a downgrade
  });

  it('shows only the newest release when nothing was ever recorded', () => {
    expect(selectUnseen(history, '1.9.0', null).map((x) => x.version)).toEqual(['1.9.0']);
  });

  it('caps how many releases are shown at once', () => {
    const many = ['1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.5.0', '1.6.0'].map(r);
    expect(selectUnseen(many, '1.6.0', '1.0.0')).toHaveLength(4);
  });

  it('shows nothing when the running version has no notes and nothing newer than last seen exists', () => {
    expect(selectUnseen([r('1.6.0')], '1.8.0', '1.6.0')).toEqual([]);
  });
});

describe('selectLatest and isUpgrade', () => {
  it('returns the latest releases up to the running version', () => {
    expect(selectLatest(history, '1.9.0', 2).map((x) => x.version)).toEqual(['1.9.0', '1.8.0']);
  });

  it('detects an upgrade, including the first time a version is recorded', () => {
    expect(isUpgrade('1.9.0', '1.8.0')).toBe(true);
    expect(isUpgrade('1.9.0', null)).toBe(true);
    expect(isUpgrade('1.9.0', '1.9.0')).toBe(false);
  });
});

describe('release notes file', () => {
  it('has an entry for the version in package.json, so a release can never ship without notes', () => {
    const entry = RELEASES.find((x) => x.version === pkg.version);
    expect(entry, `Add a ${pkg.version} entry to src/features/onboarding/whatsNew/releaseNotes.json`).toBeDefined();
    const items = [...(entry?.new ?? []), ...(entry?.improved ?? []), ...(entry?.fixed ?? [])];
    expect(items.length).toBeGreaterThan(0);
  });
});
