import React, { useCallback, useEffect, useState } from 'react';
import { Ban, Download, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { AuditFilter, AuditRow, BlockRow, Monitors, mobileAdminApi } from '../api/mobileAdminApi';

const fmt = (v?: string | null) => (v ? dayjs(v).format('DD MMM YYYY, HH:mm:ss') : '—');
const PAGE = 50;

/**
 * Security and audit (PRD 14, ES-243): the last 24 hours at a glance, a searchable audit trail of everything members and staff
 * did in the app, a read-only CSV export, and blocking of a phone or an internet address. Staff are never affected by a block.
 */
const SecurityAuditPanel: React.FC = () => {
  const { t } = useTranslation();
  const [mon, setMon] = useState<Monitors | null>(null);
  const [filter, setFilter] = useState<AuditFilter>({});
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [target, setTarget] = useState<{ kind: 'IP' | 'DEVICE'; value: string; reason: string }>({ kind: 'IP', value: '', reason: '' });

  const loadSide = useCallback(async () => {
    try {
      const [m, b] = await Promise.all([mobileAdminApi.monitors(), mobileAdminApi.blocklist()]);
      setMon(m);
      setBlocks(b);
    } catch (err: any) { message.error(err?.message || t('Could not load the monitors')); }
  }, [t]);

  const search = useCallback(async (f: AuditFilter, off: number) => {
    setLoading(true);
    try {
      setRows(await mobileAdminApi.audit({ ...f, limit: PAGE, offset: off }));
      setOffset(off);
    } catch (err: any) { message.error(err?.message || t('Could not search the audit trail')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { void loadSide(); void search({}, 0); }, [loadSide, search]);

  const set = (patch: Partial<AuditFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const clean = (f: AuditFilter): AuditFilter => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && String(v).trim() !== '')) as AuditFilter;

  const exportCsv = async () => {
    try {
      const { fileName, csv } = await mobileAdminApi.auditExport(clean(filter));
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err: any) { message.error(err?.message || t('Could not export')); }
  };

  const doBlock = async () => {
    if (!target.value.trim() || target.reason.trim().length < 3) { message.warning(t('Enter what to block and the reason.')); return; }
    try {
      await mobileAdminApi.blockTarget(target.kind, target.value.trim(), target.reason.trim());
      message.success(t('Blocked. It takes effect within 15 seconds.'));
      setTarget({ kind: 'IP', value: '', reason: '' });
      await loadSide();
    } catch (err: any) { message.error(err?.message || t('Could not block')); }
  };

  const lift = async (b: BlockRow) => {
    if (!window.confirm(t('Lift this block?'))) return;
    try { await mobileAdminApi.unblockTarget(b.id); message.success(t('Block lifted')); await loadSide(); }
    catch (err: any) { message.error(err?.message || t('Could not lift the block')); }
  };

  const tile = (label: string, n: number, color?: string) => (
    <div className="aw-card" style={{ padding: 12, minWidth: 140 }}>
      <div className="aw-meta">{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{n.toLocaleString('en-IN')}</div>
    </div>
  );

  return (
    <>
      <section className="aw-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 className="aw-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShieldAlert size={15} /> {t('Last 24 hours')}</h2>
          <button type="button" className="aw-icon-btn" onClick={loadSide} aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="bottom-end"><RefreshCw size={14} /></button>
        </div>
        {mon && (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '10px 0' }}>
              {tile(t('Sign-ins OK'), mon.last24h.loginOk, 'var(--aw-success)')}
              {tile(t('Sign-ins failed'), mon.last24h.loginFailed, mon.last24h.loginFailed ? 'var(--aw-danger)' : undefined)}
              {tile(t('Wrong App Codes'), mon.last24h.appCodeFailed)}
              {tile(t('Wrong activation codes'), mon.last24h.activationFailed)}
              {tile(t('Accounts locked now'), mon.lockedAccounts, mon.lockedAccounts ? 'var(--aw-warning)' : undefined)}
              {tile(t('Copied-session alerts'), mon.last24h.tokenReuse, mon.last24h.tokenReuse ? 'var(--aw-danger)' : undefined)}
              {tile(t('Active blocks'), mon.activeBlocks)}
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <h3 className="aw-label">{t('Addresses with most failures')}</h3>
                {mon.topFailingIps.length === 0 ? <p className="aw-meta">{t('None')}</p> : (
                  <table className="aw-table"><tbody>
                    {mon.topFailingIps.map((r) => (
                      <tr key={r.ip}>
                        <td className="is-accent">{r.ip}</td><td>{r.failures} {t('failures')}</td><td>{r.members} {t('members')}</td>
                        <td><button type="button" className="aw-btn aw-btn-ghost" onClick={() => setTarget({ kind: 'IP', value: r.ip, reason: '' })}><Ban size={12} /> {t('Block')}</button></td>
                      </tr>
                    ))}
                  </tbody></table>
                )}
              </div>
              <div>
                <h3 className="aw-label">{t('Members with most failures')}</h3>
                {mon.topFailingMembers.length === 0 ? <p className="aw-meta">{t('None')}</p> : (
                  <table className="aw-table"><tbody>
                    {mon.topFailingMembers.map((r) => (
                      <tr key={r.mbno}><td className="is-accent">{r.mbno}</td><td>{r.failures} {t('failures')}</td>
                        <td><button type="button" className="aw-btn aw-btn-ghost" onClick={() => { const f = { mbno: r.mbno }; setFilter(f); void search(f, 0); }}><Search size={12} /> {t('See activity')}</button></td></tr>
                    ))}
                  </tbody></table>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="aw-card">
        <h2 className="aw-card-title">{t('Blocked phones and addresses')}</h2>
        <p className="aw-meta">{t('A blocked phone or address is refused by the member app at once. Staff in the office are never affected.')}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label className="aw-label" htmlFor="blk-kind">{t('What')}</label>
            <select id="blk-kind" className="aw-input" value={target.kind} onChange={(e) => setTarget({ ...target, kind: e.target.value as 'IP' | 'DEVICE' })}>
              <option value="IP">{t('Internet address (IP)')}</option><option value="DEVICE">{t('Phone (device reference)')}</option>
            </select></div>
          <div style={{ minWidth: 240, flex: 1 }}><label className="aw-label" htmlFor="blk-val">{target.kind === 'IP' ? t('IP address') : t('Device reference (64 characters, from the audit trail)')}</label>
            <input id="blk-val" className="aw-input" value={target.value} onChange={(e) => setTarget({ ...target, value: e.target.value })} autoComplete="off" /></div>
          <div style={{ minWidth: 220, flex: 1 }}><label className="aw-label" htmlFor="blk-why">{t('Reason (kept in the audit log)')}</label>
            <input id="blk-why" className="aw-input" maxLength={300} value={target.reason} onChange={(e) => setTarget({ ...target, reason: e.target.value })} /></div>
          <button type="button" className="aw-btn aw-btn-primary" onClick={doBlock}><Ban size={13} /> {t('Block')}</button>
        </div>
        {blocks.length > 0 && (
          <div className="aw-table-wrap" style={{ marginTop: 10 }}>
            <table className="aw-table">
              <thead><tr><th>{t('Type')}</th><th>{t('Value')}</th><th>{t('Reason')}</th><th>{t('Blocked by')}</th><th>{t('When')}</th><th /></tr></thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b.id}>
                    <td>{b.kind === 'IP' ? t('IP') : t('Phone')}</td>
                    <td className="is-accent" title={b.value}>{b.kind === 'DEVICE' ? `${b.value.slice(0, 12)}…` : b.value}</td>
                    <td>{b.reason || '—'}</td><td>{b.blockedBy || '—'}</td><td>{fmt(b.blockedAt)}</td>
                    <td><button type="button" className="aw-btn aw-btn-secondary" onClick={() => lift(b)}>{t('Lift')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="aw-card">
        <h2 className="aw-card-title">{t('Audit trail')}</h2>
        <form onSubmit={(e) => { e.preventDefault(); void search(clean(filter), 0); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label className="aw-label" htmlFor="au-mb">{t('Member number')}</label><input id="au-mb" className="aw-input" style={{ width: 130 }} inputMode="numeric" value={filter.mbno ?? ''} onChange={(e) => set({ mbno: e.target.value })} /></div>
          <div><label className="aw-label" htmlFor="au-ev">{t('Event')}</label><input id="au-ev" className="aw-input" style={{ width: 170 }} placeholder="LOGIN, STEP_UP…" value={filter.event ?? ''} onChange={(e) => set({ event: e.target.value.toUpperCase() })} /></div>
          <div><label className="aw-label" htmlFor="au-res">{t('Result')}</label>
            <select id="au-res" className="aw-input" value={filter.result ?? ''} onChange={(e) => set({ result: e.target.value })}>
              <option value="">{t('Any')}</option><option value="OK">OK</option><option value="FAIL">FAIL</option>
            </select></div>
          <div><label className="aw-label" htmlFor="au-ip">{t('IP address')}</label><input id="au-ip" className="aw-input" style={{ width: 140 }} value={filter.ip ?? ''} onChange={(e) => set({ ip: e.target.value })} /></div>
          <div><label className="aw-label" htmlFor="au-dev">{t('Device id or reference')}</label><input id="au-dev" className="aw-input" style={{ width: 170 }} value={filter.deviceId ?? ''} onChange={(e) => set({ deviceId: e.target.value })} /></div>
          <div><label className="aw-label" htmlFor="au-from">{t('From')}</label><input id="au-from" type="date" className="aw-input" value={filter.from ?? ''} onChange={(e) => set({ from: e.target.value })} /></div>
          <div><label className="aw-label" htmlFor="au-to">{t('To')}</label><input id="au-to" type="date" className="aw-input" value={filter.to ?? ''} onChange={(e) => set({ to: e.target.value })} /></div>
          <button type="submit" className="aw-btn aw-btn-primary" disabled={loading}><Search size={13} /> {t('Search')}</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={exportCsv}><Download size={13} /> {t('Export CSV')}</button>
        </form>

        {rows && rows.length === 0 && <div className="aw-empty"><span>{t('Nothing found.')}</span></div>}
        {rows && rows.length > 0 && (
          <div className="aw-table-wrap" style={{ marginTop: 10 }}>
            <table className="aw-table">
              <thead><tr><th>{t('Time')}</th><th>{t('Member')}</th><th>{t('Event')}</th><th>{t('Result')}</th><th>{t('IP')}</th><th>{t('Phone')}</th><th>{t('App')}</th><th>{t('Detail')}</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{fmt(r.at)}</td><td className="is-accent">{r.mbno || '—'}</td><td>{r.event}</td>
                    <td style={{ color: r.result === 'FAIL' ? 'var(--aw-danger)' : undefined }}>{r.result || '—'}</td>
                    <td>{r.ip || '—'}</td>
                    <td title={r.deviceRef ?? ''}>{r.deviceRef ? `${r.deviceRef.slice(0, 8)}…` : '—'}</td>
                    <td>{[r.platform, r.appVersion].filter(Boolean).join(' ') || '—'}</td>
                    <td className="aw-meta" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.detail ? JSON.stringify(r.detail) : ''}>{r.detail ? JSON.stringify(r.detail) : ''}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.ip && <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setTarget({ kind: 'IP', value: r.ip!, reason: '' })}>{t('Block IP')}</button>}
                      {r.deviceRef && <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setTarget({ kind: 'DEVICE', value: r.deviceRef!, reason: '' })}>{t('Block phone')}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <button type="button" className="aw-btn aw-btn-secondary" disabled={loading || offset === 0} onClick={() => search(clean(filter), Math.max(0, offset - PAGE))}>{t('Newer')}</button>
              <button type="button" className="aw-btn aw-btn-secondary" disabled={loading || rows.length < PAGE} onClick={() => search(clean(filter), offset + PAGE)}>{t('Older')}</button>
              <span className="aw-meta">{t('Showing')} {offset + 1}–{offset + rows.length}</span>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default SecurityAuditPanel;
