import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiService from '../../../../services/api';

/**
 * Member Master: is this member's phone usable, and what is the member's Fibe Mobile access status (ES-389).
 * Read-only. Data comes from the Mobile Control Center API; without that window right the row says so quietly.
 * Supports fixing phone numbers at the counter (missing / invalid / shared by more than 3 members).
 */
type PhoneStatus = 'OK' | 'MISSING' | 'INVALID' | 'SHARED';
type Detail = {
  member?: { phoneStatus?: PhoneStatus; phoneSharedCount?: number };
  access?: { status?: string };
  requests?: Array<{ status?: string }>;
};

const PILL: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' };
const TONES: Record<string, { bg: string; fg: string }> = {
  good: { bg: 'rgba(34,160,90,.14)', fg: '#16794a' },
  warn: { bg: 'rgba(230,140,20,.16)', fg: '#a35f00' },
  bad: { bg: 'rgba(210,50,50,.14)', fg: '#a82525' },
  info: { bg: 'rgba(60,110,220,.14)', fg: '#2a52b0' },
  muted: { bg: 'rgba(120,130,145,.16)', fg: '#566070' },
};

export function phoneLabel(status?: PhoneStatus, shared = 0): { text: string; tone: string } {
  switch (status) {
    case 'OK': return { text: 'Phone OK', tone: 'good' };
    case 'MISSING': return { text: 'Phone missing', tone: 'bad' };
    case 'INVALID': return { text: 'Phone invalid', tone: 'bad' };
    case 'SHARED': return { text: `Phone shared by ${shared} members`, tone: 'warn' };
    default: return { text: 'Phone unknown', tone: 'muted' };
  }
}

export function accessLabel(status?: string, hasPendingRequest = false): { text: string; tone: string } {
  const s = (status ?? 'NOT_ACTIVATED').toUpperCase();
  if (s === 'ACTIVE') return { text: 'Mobile app: active', tone: 'good' };
  if (s === 'LOCKED') return { text: 'Mobile app: locked', tone: 'warn' };
  if (s === 'BLOCKED') return { text: 'Mobile app: blocked', tone: 'bad' };
  if (hasPendingRequest) return { text: 'Mobile app: request pending', tone: 'info' };
  return { text: 'Mobile app: not activated', tone: 'muted' };
}

const openControlCenter = () => {
  const api = (window as any).electronAPI;
  if (api?.openNewWindow) api.openNewWindow('/mobile-control-center');
  else window.open('#/mobile-control-center', '_blank');
};

const MobileAccessBadge: React.FC<{ memberNo: string }> = ({ memberNo }) => {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'denied' | 'unavailable'>('idle');
  const seq = useRef(0);

  useEffect(() => {
    const mbno = String(memberNo ?? '').trim();
    setDetail(null);
    if (!/^\d{1,12}$/.test(mbno)) { setState('idle'); return; }
    const mine = ++seq.current;
    setState('loading');
    apiService.get(`/admin/mobile/members/${mbno}`).then((res) => {
      if (mine !== seq.current) return; // a newer member was selected meanwhile
      if (res.success) {
        const d = (res.data?.member ? res.data : res.data?.data) as Detail | undefined;
        if (d?.member) { setDetail(d); setState('ok'); } else setState('unavailable');
      } else if (res.status === 403) setState('denied');
      else setState('unavailable');
    });
  }, [memberNo]);

  if (state === 'idle') return null;
  const wrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
  if (state === 'loading') return <div style={wrap} className="aw-meta">{t('Checking phone and mobile access...')}</div>;
  if (state === 'denied') return <div style={wrap} className="aw-meta">{t('Phone and mobile access status need the Mobile Control Center right.')}</div>;
  if (state === 'unavailable' || !detail) return <div style={wrap} className="aw-meta">{t('Phone and mobile access status could not be loaded.')}</div>;

  const phone = phoneLabel(detail.member?.phoneStatus, detail.member?.phoneSharedCount ?? 0);
  const pending = (detail.requests ?? []).some((r) => (r.status ?? '').toUpperCase() === 'NEW');
  const access = accessLabel(detail.access?.status, pending);
  const phoneText = detail.member?.phoneStatus === 'SHARED'
    ? t('Phone shared by {{n}} members', { n: detail.member?.phoneSharedCount })
    : t(phone.text);
  const pill = (text: string, tone: string, testId: string) => (
    <span data-testid={testId} style={{ ...PILL, background: TONES[tone]!.bg, color: TONES[tone]!.fg }}>{text}</span>
  );
  return (
    <div style={wrap}>
      {pill(phoneText, phone.tone, 'mm-phone-status')}
      {pill(t(access.text), access.tone, 'mm-mobile-access')}
      <a onClick={openControlCenter} style={{ cursor: 'pointer', fontSize: 12 }} role="link">{t('Open in Mobile Control Center')}</a>
    </div>
  );
};

export default MobileAccessBadge;
