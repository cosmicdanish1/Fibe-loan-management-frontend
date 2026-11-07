import { describe, it, expect, beforeEach } from 'vitest';
import i18n, { setLanguage, tEn, readStoredLanguage } from '../../../src/i18n';
import hi from '../../../src/locales/hi.json';

describe('i18n', () => {
  beforeEach(async () => {
    localStorage.clear();
    await setLanguage('en');
  });

  it('starts in English and returns the English text unchanged', () => {
    expect(i18n.language).toBe('en');
    expect(i18n.t('Change Password')).toBe('Change Password');
    expect(i18n.t('Password updated for {{name}}. New credentials are active immediately.', { name: 'ravi' }))
      .toBe('Password updated for ravi. New credentials are active immediately.');
  });

  it('loads Hindi on demand, persists it, and interpolates', async () => {
    await setLanguage('hi');
    expect(i18n.t('Change Password')).toBe(hi['Change Password']);
    expect(readStoredLanguage()).toBe('hi');
    expect(i18n.t('Password must be at least {{count}} characters long', { count: 8 })).toContain('8');
  });

  it('falls back to English for a text with no translation', async () => {
    await setLanguage('hi');
    expect(i18n.t('Some brand new untranslated text')).toBe('Some brand new untranslated text');
  });

  it('tEn stays English even when Hindi is selected', async () => {
    await setLanguage('hi');
    expect(tEn('Change Password')).toBe('Change Password');
  });

  it('ignores an unsupported saved language', async () => {
    localStorage.setItem('app.language', 'xx');
    expect(readStoredLanguage()).toBe('en');
  });
});
