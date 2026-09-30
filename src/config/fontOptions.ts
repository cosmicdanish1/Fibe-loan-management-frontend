// Font choices for Settings → Font Style.
//
// Every option is a font that ships with Windows. Client PCs run on a LAN with
// no internet access, so a downloaded web font would silently fall back and the
// setting would look broken on exactly the machines that matter.
//
// The four are picked for office / financial data work, where the app shows
// dense numeric tables at small sizes:
//   - Segoe UI  the Windows system UI font, and what the app already renders as
//               today (the old hardcoded "Inter" is not bundled, so it falls
//               through to this)
//   - Calibri   the Microsoft Office default, familiar to any office user
//   - Verdana   the widest letterforms of the four; most legible when the
//               voucher and ledger grids are at 8-10px
//   - Tahoma    narrower than Verdana, so more columns fit; closest in feel to
//               the legacy society software

export interface FontOption {
  /** Stored value and what goes into the --app-font CSS variable. */
  value: string;
  /** Shown in the Settings picker. */
  label: string;
  /** One-line rationale shown under the label. */
  hint: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    value: "'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif",
    label: 'Segoe UI',
    hint: 'Windows standard',
  },
  {
    value: "Calibri, 'Segoe UI', Arial, sans-serif",
    label: 'Calibri',
    hint: 'MS Office default',
  },
  {
    value: "Verdana, Geneva, 'Segoe UI', sans-serif",
    label: 'Verdana',
    hint: 'Easiest to read',
  },
  {
    value: "Tahoma, Geneva, 'Segoe UI', sans-serif",
    label: 'Tahoma',
    hint: 'Fits more columns',
  },
];

/** Applies the chosen stack to the current window. */
export function applyAppFont(fontFamily: string): void {
  document.documentElement.style.setProperty('--app-font', fontFamily);
}
