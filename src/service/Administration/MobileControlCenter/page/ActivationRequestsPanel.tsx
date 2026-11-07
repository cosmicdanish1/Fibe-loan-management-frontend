import React, { useCallback, useEffect, useState } from 'react';
import { Check, Inbox, Phone, RefreshCw, X } from 'lucide-react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ActivationRequestRow, IssuedCode, mobileAdminApi } from '../api/mobileAdminApi';
import IssuedCodeDialog from './IssuedCodeDialog';
import { MatchChip, PhonePill } from './statusUi';

type Filter = 'NEW' | 'CALLED_BACK' | 'APPROVED' | 'REJECTED' | 'ALL';

/**
 * Activation requests sent from the app (PRD 9.1, Figure 7). A request activates nothing: staff compare the answers,
 * CALL THE MEMBER BACK on the registered number, and only then approve, which gives a one-time code to read out.
 */
const ActivationRequestsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('NEW');
  const [rows, setRows] = useState<ActivationRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [issued, setIssued] = useState<IssuedCode | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await mobileAdminApi.listRequests(filter));
    } catch (err: any) { message.error(err?.message || t('Could not load requests')); }
    finally { setLoading(false); }
  }, [filter, t]);

  useEffect(() => { void load(); }, [load]);

  const run = async (id: number, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try {
      const res = await fn();
      message.success(ok);
      await load();
      return res;
    } catch (err: any) {
      message.error(err?.message || t('The action failed'));
      return undefined;
    } finally { setBusyId(null); }
  };

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'NEW', label: t('Waiting') },
    { id: 'CALLED_BACK', label: t('Called back') },
    { id: 'APPROVED', label: t('Approved') },
    { id: 'REJECTED', label: t('Rejected') },
    { id: 'ALL', label: t('All') },
  ];
  const statusLabel: Record<string, string> = { NEW: t('Waiting'), CALLED_BACK: t('Called back'), APPROVED: t('Approved'), REJECTED: t('Rejected') };

  return (
    <section className="aw-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="aw-chips" role="radiogroup" aria-label={t('Filter')}>
          {filters.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} className="aw-chip" onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <button type="button" className="aw-icon-btn" onClick={load} disabled={loading} aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="bottom-end">
          <RefreshCw size={14} className={loading ? 'aw-spin' : ''} />
        </button>
      </div>

      <div className="aw-alert aw-alert-warning" role="note" style={{ marginTop: 12 }}>
        <div>{t('Before approving: call the member back on the registered number shown here (not a number he gives you) and check the details.')}</div>
      </div>

      {rows.length === 0 ? (
        <div className="aw-empty"><Inbox size={28} /><span>{loading ? t('Loading…') : t('No requests here.')}</span></div>
      ) : (
        <div className="aw-table-wrap" style={{ marginTop: 12 }}>
          <table className="aw-table" style={{ minWidth: 900 }}>
            <thead>
              <tr><th>{t('Received')}</th><th>{t('Member')}</th><th>{t('Call back on')}</th><th>{t('Answers matched')}</th><th>{t('Status')}</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const open = r.status === 'NEW' || r.status === 'CALLED_BACK';
                const usable = r.match?.phoneStatus === 'OK';
                return (
                  <tr key={r.id}>
                    <td className="is-muted">{dayjs(r.createdAt).format('DD MMM, HH:mm')}</td>
                    <td><span className="is-accent">{r.mbno}</span><br /><span className="is-muted">{r.name}</span></td>
                    <td>
                      <Phone size={12} /> {r.phone || '—'}<br />
                      {r.match && <PhonePill status={r.match.phoneStatus} shared={r.match.phoneSharedCount} />}
                    </td>
                    <td>
                      {r.match ? (
                        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                          <MatchChip ok={r.match.dob} label={t('Date of birth')} />
                          <MatchChip ok={r.match.pan} label="PAN" />
                          <MatchChip ok={r.match.phone} label={t('Phone digits')} />
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className="aw-pill">{statusLabel[r.status] ?? r.status}</span>
                      {r.handledBy && <><br /><span className="is-muted">{r.handledBy}</span></>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {open && (
                        <span style={{ display: 'inline-flex', gap: 6 }}>
                          {r.status === 'NEW' && (
                            <button type="button" className="aw-btn aw-btn-secondary" disabled={busyId === r.id}
                              onClick={() => run(r.id, () => mobileAdminApi.calledBack(r.id), t('Marked as called back'))}>
                              <Phone size={12} /> {t('Called back')}
                            </button>
                          )}
                          <button type="button" className="aw-btn aw-btn-primary" disabled={busyId === r.id || !usable}
                            title={usable ? undefined : t('The registered phone cannot be used for a call-back. Activate at the counter.')}
                            onClick={async () => {
                              const res = (await run(r.id, () => mobileAdminApi.approve(r.id), t('Approved: activation code issued'))) as IssuedCode | undefined;
                              if (res) setIssued(res);
                            }}>
                            <Check size={12} /> {t('Approve and get code')}
                          </button>
                          <button type="button" className="aw-btn aw-btn-ghost" disabled={busyId === r.id}
                            onClick={() => { if (window.confirm(t('Reject this request?'))) run(r.id, () => mobileAdminApi.reject(r.id), t('Request rejected')); }}>
                            <X size={12} /> {t('Reject')}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {issued && <IssuedCodeDialog title={t('Activation code')} issued={issued} onClose={() => setIssued(null)} />}
    </section>
  );
};

export default ActivationRequestsPanel;
