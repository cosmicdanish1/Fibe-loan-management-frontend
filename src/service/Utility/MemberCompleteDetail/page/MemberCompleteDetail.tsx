import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, X, Search, RefreshCw, Printer, Download, Database, FileText } from 'lucide-react';
import { API_ROUTES, getApiBaseUrl } from '../../../../services/apiVersionConfig';
import { useTranslation } from 'react-i18next';

/**
 * Member Complete Detail (ES-550): read-only 360 degree view of one member.
 * Every column the backend returns is shown, so nothing held for the member is hidden by a hand-written field list.
 */

type Row = Record<string, any>;
type Block = { title: string; kind: 'kv' | 'table'; data: Row | Row[] | null | undefined };
type Section = { id: string; label: string; blocks: (d: any) => Block[] };

const PERSONAL_KEYS = ['mbno', 'prefix', 'f_name', 'm_name', 'l_name', 'full_name', 'fathers_name', 'sex', 'age', 'dob', 'aadharno', 'pan_no', 'phoneno', 'email', 'present_address', 'permanent_address', 'cast_category', 'isactive', 'flg_retire', 'cbsac', 'pfno', 'lfno', 'frs_no', 'hasSignature', 'hasPhoto', 'hasDocFront', 'hasDocBack'];
const NOMINEE_KEYS = ['nominee_name', 'nominee_address', 'nominee_relation'];

const pick = (o: Row | null | undefined, keys: string[]) => {
  const r: Row = {};
  if (!o) return r;
  keys.forEach(k => { if (k in o) r[k] = o[k]; });
  return r;
};
const omit = (o: Row | null | undefined, keys: string[]) => {
  const r: Row = {};
  if (!o) return r;
  Object.keys(o).forEach(k => { if (!keys.includes(k)) r[k] = o[k]; });
  return r;
};

const SECTIONS: Section[] = [
  { id: 'summary', label: 'Balance Summary', blocks: d => [
    { title: 'Member balances', kind: 'kv', data: d.balances },
    { title: 'Funds (opening and current)', kind: 'kv', data: d.funds },
    { title: 'FRS balance', kind: 'kv', data: d.frs?.balance },
  ] },
  { id: 'personal', label: 'Personal', blocks: d => [
    { title: 'Personal details', kind: 'kv', data: pick(d.personal, PERSONAL_KEYS) },
    { title: 'Category', kind: 'table', data: d.category },
    { title: 'Status history', kind: 'table', data: d.status },
    { title: 'Documents on file', kind: 'table', data: d.documents },
    { title: 'Mobile app account', kind: 'kv', data: d.mobile },
  ] },
  { id: 'service', label: 'Service', blocks: d => [
    { title: 'Service and salary details', kind: 'kv', data: omit(d.personal, [...PERSONAL_KEYS, ...NOMINEE_KEYS]) },
  ] },
  { id: 'nominee', label: 'Nominees', blocks: d => [
    { title: 'Member nominee', kind: 'kv', data: d.nominee?.member },
    { title: 'FD nominees', kind: 'table', data: d.nominee?.fd },
    { title: 'Joint holders', kind: 'table', data: d.nominee?.joint },
  ] },
  { id: 'share', label: 'Share', blocks: d => [
    { title: 'Month-end share snapshots', kind: 'table', data: d.share?.snapshots },
  ] },
  { id: 'cdmd', label: 'CD / MD', blocks: d => [
    { title: 'CD and MD / MD1-MD5 balances', kind: 'kv', data: d.funds },
    { title: 'Monthly demand (last 24)', kind: 'table', data: d.demand },
  ] },
  { id: 'frs', label: 'FRS', blocks: d => [
    { title: 'FRS summary: FRS1 (MD) + FRS2 (MD1)', kind: 'table', data: d.frs?.summary },
    { title: 'FRS monthly demand', kind: 'table', data: d.frs?.demand },
    { title: 'FRS ledger entries (MD and MD1)', kind: 'table', data: d.frs?.ledger },
    { title: 'FRS opening figures (frs table)', kind: 'table', data: d.frs?.rows },
    { title: 'FRS balance (frs_balance table)', kind: 'kv', data: d.frs?.balance },
  ] },
  { id: 'loans', label: 'Loans', blocks: d => [
    { title: 'Loans (loan master)', kind: 'table', data: d.loans?.master },
    { title: 'Applied / pending loans', kind: 'table', data: d.loans?.pending },
    { title: 'Repayment history', kind: 'table', data: d.loans?.repayments },
    { title: 'Surety (given and taken)', kind: 'table', data: d.loans?.surety },
    { title: 'RD lien', kind: 'table', data: d.loans?.rdLien },
    { title: 'Re-agreements', kind: 'table', data: d.loans?.reagreements },
    { title: 'Payment flags', kind: 'table', data: d.loans?.flags },
  ] },
  { id: 'rd', label: 'RD', blocks: d => [
    { title: 'RD accounts', kind: 'table', data: d.rd?.accounts },
    { title: 'Monthly RD amount', kind: 'table', data: d.rd?.config },
    { title: 'RD instalments', kind: 'table', data: d.rd?.instalments },
    { title: 'RD financial-year summary', kind: 'table', data: d.rd?.yearSummary },
  ] },
  { id: 'fd', label: 'FD', blocks: d => [{ title: 'FD accounts', kind: 'table', data: d.fd?.accounts }] },
  { id: 'sb', label: 'Savings (SB)', blocks: d => [{ title: 'Savings account', kind: 'table', data: d.sb }] },
  { id: 'other', label: 'Dividend & Insurance', blocks: d => [
    { title: 'Dividend by year', kind: 'table', data: d.dividend },
    { title: 'Group insurance charges', kind: 'table', data: d.insurance },
  ] },
  { id: 'ledger', label: 'Ledger', blocks: d => [{ title: 'Ledger entries', kind: 'table', data: d.ledger }] },
];

