import React, { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import MemberLookupDialog from './MemberLookupDialog';

interface MemberFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the chosen member when the user picks one in the lookup dialog. */
  onSelect: (member: any) => void;
  /** Called when the user presses Enter in the box. */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  /** Keep only digits while typing (member numbers are numeric). */
  digitsOnly?: boolean;
  /** F2 or a quick double space in the box opens the lookup (legacy keyboard shortcuts). */
  shortcuts?: boolean;
  /** Clicking the box opens the lookup (a legacy behavior of some windows). */
  openOnClick?: boolean;
}

/**
 * Member number box with a lookup button and the shared lookup dialog built in.
 * For windows on the shared `.app-window` styling. Windows pass `onSelect` and,
 * usually, `onSubmit`; they do not build their own dialog or search button.
 */
const MemberField: React.FC<MemberFieldProps> = ({
  value, onChange, onSelect, onSubmit, placeholder = 'Member No.', ariaLabel = 'Member number', id, disabled, digitsOnly, shortcuts, openOnClick,
}) => {
  const [open, setOpen] = useState(false);
  const lastSpace = useRef(0);

  return (
    <>
      <div className="aw-input-wrap has-action">
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="aw-input"
          onChange={e => onChange(digitsOnly ? e.target.value.replace(/[^0-9]/g, '') : e.target.value)}
          onClick={openOnClick ? () => setOpen(true) : undefined}
          onKeyDown={e => {
            if (shortcuts && e.key === 'F2') { e.preventDefault(); setOpen(true); return; }
            if (shortcuts && e.key === ' ') {
              const now = Date.now();
              if (now - lastSpace.current < 500) { e.preventDefault(); setOpen(true); return; }
              lastSpace.current = now;
            }
            if (e.key === 'Enter') onSubmit?.(value);
          }}
        />
        <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="aw-input-action"
          aria-label="Member lookup" data-tip="Member lookup" data-tip-pos="bottom-end">
          <Search size={13} />
        </button>
      </div>
      <MemberLookupDialog open={open} onClose={() => setOpen(false)} onSelect={onSelect} />
    </>
  );
};

export default MemberField;
