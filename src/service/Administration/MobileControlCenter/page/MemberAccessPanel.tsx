import React, { useCallback, useState } from 'react';
import { Ban, KeyRound, Lock, LogOut, RefreshCw, Search, ShieldCheck, Unlock, UserRound } from 'lucide-react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { IssuedCode, MemberDetail, MemberRow, mobileAdminApi } from '../api/mobileAdminApi';
import IssuedCodeDialog from './IssuedCodeDialog';
import { AccessPill, PhonePill } from './statusUi';

const fmt = (v?: string | null) => (v ? dayjs(v).format('DD MMM YYYY, HH:mm') : '—');

const VERIFY_TEXT: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: 'The code is correct. This is the member’s phone.' },
  wrong: { ok: false, text: 'The code is NOT correct.' },
  replay: { ok: false, text: 'That code was already checked. Ask the member to read the next code.' },
  locked: { ok: false, text: 'Too many wrong codes. Try again after 15 minutes.' },
  no_secret: { ok: false, text: 'This phone has no App Code set up.' },
  no_device: { ok: false, text: 'The member has no active phone. Issue an activation code first.' },
};

/** Member access (PRD 14): search, see status and phones, issue codes, reset MPIN, unlock, block, verify the App Code. */
const MemberAccessPanel: React.FC = () => {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<MemberRow[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ title: string; code: IssuedCode } | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) { message.info(t('Type at least 2 characters of the member number or name.')); return; }
    setSearching(true);
    try {
      setRows(await mobileAdminApi.searchMembers(q.trim()));
    } catch (err: any) { message.error(err?.message || t('Search failed')); }
    finally { setSearching(false); }
  };

  const open = useCallback(async (mbno: string) => {
    setLoadingDetail(true);
    setVerifyResult(null);
    setVerifyCode('');
    setBlockReason(null);
    try {
      setDetail(await mobileAdminApi.memberDetail(mbno));
    } catch (err: any) { message.error(err?.message || t('Could not load the member')); }
    finally { setLoadingDetail(false); }
  }, [t]);

  const refreshAfter = async (mbno: string) => {
    await open(mbno);
    if (q.trim().length >= 2) mobileAdminApi.searchMembers(q.trim()).then(setRows).catch(() => undefined);
  };

  /** Runs a staff action; a declined authenticator-code prompt just ends quietly. */
  const act = async (key: string, mbno: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      const res = await fn();
      message.success(ok);
      await refreshAfter(mbno);
      return res;
    } catch (err: any) {
      message.error(err?.message || t('The action failed'));
      return undefined;
    } finally { setBusy(null); }
  };

  const m = detail?.member;
  const a = detail?.access;
  const activeDevices = (detail?.devices ?? []).filter((d) => !d.revoked);
  const canIssue = a && a.status !== 'BLOCKED';

  const doIssue = async () => {
    if (!m) return;
    const res = (await act('issue', m.mbno, () => mobileAdminApi.issueCode(m.mbno), t('Activation code issued'))) as IssuedCode | undefined;
    if (res) setIssued({ title: t('Activation code'), code: res });
  };
  const doReset = async () => {
    if (!m) return;
    if (!window.confirm(t('This signs the member out of every phone and gives a new code. Continue?'))) return;
    const res = (await act('reset', m.mbno, () => mobileAdminApi.resetMpin(m.mbno), t('MPIN reset: new code issued'))) as IssuedCode | undefined;
    if (res) setIssued({ title: t('New code after MPIN reset'), code: res });
  };
  const doVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!m || !/^\d{6}$/.test(verifyCode.trim())) return;
    setBusy('verify');
    try {
      const r = await mobileAdminApi.verifyAppCode(m.mbno, verifyCode.trim());
      setVerifyResult(r.result);
      setVerifyCode('');
    } catch (err: any) { message.error(err?.message || t('Could not check the code')); }
    finally { setBusy(null); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) minmax(0, 1fr)', gap: 'var(--aw-gap)', alignItems: 'start' }}>
      <section className="aw-card">
        <form onSubmit={search} className="aw-stack" style={{ gap: 8 }}>
          <label className="aw-label" htmlFor="mcc-search">{t('Find a member')}</label>
          <div className="aw-input-wrap has-icon">
            <Search size={14} />
            <input id="mcc-search" className="aw-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Member number or name')} autoComplete="off" />
          </div>
          <button type="submit" className="aw-btn aw-btn-primary" disabled={searching}>
            <Search size={13} /> {searching ? t('Searching…') : t('Search')}
          </button>
        </form>

        {rows && (rows.length === 0 ? (
          <div className="aw-empty"><UserRound size={26} /><span>{t('No member found.')}</span></div>
        ) : (
          <div className="aw-table-wrap" style={{ marginTop: 12 }}>
            <table className="aw-table">
              <thead><tr><th>{t('Member')}</th><th>{t('Access')}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.mbno} onClick={() => open(r.mbno)} style={{ cursor: 'pointer' }} aria-selected={detail?.member.mbno === r.mbno}>
                    <td><span className="is-accent">{r.mbno}</span><br /><span className="is-muted">{r.name}</span></td>
                    <td><AccessPill status={r.accessStatus} /><br /><PhonePill status={r.phoneStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="aw-card" aria-live="polite">
        {!detail && !loadingDetail && <div className="aw-empty"><ShieldCheck size={28} /><span>{t('Search and pick a member to see the mobile access.')}</span></div>}
        {loadingDetail && <div className="aw-empty"><RefreshCw size={22} className="aw-spin" /><span>{t('Loading…')}</span></div>}

        {detail && m && a && !loadingDetail && (
          <div className="aw-stack" style={{ gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 className="aw-card-title">{m.name || t('Member')} <span className="is-muted">#{m.mbno}</span></h2>
                <p className="aw-meta">
                  {t('Registered phone')}: <strong>{m.phone || '—'}</strong> <PhonePill status={m.phoneStatus} shared={m.phoneSharedCount} />
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <AccessPill status={a.status} />
                <p className="aw-meta" style={{ margin: '4px 0 0' }}>
                  {a.activatedAt ? `${t('Activated')} ${fmt(a.activatedAt)}` : t('Never activated')}
                  {a.failedAttempts > 0 && <> &middot; {a.failedAttempts} {t('wrong MPIN tries')}</>}
                </p>
              </div>
            </div>

            {a.status === 'BLOCKED' && (
              <div className="aw-alert aw-alert-danger" role="alert"><div>{t('Blocked')}: {a.blockedReason || '—'} {a.blockedBy ? `(${a.blockedBy})` : ''}</div></div>
            )}
            {(m.phoneStatus === 'SHARED' || m.phoneStatus === 'MISSING' || m.phoneStatus === 'INVALID') && (
              <div className="aw-alert aw-alert-warning" role="note">
                <div>{t('The registered phone cannot prove who the member is. Activate at the counter after an ID check, and correct the number in Member Master.')}</div>
              </div>
            )}

            <div className="aw-btn-row" style={{ flexWrap: 'wrap' }}>
              {canIssue && (
                <button type="button" className="aw-btn aw-btn-primary" onClick={doIssue} disabled={busy !== null}>
                  <KeyRound size={13} /> {t('Issue activation code')}
                </button>
              )}
              {(a.status === 'ACTIVE' || a.status === 'LOCKED') && (
                <button type="button" className="aw-btn aw-btn-secondary" onClick={doReset} disabled={busy !== null}>
                  <RefreshCw size={13} /> {t('Reset MPIN')}
                </button>
              )}
              {a.status === 'LOCKED' && (
                <button type="button" className="aw-btn aw-btn-secondary" onClick={() => act('unlock', m.mbno, () => mobileAdminApi.unlock(m.mbno), t('Member unlocked'))} disabled={busy !== null}>
                  <Unlock size={13} /> {t('Unlock')}
                </button>
              )}
              {activeDevices.length > 0 && (
                <button type="button" className="aw-btn aw-btn-secondary" disabled={busy !== null}
                  onClick={() => { if (window.confirm(t('Every phone of this member will stop working. Continue?'))) act('signout', m.mbno, () => mobileAdminApi.signOutAll(m.mbno), t('Signed out everywhere')); }}>
                  <LogOut size={13} /> {t('Sign out everywhere')}
                </button>
              )}
              {a.status === 'BLOCKED' ? (
                <button type="button" className="aw-btn aw-btn-secondary" onClick={() => act('unblock', m.mbno, () => mobileAdminApi.unblock(m.mbno), t('Member unblocked'))} disabled={busy !== null}>
                  <Unlock size={13} /> {t('Unblock')}
                </button>
              ) : (
                <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setBlockReason(blockReason === null ? '' : null)} disabled={busy !== null}>
                  <Ban size={13} /> {t('Block access')}
                </button>
              )}
            </div>

            {blockReason !== null && (
              <div className="aw-stack" style={{ gap: 6 }}>
                <label className="aw-label" htmlFor="mcc-block">{t('Reason for blocking (kept in the audit log)')}</label>
                <input id="mcc-block" className="aw-input" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} maxLength={300} />
                <div className="aw-btn-row">
                  <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setBlockReason(null)}>{t('Cancel')}</button>
                  <button type="button" className="aw-btn aw-btn-primary" disabled={blockReason.trim().length < 3 || busy !== null}
                    onClick={async () => { await act('block', m.mbno, () => mobileAdminApi.block(m.mbno, blockReason.trim()), t('Member blocked')); setBlockReason(null); }}>
                    <Lock size={13} /> {t('Block')}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={doVerify} className="aw-stack" style={{ gap: 6 }}>
              <label className="aw-label" htmlFor="mcc-verify">{t('Verify the member by App Code (ask him to read the 6 digits from his app)')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id="mcc-verify" className="aw-input" inputMode="numeric" maxLength={6} placeholder="123456" value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: 160, textAlign: 'center', letterSpacing: 4 }} />
                <button type="submit" className="aw-btn aw-btn-secondary" disabled={verifyCode.length !== 6 || busy !== null}><ShieldCheck size={13} /> {t('Check')}</button>
              </div>
              {verifyResult && (
                <div className={`aw-alert ${VERIFY_TEXT[verifyResult]?.ok ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status">
                  <div>{t(VERIFY_TEXT[verifyResult]?.text ?? 'Could not check the code')}</div>
                </div>
              )}
            </form>

            <div>
              <h3 className="aw-label">{t('Phones')}</h3>
              {detail.devices.length === 0 ? <p className="aw-meta">{t('No phone has been activated.')}</p> : (
                <div className="aw-table-wrap"><table className="aw-table"><thead><tr><th>{t('Phone')}</th><th>{t('App')}</th><th>{t('Last seen')}</th><th>{t('Status')}</th></tr></thead>
                  <tbody>{detail.devices.map((d) => (
                    <tr key={d.id}><td>{d.model || d.platform || '—'}</td><td className="is-muted">{d.appVersion || '—'}</td><td className="is-muted">{fmt(d.lastSeen)}</td>
                      <td>{d.revoked ? <span className="aw-pill">{t('Removed')}</span> : <span className="aw-pill" style={{ color: 'var(--aw-success)' }}>{t('Trusted')}</span>}</td></tr>
                  ))}</tbody></table></div>
              )}
            </div>

            <div>
              <h3 className="aw-label">{t('Activation codes')}</h3>
              {detail.codes.length === 0 ? <p className="aw-meta">{t('No code was issued yet.')}</p> : (
                <div className="aw-table-wrap"><table className="aw-table"><thead><tr><th>{t('Issued')}</th><th>{t('By')}</th><th>{t('Valid until')}</th><th>{t('State')}</th></tr></thead>
                  <tbody>{detail.codes.map((c, i) => (
                    <tr key={i}><td className="is-muted">{fmt(c.issuedAt)}</td><td>{c.issuedBy}</td><td className="is-muted">{fmt(c.expiresAt)}</td>
                      <td>{c.usedAt ? t('Used') : c.burned ? t('Cancelled') : new Date(c.expiresAt) < new Date() ? t('Expired') : t('Waiting to be used')}</td></tr>
                  ))}</tbody></table></div>
              )}
            </div>

            <div>
              <h3 className="aw-label">{t('Recent activity')}</h3>
              {detail.recentActivity.length === 0 ? <p className="aw-meta">{t('Nothing yet.')}</p> : (
                <div className="aw-table-wrap"><table className="aw-table"><thead><tr><th>{t('When')}</th><th>{t('Event')}</th><th>{t('Result')}</th></tr></thead>
                  <tbody>{detail.recentActivity.map((e, i) => (
                    <tr key={i}><td className="is-muted">{fmt(e.at)}</td><td>{e.event.replace(/_/g, ' ').toLowerCase()}</td><td className="is-muted">{e.result || '—'}</td></tr>
                  ))}</tbody></table></div>
              )}
            </div>
          </div>
        )}
      </section>

      {issued && <IssuedCodeDialog title={issued.title} issued={issued.code} onClose={() => setIssued(null)} />}
    </div>
  );
};

export default MemberAccessPanel;
