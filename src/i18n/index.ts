// UI language support.
//
// English is the source language and lives in the code itself: every text is the
// English sentence, passed to t('...'). Nothing is bundled for English.
// Other languages are separate JSON files (src/locales/<code>.json, English text
// -> translated text) and are fetched only when the user picks them in Settings.
// A text with no translation falls back to the English original.
//
// Print reports, vouchers, ledgers, certificates, agreements and exports must
// always stay English: use `tEn` (never `t`) anywhere that feeds them.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import './i18n.css';

export interface LanguageOption {
  code: string;
  /** Name in English. */
  name: string;
  /** Name in its own script, shown in the picker. */
  nativeName: string;
  /** Right-to-left script (Urdu): the whole window mirrors. */
  rtl?: boolean;
}

// Add a language: drop src/locales/<code>.json, add one loader and one row here.
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hne', name: 'Chhattisgarhi', nativeName: 'छत्तीसगढ़ी' },
];

const LOADERS: Record<string, () => Promise<{ default: Record<string, string> }>> = {
  hi: () => import('../locales/hi.json'),
  mr: () => import('../locales/mr.json'),
  hne: () => import('../locales/hne.json'),
  te: () => import('../locales/te.json'),
  or: () => import('../locales/or.json'),
  gu: () => import('../locales/gu.json'),
  kn: () => import('../locales/kn.json'),
  bn: () => import('../locales/bn.json'),
  ta: () => import('../locales/ta.json'),
  ml: () => import('../locales/ml.json'),
  pa: () => import('../locales/pa.json'),
  sa: () => import('../locales/sa.json'),
  ur: () => import('../locales/ur.json'),
};

export const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'app.language';

const isSupported = (code: string | null | undefined): code is string =>
  !!code && LANGUAGES.some(l => l.code === code);

export const readStoredLanguage = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isSupported(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

i18n.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  // The key is a whole English sentence: no namespace or key separators.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  resources: {},
  react: { useSuspense: false },
});

/** Load (if needed) and switch to a language, without saving it. */
const applyLanguage = async (code: string): Promise<void> => {
  const target = isSupported(code) ? code : DEFAULT_LANGUAGE;
  const loader = LOADERS[target];
  if (loader && !i18n.hasResourceBundle(target, 'translation')) {
    try {
      const mod = await loader();
      i18n.addResourceBundle(target, 'translation', mod.default, true, true);
    } catch (err) {
      console.error(`Could not load language "${target}", staying on English`, err);
      await i18n.changeLanguage(DEFAULT_LANGUAGE);
      return;
    }
  }
  await i18n.changeLanguage(target);
  document.documentElement.lang = target;
  document.documentElement.dir = LANGUAGES.find(l => l.code === target)?.rtl ? 'rtl' : 'ltr';
};

/** Switch language and remember the choice for next time. */
export const setLanguage = async (code: string): Promise<void> => {
  await applyLanguage(code);
  try {
    localStorage.setItem(STORAGE_KEY, i18n.language);
  } catch { /* storage unavailable: choice just won't persist */ }
};

// Apply the saved choice at start-up. English needs no loading, so a first
// launch (nothing saved) never touches a translation file.
const startup = readStoredLanguage();

/**
 * Resolves once the saved language is loaded. main.tsx waits for it before the
 * app code is imported, so labels fixed at import time (menus, table headers
 * kept in constants) already come out in the chosen language.
 */
export const languageReady: Promise<void> =
  startup !== DEFAULT_LANGUAGE ? applyLanguage(startup) : Promise.resolve();

// Every window is its own renderer: follow a change made in another window.
window.addEventListener('storage', e => {
  if (e.key === STORAGE_KEY) void applyLanguage(readStoredLanguage());
});

/**
 * Translate a label that may carry list numbering ("4.1 Print Vouchers").
 * The number stays, only the words are translated. Use for config-driven
 * labels (menus, tabs) that are English constants outside any component.
 */
export const tLabel = (text: string, options?: Record<string, unknown>): string => {
  const m = text.match(/^(\d+(?:\.\d+)*\.?\s+)(.*)$/);
  const opts = options ?? {};
  return m ? `${m[1]}${i18n.t(m[2] ?? '', opts)}` : i18n.t(text, opts);
};

/** Always-English translator, for print, reports and transaction output. */
export const tEn = i18n.getFixedT(DEFAULT_LANGUAGE);

export default i18n;
