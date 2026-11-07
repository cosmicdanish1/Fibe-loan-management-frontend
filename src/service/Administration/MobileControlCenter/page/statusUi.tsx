import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AccessStatus, PhoneStatus } from '../api/mobileAdminApi';

const tone = (c: string): React.CSSProperties => ({ color: c, background: `color-mix(in srgb, ${c} 12%, transparent)` });

const ACCESS_TONE: Record<AccessStatus, string> = {
  ACTIVE: 'var(--aw-success)',
  LOCKED: 'var(--aw-danger)',
  BLOCKED: 'var(--aw-danger)',
  REQUEST_PENDING: 'var(--aw-warning)',
  NOT_ACTIVATED: 'var(--aw-muted)',
  DEACTIVATED: 'var(--aw-muted)',
};

export const AccessPill: React.FC<{ status: AccessStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const label: Record<AccessStatus, string> = {
    ACTIVE: t('Active'),
    LOCKED: t('Locked'),
    BLOCKED: t('Blocked'),
    REQUEST_PENDING: t('Request pending'),
    NOT_ACTIVATED: t('Not activated'),
    DEACTIVATED: t('Deactivated'),
  };
  return <span className="aw-pill" style={tone(ACCESS_TONE[status] ?? 'var(--aw-muted)')}>{label[status] ?? status}</span>;
};

export const PhonePill: React.FC<{ status: PhoneStatus; shared?: number }> = ({ status, shared }) => {
  const { t } = useTranslation();
  const map: Record<PhoneStatus, { text: string; color: string }> = {
    OK: { text: t('Phone OK'), color: 'var(--aw-success)' },
    MISSING: { text: t('No phone'), color: 'var(--aw-danger)' },
    INVALID: { text: t('Phone invalid'), color: 'var(--aw-danger)' },
    SHARED: { text: shared ? `${t('Shared by')} ${shared}` : t('Shared phone'), color: 'var(--aw-warning)' },
  };
  const m = map[status] ?? map.OK;
  return <span className="aw-pill" style={tone(m.color)}>{m.text}</span>;
};

export const MatchChip: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className="aw-pill" style={tone(ok ? 'var(--aw-success)' : 'var(--aw-danger)')}>{ok ? '✓' : '✗'} {label}</span>
);
