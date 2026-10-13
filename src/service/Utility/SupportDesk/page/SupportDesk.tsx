import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X, RefreshCw, Send, ImagePlus, Trash2, CheckCircle2, AlertCircle, LifeBuoy, ClipboardPaste, RotateCw,
} from 'lucide-react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { apiService } from '../../../../services/api';
import { useAuth } from '../../../../auth/context/AuthContext';

type QueryType = 'BUG' | 'QUESTION' | 'DATA_CORRECTION' | 'FEATURE_REQUEST' | 'OTHER';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Tab = 'raise' | 'mine' | 'all';

interface SupportQueryRow {
  id: number;
  subject: string;
  description: string;
  module: string | null;
  queryType: QueryType;
  priority: Priority;
  status: string;
  reporterUsername: string | null;
  jiraKey: string | null;
  jiraStatus: string;
  jiraError: string | null;
  telegramStatus: string;
  telegramError: string | null;
  createdAt: string;
}

const QUERY_TYPES: { value: QueryType; label: string; hint: string }[] = [
  { value: 'BUG', label: 'Bug', hint: 'Something is not working or shows a wrong result' },
  { value: 'QUESTION', label: 'Question', hint: 'How do I do something?' },
  { value: 'DATA_CORRECTION', label: 'Data correction', hint: 'A saved record needs to be corrected' },
  { value: 'FEATURE_REQUEST', label: 'Feature request', hint: 'Something new we would like' },
  { value: 'OTHER', label: 'Other', hint: 'Anything else' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const MODULES = [
  'Member Master', 'Loan Application', 'Loan Repayment', 'Loan Early Closure', 'Loan Re-agreement',
  'Savings (SB)', 'Fixed Deposit (FD)', 'Recurring Deposit (RD)', 'CD / MD', 'Demand & Recovery',
  'Vouchers & Transactions', 'Pass Transactions', 'Day-End', 'Financial Year', 'Reports & Printing',
  'Login & Security', 'Utility', 'Other',
];

const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGES = ['image/png', 'image/jpeg', 'image/jpg'];

const ticketNo = (id: number) => `SQ-${String(id).padStart(5, '0')}`;
const typeLabel = (t: string) => QUERY_TYPES.find((q) => q.value === t)?.label ?? t;
const unwrap = (res: any) => (res && typeof res === 'object' && 'data' in res ? res.data : res);

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const SupportDesk: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = ['administrator', 'admin', 'system'].includes(String(user?.role || '').toLowerCase());

  const [tab, setTab] = useState<Tab>('raise');
  const [queryType, setQueryType] = useState<QueryType>('BUG');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [module, setModule] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticket: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState('');

  const [mine, setMine] = useState<SupportQueryRow[]>([]);
  const [all, setAll] = useState<SupportQueryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (window as any).electronAPI?.getAppVersion?.().then((v: string) => setAppVersion(v || '')).catch(() => undefined);
  }, []);

  // ── Screenshot handling: file picker, drag-drop and clipboard paste ──
  const takeImage = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!ALLOWED_IMAGES.includes(file.type)) {
      message.error('Only PNG or JPEG screenshots are allowed.');
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      message.error('Screenshot is larger than 3 MB. Please crop it or use a smaller one.');
      return;
    }
    setScreenshot(file);
  }, []);

  useEffect(() => {
    if (!screenshot) { setPreview(null); return; }
    const url = URL.createObjectURL(screenshot);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  // Ctrl+V anywhere in the raise tab pastes a copied screenshot (e.g. after Win+Shift+S).
  useEffect(() => {
    if (tab !== 'raise') return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      const blob = item.getAsFile();
      if (blob) takeImage(new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type || 'image/png' }));
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [tab, takeImage]);

  // ── Lists ──
  const loadMine = useCallback(async () => {
    setLoading(true);
    try {
      const raw: any = await apiService.get('/support-queries/mine');
      if (raw?.success === false) { message.error(raw.message || raw.error || 'Could not load your queries.'); return; }
      const res = unwrap(raw);
      setMine(Array.isArray(res) ? res : []);
    } catch { message.error('Could not load your queries.'); }
    finally { setLoading(false); }
  }, []);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const raw: any = await apiService.get('/support-queries/admin/all');
      if (raw?.success === false) { message.error(raw.message || raw.error || 'Could not load all queries.'); return; }
      const res = unwrap(raw);
      setAll(Array.isArray(res) ? res : []);
    } catch { message.error('Could not load all queries.'); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => {
    if (tab === 'mine') loadMine();
    if (tab === 'all') loadAll();
  }, [tab, loadMine, loadAll]);

  const refresh = () => (tab === 'mine' ? loadMine() : tab === 'all' ? loadAll() : undefined);

  // ── Submit ──
  const subjectOk = subject.trim().length >= 5;
  const descriptionOk = description.trim().length >= 10;
  const canSubmit = subjectOk && descriptionOk && !submitting;

  const resetForm = () => {
    setQueryType('BUG'); setPriority('MEDIUM'); setModule('');
    setSubject(''); setDescription(''); setScreenshot(null);
    setSubmitted(null); setFormError(null);
  };

  const submit = async () => {
    setFormError(null);
    if (!subjectOk) { setFormError('Please give the query a short title (at least 5 characters).'); return; }
    if (!descriptionOk) { setFormError('Please describe the problem in a little more detail (at least 10 characters).'); return; }

    const fd = new FormData();
    fd.append('queryType', queryType);
    fd.append('priority', priority);
    fd.append('subject', subject.trim());
    fd.append('description', description.trim());
    if (module) fd.append('module', module);
    fd.append('appVersion', appVersion || 'unknown');
    fd.append('clientInfo', `${navigator.userAgent} | screen ${window.screen.width}x${window.screen.height}`.slice(0, 1000));
    if (screenshot) fd.append('screenshot', screenshot);

    setSubmitting(true);
    try {
      const res: any = await apiService.request('/support-queries', { method: 'POST', body: fd });
      const data = unwrap(res);
      if (res?.success === false || !data?.id) {
        setFormError(res?.message || res?.error || 'Could not submit your query. Please try again.');
        return;
      }
      setSubmitted({ ticket: data.ticketNo || ticketNo(data.id) });
    } catch (e: any) {
      setFormError(e?.message || 'Could not submit your query. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const retry = async (id: number) => {
    setRetryingId(id);
    try {
      const res = await apiService.post(`/support-queries/${id}/retry`);
      if (!res.success) { message.error(res.message || res.error || 'Retry failed.'); return; }
      message.success('Delivery retried.');
      await loadAll();
    } catch { message.error('Retry failed.'); }
    finally { setRetryingId(null); }
  };

  const tabs = useMemo(() => {
    const t: { id: Tab; label: string }[] = [
      { id: 'raise', label: 'Raise a Query' },
      { id: 'mine', label: 'My Queries' },
    ];
    if (isAdmin) t.push({ id: 'all', label: 'All Queries' });
    return t;
  }, [isAdmin]);

  const deliveryPill = (status: string, error: string | null) => {
    const tone = status === 'SENT' ? 'var(--aw-success)' : status === 'FAILED' ? 'var(--aw-danger)' : status === 'SKIPPED' ? 'var(--aw-muted)' : 'var(--aw-warning)';
    return (
      <span className="aw-pill" title={error || undefined} style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}>
        {status === 'SENT' ? 'Sent' : status === 'FAILED' ? 'Failed' : status === 'DISABLED' ? 'Not set up' : status === 'SKIPPED' ? 'Muted' : 'Queued'}
      </span>
    );
  };

  const renderTable = (rows: SupportQueryRow[], admin: boolean) => (
    rows.length === 0 ? (
      <div className="aw-empty"><LifeBuoy size={28} /><span>{loading ? 'Loading…' : 'No queries yet.'}</span></div>
    ) : (
      <div className="aw-table-wrap">
        <table className="aw-table" style={{ minWidth: admin ? 980 : 760 }}>
          <thead>
            <tr>
              <th>Ticket</th><th>Subject</th><th>Type</th><th>Priority</th>
              {admin && <th>Raised by</th>}
              <th>Raised</th>
              <th>{admin ? 'Jira' : 'Reference'}</th>
              {admin && <th>Telegram</th>}
              {!admin && <th>Status</th>}
              {admin && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="is-accent">{ticketNo(r.id)}</td>
                <td title={r.description} style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</td>
                <td>{typeLabel(r.queryType)}</td>
                <td>{r.priority.charAt(0) + r.priority.slice(1).toLowerCase()}</td>
                {admin && <td className="is-muted">{r.reporterUsername || '—'}</td>}
                <td className="is-muted">{dayjs(r.createdAt).format('DD MMM YYYY, HH:mm')}</td>
                <td>{admin ? (<>{r.jiraKey ? `${r.jiraKey} ` : ''}{deliveryPill(r.jiraStatus, r.jiraError)}</>) : (r.jiraKey || '—')}</td>
                {admin && <td>{deliveryPill(r.telegramStatus, r.telegramError)}</td>}
                {!admin && <td><span className="aw-pill">{r.status.replace('_', ' ')}</span></td>}
                {admin && (
                  <td>
                    {((r.jiraStatus !== 'SENT' && r.jiraStatus !== 'SKIPPED') || (r.telegramStatus !== 'SENT' && r.telegramStatus !== 'SKIPPED')) && (
                      <button type="button" className="aw-btn aw-btn-secondary" disabled={retryingId === r.id} onClick={() => retry(r.id)}>
                        <RotateCw size={12} className={retryingId === r.id ? 'aw-spin' : ''} /> Retry
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Support Desk</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LifeBuoy size={12} /> Report a problem or ask a question — our team is notified straight away
          </p>
        </div>
        <div className="aw-actions">
          {tab !== 'raise' && (
            <button type="button" onClick={refresh} disabled={loading} className="aw-icon-btn" aria-label="Refresh" data-tip="Refresh" data-tip-pos="bottom-end">
              <RefreshCw size={14} className={loading ? 'aw-spin' : ''} />
            </button>
          )}
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost"><X size={13} /> Close</button>
        </div>
      </div>

      <div className="aw-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="aw-tab" onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="aw-content">
        {tab === 'raise' && (submitted ? (
          <section className="aw-card" style={{ maxWidth: 640, margin: '0 auto' }}>
            <div className="aw-alert aw-alert-success">
              <CheckCircle2 size={16} />
              <span>Your query has been received. Your reference number is <strong>{submitted.ticket}</strong>.</span>
            </div>
            <p className="aw-muted" style={{ margin: '0 0 12px' }}>
              The support team has been notified. You can follow it any time under <strong>My Queries</strong>.
            </p>
            <div className="aw-actions">
              <button type="button" className="aw-btn aw-btn-primary" onClick={resetForm}>Raise another query</button>
              <button type="button" className="aw-btn aw-btn-secondary" onClick={() => { resetForm(); setTab('mine'); }}>View my queries</button>
            </div>
          </section>
        ) : (
          <section className="aw-card" style={{ maxWidth: 820, margin: '0 auto' }}>
            {formError && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><span>{formError}</span></div>}

            <div className="aw-stack">
              <div>
                <span className="aw-label" id="sd-type-label">What kind of query is this?</span>
                <div className="aw-chips" role="radiogroup" aria-labelledby="sd-type-label">
                  {QUERY_TYPES.map((t) => (
                    <button key={t.value} type="button" role="radio" aria-checked={queryType === t.value} className="aw-chip" title={t.hint} onClick={() => setQueryType(t.value)}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="aw-meta" style={{ margin: '6px 0 0' }}>{QUERY_TYPES.find((t) => t.value === queryType)?.hint}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--aw-gap)' }}>
                <div>
                  <label className="aw-label" htmlFor="sd-module">Which window is it about?</label>
                  <select id="sd-module" className="aw-input" value={module} onChange={(e) => setModule(e.target.value)}>
                    <option value="">Not sure / not about a window</option>
                    {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <span className="aw-label" id="sd-pri-label">How urgent is it?</span>
                  <div className="aw-chips" role="radiogroup" aria-labelledby="sd-pri-label">
                    {PRIORITIES.map((p) => (
                      <button key={p.value} type="button" role="radio" aria-checked={priority === p.value} className="aw-chip" onClick={() => setPriority(p.value)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <label className="aw-label" htmlFor="sd-subject">Title</label>
                  <span className="aw-meta">{subject.length}/200</span>
                </div>
                <input id="sd-subject" className="aw-input" value={subject} maxLength={200}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Cash Book total does not match the day book" />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <label className="aw-label" htmlFor="sd-desc">Describe the problem</label>
                  <span className="aw-meta">{description.length}/5000</span>
                </div>
                <textarea id="sd-desc" className="aw-input" rows={6} value={description} maxLength={5000}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ padding: '8px 10px', resize: 'vertical', lineHeight: 1.45 }}
                  placeholder="What were you doing? What did you expect, and what happened instead? Include member numbers, dates or amounts if they help." />
              </div>

              <div>
                <span className="aw-label">Screenshot (optional)</span>
                {screenshot && preview ? (
                  <div className="aw-panel" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={preview} alt="Screenshot preview" style={{ maxHeight: 120, maxWidth: 220, borderRadius: 6, border: '1px solid var(--aw-border)' }} />
                    <div className="min-w-0" style={{ flex: 1 }}>
                      <div className="aw-strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{screenshot.name}</div>
                      <div className="aw-meta">{(screenshot.size / 1024).toFixed(0)} KB</div>
                    </div>
                    <button type="button" className="aw-icon-btn is-danger" aria-label="Remove screenshot" data-tip="Remove" onClick={() => setScreenshot(null)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="aw-panel"
                    tabIndex={0}
                    role="button"
                    aria-label="Add a screenshot: click to choose a file, drop one here, or paste with Ctrl+V"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, borderStyle: 'dashed', cursor: 'pointer' }}
                    onClick={() => fileInput.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click(); } }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); takeImage(e.dataTransfer.files?.[0]); }}
                  >
                    <ImagePlus size={22} style={{ color: 'var(--aw-accent)', flex: 'none' }} />
                    <div>
                      <div className="aw-strong">Click to choose, drag a file here, or paste</div>
                      <div className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ClipboardPaste size={11} /> Press <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> to capture the screen, then <kbd>Ctrl</kbd>+<kbd>V</kbd> here · PNG or JPEG, up to 3 MB
                      </div>
                    </div>
                  </div>
                )}
                <input ref={fileInput} type="file" accept="image/png,image/jpeg" hidden
                  onChange={(e) => { takeImage(e.target.files?.[0]); e.target.value = ''; }} />
              </div>

              <div className="aw-actions" style={{ justifyContent: 'space-between' }}>
                <span className="aw-meta" style={!canSubmit && !submitting ? { color: 'var(--aw-warning)' } : undefined}>
                  {!subjectOk
                    ? `Title needs at least 5 characters (${subject.trim().length}/5)`
                    : !descriptionOk
                      ? `Description needs at least 10 characters (${description.trim().length}/10)`
                      : <>Sent as <strong>{user?.username || 'you'}</strong>{appVersion ? ` · app v${appVersion}` : ''}</>}
                </span>
                <button type="button" className="aw-btn aw-btn-primary" disabled={!canSubmit} onClick={submit}>
                  <Send size={13} className={submitting ? 'aw-spin' : ''} /> {submitting ? 'Sending…' : 'Submit query'}
                </button>
              </div>
            </div>
          </section>
        ))}

        {tab === 'mine' && <section className="aw-card">{renderTable(mine, false)}</section>}
        {tab === 'all' && isAdmin && <section className="aw-card">{renderTable(all, true)}</section>}
      </div>
    </div>
  );
};

export default SupportDesk;