const prettify = (k: string) => k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase());
const MONEY = /(amt|amount|bal|balance|pay|salary|deposit|share|principal|interest|fund|credit|debit|charge|lien|surplus)/i;

const fmt = (key: string, v: any): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const dt = new Date(v);
    if (!isNaN(dt.getTime())) {
      const p = (n: number) => String(n).padStart(2, '0');
      const hasTime = !/T00:00:00(\.000)?Z?$/.test(v);
      return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}${hasTime ? ` ${p(dt.getHours())}:${p(dt.getMinutes())}` : ''}`;
    }
  }
  if (typeof v === 'object') return JSON.stringify(v);
  const n = Number(v);
  if (MONEY.test(key) && v !== '' && !isNaN(n) && !/(no|code|rate|pct|id)$/i.test(key)) {
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(v);
};

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

const MemberCompleteDetail: React.FC = () => {
  const { t } = useTranslation();
  const [memberNumber, setMemberNumber] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState('summary');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [lastSpace, setLastSpace] = useState(0);

  const openLookup = useCallback(() => {
    if (window.electronAPI?.openNewWindow) window.electronAPI.openNewWindow('/common/member-lookup');
  }, []);

  const load = useCallback(async (mbNo?: string) => {
    const no = (mbNo || memberNumber).trim();
    if (!no) { setError('Please enter a member number'); return; }
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const qs = new URLSearchParams();
      if (fromDate) qs.set('fromDate', fromDate);
      if (toDate) qs.set('toDate', toDate);
      const url = `${await getApiBaseUrl()}${API_ROUTES.members.completeDetail(no)}${qs.toString() ? `?${qs}` : ''}`;
      const res = await fetch(url, { headers: { ...(token && { Authorization: `Bearer ${token}` }), 'Content-Type': 'application/json' } });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}: ${res.statusText}`);
      let d = body?.data ?? body;
      if (d && d.data && d.memberNo === undefined) d = d.data;
      setData(d);
    } catch (e: any) {
      setData(null); setError(e.message || 'Failed to load member');
    } finally { setLoading(false); }
  }, [memberNumber, fromDate, toDate]);

  useEffect(() => {
    if (window.electronAPI) {
      const handler = (_: any, d: any) => { setMemberNumber(String(d.memberNo)); load(String(d.memberNo)); };
      window.electronAPI.ipcRenderer?.on('member-selected', handler);
      return () => { window.electronAPI.ipcRenderer?.removeListener?.('member-selected', handler); };
    }
  }, [load]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    if (e.key === ' ') {
      if (now - lastSpace < 500) { e.preventDefault(); openLookup(); setLastSpace(0); } else setLastSpace(now);
    } else if (e.key === 'Enter') load();
  };

  const reset = () => { setMemberNumber(''); setData(null); setError(null); setSection('summary'); };

  const current = SECTIONS.find(s => s.id === section) ?? SECTIONS[0]!;
  const blocks = useMemo(() => (data ? current.blocks(data) : []), [data, current]);
  const count = (s: Section) => data ? s.blocks(data).reduce((n, b) => n + (Array.isArray(b.data) ? b.data.length : b.data && Object.keys(b.data).length ? 1 : 0), 0) : 0;

  const exportCsv = () => {
    if (!data) return;
    const lines: string[] = [];
    blocks.forEach(b => {
      lines.push(csvCell(b.title));
      if (b.kind === 'kv' && b.data && !Array.isArray(b.data)) {
        Object.entries(b.data).forEach(([k, v]) => lines.push(`${csvCell(prettify(k))},${csvCell(fmt(k, v))}`));
      } else if (Array.isArray(b.data) && b.data.length) {
        const cols = Object.keys(b.data[0]);
        lines.push(cols.map(c => csvCell(prettify(c))).join(','));
        b.data.forEach(r => lines.push(cols.map(c => csvCell(fmt(c, r[c]))).join(',')));
      }
      lines.push('');
    });
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `member-${data.memberNo}-${current.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const renderBlock = (b: Block) => {
    const isEmpty = !b.data || (Array.isArray(b.data) ? b.data.length === 0 : Object.keys(b.data).length === 0);
    return (
      <section key={b.title} className="aw-card" style={{ marginBottom: 12 }}>
        <div className="aw-card-head">
          <span className="aw-card-icon"><FileText size={14} /></span>
          <h2 className="aw-card-title">{t(b.title)}</h2>
          {Array.isArray(b.data) && <span className="aw-pill" style={{ marginLeft: 'auto' }}>{b.data.length}</span>}
        </div>
        {isEmpty ? (
          <p className="aw-meta" style={{ padding: '6px 2px' }}>{t('No records for this member')}</p>
        ) : b.kind === 'kv' && !Array.isArray(b.data) ? (
          <div className="aw-rows">
            {Object.entries(b.data as Row).map(([k, v]) => (
              <div className="aw-row" key={k}>
                <span className="aw-row-label">{prettify(k)}</span>
                <span className="aw-row-value" style={{ textAlign: 'right', wordBreak: 'break-word' }}>{fmt(k, v)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="aw-table">
              <thead><tr>{Object.keys(((b.data as Row[])[0] ?? {})).map(c => <th key={c}>{prettify(c)}</th>)}</tr></thead>
              <tbody>
                {(b.data as Row[]).map((r, i) => (
                  <tr key={i}>{Object.keys(((b.data as Row[])[0] ?? {})).map(c => <td key={c}>{fmt(c, r[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="app-window aw-calm">
      <div className="aw-header aw-ambient aw-noprint">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Member Complete Detail')}</h1>
          <p className="aw-desc">{t('Everything held for one member in a single view')}</p>
        </div>
        <div className="aw-actions">
          {loading && <span className="aw-meta" role="status"><RefreshCw size={12} className="aw-spin" /> {t('Loading...')}</span>}
          {data && <button type="button" onClick={exportCsv} className="aw-btn aw-btn-secondary"><Download size={13} /> {t('Export CSV')}</button>}
          {data && <button type="button" onClick={() => window.print()} className="aw-btn aw-btn-secondary"><Printer size={13} /> {t('Print')}</button>}
          <button type="button" onClick={reset} className="aw-btn aw-btn-secondary"><RefreshCw size={13} /> {t('Reset')}</button>
          <button type="button" onClick={() => window.close()} className="aw-icon-btn" aria-label={t('Close window')}><X size={16} /></button>
        </div>
      </div>

      <div className="aw-fit">
        <div className="aw-split">
          <div className="aw-side aw-noprint">
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Search size={14} /></span>
                <h2 className="aw-card-title">{t('Member lookup')}</h2>
              </div>
              <div className="aw-stack">
                <div className="aw-input-wrap has-icon has-action">
                  <User size={13} />
                  <input type="text" value={memberNumber} className="aw-input" placeholder={t('Member ID...')} aria-label={t('Member ID')}
                    onChange={e => { setMemberNumber(e.target.value.replace(/[^0-9]/g, '')); setError(null); }}
                    onKeyDown={onKey} />
                  <button type="button" onClick={openLookup} className="aw-input-action" aria-label={t('Search members')}><Search size={13} /></button>
                </div>
                <label className="aw-meta">{t('Ledger from')}<input type="date" className="aw-input" value={fromDate} onChange={e => setFromDate(e.target.value)} /></label>
                <label className="aw-meta">{t('Ledger to')}<input type="date" className="aw-input" value={toDate} onChange={e => setToDate(e.target.value)} /></label>
                <button type="button" onClick={() => load()} disabled={!memberNumber.trim() || loading} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                  <Database size={13} /> {t('Load Member')}
                </button>
                {error && <div className="aw-alert aw-alert-danger" role="alert" style={{ marginBottom: 0 }}>{error}</div>}
              </div>
            </section>

            {data && (
              <section className="aw-card aw-fade-in">
                <div className="aw-panel aw-panel-accent" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="aw-avatar"><User size={16} /></span>
                  <div className="min-w-0">
                    <p className="aw-strong" style={{ textTransform: 'uppercase' }}>{data.personal?.full_name || data.personal?.f_name}</p>
                    <span className="aw-meta">{data.memberNo} · {data.personal?.office_name || '—'}</span>
                  </div>
                </div>
                <div className="aw-stack" style={{ marginTop: 8, gap: 2 }}>
                  {SECTIONS.map(s => {
                    const n = count(s);
                    return (
                      <button key={s.id} type="button" onClick={() => setSection(s.id)}
                        className={`aw-btn ${section === s.id ? 'aw-btn-primary' : 'aw-btn-secondary'}`}
                        style={{ width: '100%', justifyContent: 'space-between' }}>
                        <span>{t(s.label)}</span>
                        {s.id !== 'summary' && <span className="aw-pill">{n}</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <section className="aw-card aw-main">
            <div className="aw-main-head">
              <h2 className="aw-card-title">{data ? t(current.label) : t('Member Complete Detail')}</h2>
              {data && <span className="aw-meta">{t('As of')} {new Date(data.generatedAt).toLocaleString('en-IN')}</span>}
            </div>
            <div className="aw-main-body" style={{ overflowY: 'auto' }}>
              {data ? (
                <div className="aw-fade-in">
                  {data.warnings?.length > 0 && (
                    <div className="aw-alert aw-alert-danger" role="alert">
                      {t('Some sections could not be read:')} {data.warnings.join(' | ')}
                    </div>
                  )}
                  {section === 'ledger' && data.ledgerLimited && (
                    <div className="aw-alert">{t('Showing the latest 2000 entries. Use the Ledger from / to dates to narrow.')}</div>
                  )}
                  {section === 'frs' && (
                    <div className="aw-alert">{t('FRS = FRS1 (MD, head L1002) + FRS2 (MD1, head L1045). "Opening plus ledger net" is a computed figure, shown next to its parts.')}</div>
                  )}
                  {blocks.map(renderBlock)}
                </div>
              ) : (
                <div className="aw-empty" style={{ minHeight: '100%' }}>
                  <User size={48} />
                  <strong className="aw-strong">{t('No member loaded')}</strong>
                  <span>{t('Enter a Member ID and press Load Member')}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MemberCompleteDetail;
