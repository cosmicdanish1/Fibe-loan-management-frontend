# i18n tooling

English is the source language and lives in the code. Other languages are JSON files in `src/locales/<code>.json` (English text -> translation), loaded only when picked in Settings > Language. See `src/i18n/index.ts`.

## Writing UI text

- In a component: `const { t } = useTranslation();` then `t('Save')`. With values: `t('Version {{1}}', { 1: version })`.
- Config constants outside components (menu titles, tab labels): keep the English constant and translate where it is shown: `tLabel(item.title)`.
- **Print reports, vouchers, ledgers, certificates, agreements, exports stay English.** Never use `t` there. Use `tEn` from `src/i18n` if a shared component feeds a print.
- Never translate data (member names, addresses, ledger heads).
- Write whole sentences. Do not split a sentence around a `{value}`; use a placeholder instead.

## Scripts (run from `Frontend/`)

| Command | What it does |
|---|---|
| `npm run i18n:scan` | Lists UI text still hard-coded, per file. Reports are out of scope. |
| `npm run i18n:ci` | Fails if any file has more hard-coded text than `baseline.json`. Run before merging. |
| `npm run i18n:check` | Per language: texts used in code but missing from its JSON file. |
| `node scripts/i18n/check.js --export mr` | Writes `src/locales/missing.mr.json` for a translator to fill. |
| `node scripts/i18n/convert.js src/path/File.tsx` | Wraps text already in `hi.json` with `t()`. Review the diff. Back the file up first. |
| `node scripts/i18n/scan.js --update` | Re-writes the baseline after you convert a window (counts only go down). |

## Adding a language

1. Create `src/locales/<code>.json` (copy `hi.json`, replace the values).
2. Add a loader in `LOADERS` and a row in `LANGUAGES` in `src/i18n/index.ts`.
3. Add its font if the script needs one (load it only for that language).

## Known limits

- Window titles of the OS title bar are set in the Electron main process (`src/main/main.ts`) and stay English. The in-window title bar is translated.
- `convert.js` leaves text with values mixed into a sentence (`Total: {x} paid`) alone. Rewrite those by hand.
