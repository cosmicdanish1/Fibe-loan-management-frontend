// Rules profile file (ES-540): export the Modify Business Rules screen to a JSON file, and read such a
// file back. Everything here is pure — no network, no React — so it can never change a stored rule by
// itself; the screen decides when (and whether) to save what this returns.
import { BusinessRulesData, initialData } from '../hook/useBusinessRules';

export const PROFILE_FORMAT = 'espat-business-rules';
export const PROFILE_VERSION = 1;
export const PROFILE_MAX_BYTES = 1024 * 1024; // a real profile is a few KB; anything near 1 MB is the wrong file

export interface ProfileChange {
  /** Card / group the value belongs to, as the operator knows it on the screen. */
  group: string;
  /** Field name inside that group. */
  field: string;
  from: string;
  to: string;
}

export type ProfileParseResult =
  | { ok: true; merged: BusinessRulesData; changes: ProfileChange[]; unchangedCount: number; meta: { exportedAt?: string | undefined; note?: string | undefined } }
  | { ok: false; errors: string[] };

// Section names as shown on the screen (the stored prop names do not match the card titles — see the
// mapping note in useBusinessRules.ts).
const GROUP_LABELS: Record<string, string> = {
  regularLoanEligibility: 'Regular Loan Eligibility',
  regularLoan: 'Regular Loan',
  additionalLoan: 'Emergency Loan',
  mediumTermLoan: 'Grain Loan',
  emergencyLoan: 'Loan Against RD',
  loanOnDeposit: 'Loan On Deposit',
  loanAgainstDeposits: 'Loan Against Deposits',
  others: 'Others',
  generalSettings: 'General Setting',
  fundManagement: 'Fund Management',
  earlyClosureProtection: 'Early Closure Protection',
  loanSlotDelay: 'Loan Slots',
  loanReagreement: 'Re-agreement Limits',
  loanRounding: 'Loan Rounding',
  oldEmiFlag: 'Old EMI Flag',
  memberRules: 'Member Rules',
  rdSystem: 'RD System',
};

// Fields that only accept a fixed set of words.
const ENUMS: Record<string, readonly string[]> = {
  'regularLoanEligibility.shortfallMode': ['DEDUCT', 'BLOCK', 'IGNORE'],
  'regularLoanEligibility.limitCalc': ['OUTSTANDING_PLUS_NEW', 'NEW_ONLY'],
  'loanRounding.mode': ['NONE', 'NEAREST', 'UP', 'DOWN'],
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const show = (v: unknown): string => (typeof v === 'string' ? (v === '' ? '(empty)' : v) : JSON.stringify(v));

/** Build the file text for the rules currently on screen. */
export const buildProfileFile = (rules: BusinessRulesData): string =>
  JSON.stringify(
    {
      format: PROFILE_FORMAT,
      version: PROFILE_VERSION,
      exportedAt: new Date().toISOString(),
      note: 'Business rules profile. Edit values only; do not rename keys. Keys left out are not changed on import.',
      rules,
    },
    null,
    2,
  );

/**
 * Read a profile file's text and work out what it would change. Strict on purpose: an unknown key, a
 * wrong type or a bad choice rejects the whole file with a plain message, so a half-understood file can
 * never be applied. Keys the file leaves out keep their current value.
 */
export const parseProfileFile = (text: string, current: BusinessRulesData): ProfileParseResult => {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['This is not a valid JSON file.'] };
  }
  if (!isPlainObject(doc) || doc.format !== PROFILE_FORMAT) {
    return { ok: false, errors: ['This is not a Business Rules profile file (it was not exported from this window).'] };
  }
  if (typeof doc.version !== 'number' || doc.version > PROFILE_VERSION) {
    return { ok: false, errors: [`This file is from a newer version of the profile format (${String(doc.version)}). Update the application first.`] };
  }
  if (!isPlainObject(doc.rules)) {
    return { ok: false, errors: ['The file has no "rules" section.'] };
  }

  const errors: string[] = [];
  const changes: ProfileChange[] = [];
  let unchangedCount = 0;
  const merged: Record<string, any> = {};
  const fileRules = doc.rules as Record<string, unknown>;
  const template = initialData as unknown as Record<string, Record<string, unknown>>;
  const cur = current as unknown as Record<string, Record<string, unknown>>;

  for (const group of Object.keys(fileRules)) {
    if (!(group in template)) errors.push(`Unknown section "${group}".`);
  }

  for (const group of Object.keys(template)) {
    const tplGroup = template[group] ?? {};
    const curGroup = cur[group] ?? {};
    merged[group] = { ...curGroup };
    const fileGroup = fileRules[group];
    if (fileGroup === undefined) continue; // section not in the file: leave as is
    if (!isPlainObject(fileGroup)) { errors.push(`Section "${group}" must be an object.`); continue; }

    for (const field of Object.keys(fileGroup)) {
      if (!(field in tplGroup)) errors.push(`Unknown setting "${group}.${field}".`);
    }

    for (const field of Object.keys(tplGroup)) {
      if (!(field in fileGroup)) continue; // key not in the file: leave as is
      const incoming = fileGroup[field];
      const path = `${group}.${field}`;
      const sample = tplGroup[field];
      let value: unknown = incoming;

      if (field === 'interestChart' && group === 'fundManagement') {
        if (!Array.isArray(incoming) || incoming.some(r => !isPlainObject(r)
          || typeof r.monthlyContribution !== 'number' || !Number.isFinite(r.monthlyContribution)
          || typeof r.yearlyInterest !== 'number' || !Number.isFinite(r.yearlyInterest))) {
          errors.push(`"${path}" must be a list of { monthlyContribution, yearlyInterest } numbers.`);
          continue;
        }
        value = incoming.map(r => ({ monthlyContribution: r.monthlyContribution, yearlyInterest: r.yearlyInterest }));
      } else if (typeof sample === 'number') {
        if (typeof incoming !== 'number' || !Number.isFinite(incoming)) { errors.push(`"${path}" must be a number.`); continue; }
      } else if (typeof sample === 'boolean') {
        if (typeof incoming !== 'boolean') { errors.push(`"${path}" must be true or false.`); continue; }
      } else if (typeof sample === 'string') {
        if (typeof incoming !== 'string') { errors.push(`"${path}" must be text.`); continue; }
        const allowed = ENUMS[path];
        if (allowed && !allowed.includes(incoming)) { errors.push(`"${path}" must be one of: ${allowed.join(', ')}.`); continue; }
      }

      const before = curGroup[field];
      if (JSON.stringify(before) === JSON.stringify(value)) {
        unchangedCount++;
      } else {
        changes.push({ group: GROUP_LABELS[group] || group, field, from: show(before), to: show(value) });
      }
      (merged[group] as Record<string, unknown>)[field] = value;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    merged: merged as unknown as BusinessRulesData,
    changes,
    unchangedCount,
    meta: {
      exportedAt: typeof doc.exportedAt === 'string' ? doc.exportedAt : undefined,
      note: typeof doc.note === 'string' ? doc.note : undefined,
    },
  };
};
