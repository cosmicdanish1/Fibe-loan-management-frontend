import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Standard credit/debit visual cue for report screens (screen only — never in print output):
 * green up-arrow for credit (money in), red down-arrow for debit (money out).
 */
export type CrDrType = 'credit' | 'debit';

interface CrDrIndicatorProps {
  type: CrDrType;
  className?: string;
  size?: number;
}

export function CrDrIndicator({ type, className = '', size = 14 }: CrDrIndicatorProps) {
  const isCredit = type === 'credit';
  const Icon = isCredit ? ArrowUp : ArrowDown;
  const color = isCredit ? 'text-emerald-500' : 'text-rose-500';
  return (
    <Icon
      size={size}
      strokeWidth={2.75}
      aria-label={isCredit ? 'Credit' : 'Debit'}
      className={`inline-block align-middle shrink-0 ${color} ${className}`}
    />
  );
}

/** Resolve a Dr/Cr type from common backend flag shapes ('CR'/'DR', 'credit'/'debit', 'C'/'D'). */
export function resolveCrDrType(flag: string | null | undefined): CrDrType | null {
  if (!flag) return null;
  const v = flag.trim().toUpperCase();
  if (v === 'CR' || v === 'CREDIT' || v === 'C') return 'credit';
  if (v === 'DR' || v === 'DEBIT' || v === 'D') return 'debit';
  return null;
}

const TRAILING_CRDR = /(.*\S)(\s*)\b(CR|DR)\s*$/;

/**
 * For screens that render a whole legacy report as one preformatted monospace
 * string (the same string also used to build the print output): re-render it
 * line by line, colorizing/arrow-tagging only a trailing " CR"/" DR" token so
 * the plain-text `reportText`/print builder itself never has to change.
 * Use in place of `<pre>{reportText}</pre>`, keeping the same wrapping <pre>.
 */
export function renderCrDrText(text: string): React.ReactNode {
  return text.split('\n').map((line, idx) => {
    const m = line.match(TRAILING_CRDR);
    if (!m) return <React.Fragment key={idx}>{line}{'\n'}</React.Fragment>;
    const [, before, gap, tag] = m;
    const type: CrDrType = tag === 'CR' ? 'credit' : 'debit';
    return (
      <React.Fragment key={idx}>
        {before}{gap}
        <CrDrIndicator type={type} className="mr-0.5" size={10} />
        <span className={type === 'credit' ? 'text-emerald-500' : 'text-rose-500'}>{tag}</span>
        {'\n'}
      </React.Fragment>
    );
  });
}
