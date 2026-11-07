import React, { useEffect, useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { IssuedCode } from '../api/mobileAdminApi';

interface Props {
  title: string;
  issued: IssuedCode;
  onClose: () => void;
}

/** Shows a freshly issued activation code. The server returns it ONCE; staff read it to the member or hand over a slip. */
const IssuedCodeDialog: React.FC<Props> = ({ title, issued, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued.display);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not available: the code is on screen */ }
  };

  return (
    <div className="app-window" style={{ position: 'fixed', inset: 0, height: 'auto', minHeight: 0, background: 'transparent', zIndex: 100000 }}>
    <div className="aw-modal-backdrop" onClick={onClose}>
      <div className="aw-modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: '28rem', height: 'auto', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="aw-stack" style={{ padding: 20, gap: 12, textAlign: 'center' }}>
          <span className="aw-card-icon" style={{ width: 44, height: 44, borderRadius: 14, alignSelf: 'center' }}><KeyRound size={22} /></span>
          <h2 className="aw-card-title">{title}</h2>
          <p className="aw-meta">{issued.memberName}</p>
          <div
            aria-label={t('Activation code')}
            style={{ fontSize: 34, fontWeight: 700, letterSpacing: 6, fontFamily: 'ui-monospace, Consolas, monospace', padding: '14px 8px', border: '1px dashed var(--aw-border, #cbd5e1)', borderRadius: 12 }}
          >
            {issued.display}
          </div>
          <div className="aw-alert aw-alert-warning" role="note">
            <div>
              {t('Shown only once. Read it to the member or give a slip. It works until')} <strong>{dayjs(issued.expiresAt).format('DD MMM YYYY, HH:mm')}</strong> {t('and only once. A new code cancels this one.')}
            </div>
          </div>
          <div className="aw-btn-row">
            <button type="button" className="aw-btn aw-btn-secondary" onClick={copy}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t('Copied') : t('Copy')}
            </button>
            <button type="button" className="aw-btn aw-btn-primary" onClick={onClose}>{t('Done')}</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default IssuedCodeDialog;
