import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AwDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Rendered next to the title, inside the small accent tile. */
  icon?: React.ReactNode;
  /** CSS max-width of the panel, for example "24rem". Defaults to the standard wide dialog. */
  maxWidth?: string;
  /** Let the panel shrink to its content instead of filling 80% of the window height. */
  compact?: boolean;
  /** Remove the body padding, for content that draws its own (for example a lookup list). */
  flush?: boolean;
  children: React.ReactNode;
}

/**
 * Standard dialog for windows built on the shared `.app-window` styling.
 * Must be rendered inside the `.app-window` root so it picks up the theme tokens.
 * Closes on Escape and on a click outside the panel.
 */
const AwDialog: React.FC<AwDialogProps> = ({ open, title, onClose, icon, maxWidth, compact, flush, children }) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // The dialog is often opened from a side panel whose stacking context sits below
  // the page's main content, so sticky table headers would paint OVER it. Moving the
  // dialog to the .app-window root (still inside it, so the theme tokens apply) puts
  // its z-index on the same level as the whole window instead of trapping it.
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLElement | null | undefined>(undefined);
  useLayoutEffect(() => {
    if (!open) { setHost(undefined); return; }
    setHost((anchorRef.current?.closest('.app-window') as HTMLElement | null) ?? null);
  }, [open]);

  if (!open) return null;

  const style: React.CSSProperties = {};
  if (maxWidth) style.maxWidth = maxWidth;
  if (compact) { style.height = 'auto'; style.maxHeight = '90%'; }

  // First render only drops the anchor so we can find the window root
  if (host === undefined) return <span ref={anchorRef} hidden />;

  const node = (
    <div className="aw-modal-backdrop" onClick={onClose}>
      <div className="aw-modal" role="dialog" aria-modal="true" aria-label={title} style={style} onClick={e => e.stopPropagation()}>
        <div className="aw-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {icon && <span className="aw-card-icon">{icon}</span>}
            <h2 className="aw-card-title">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="aw-icon-btn" aria-label={t('Close')} data-tip={t('Close')} data-tip-pos="bottom-end">
            <X size={15} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: flush ? 0 : 'var(--aw-pad)' }}>{children}</div>
      </div>
    </div>
  );

  return (
    <>
      <span ref={anchorRef} hidden />
      {host ? createPortal(node, host) : node}
    </>
  );
};

export default AwDialog;
