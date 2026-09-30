import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Mail, Clock, CheckCircle, XCircle, RefreshCw,
  Zap, AlertCircle, Phone, MessageCircle, Inbox, X,
  CheckSquare, Square, Search, Wifi, WifiOff
} from 'lucide-react';
import { Select, message } from 'antd';
import { apiService } from '../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';


interface NotificationLog {
  id: number;
  memberNo: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  type: string;
  message: string;
  recipient: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  msgRef?: string;
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
}

interface Stats { totalPending: number; totalSent: number; totalFailed: number; }
interface ChannelStatus { email: boolean; sms: boolean; whatsapp: boolean; }

const CommunicationCenter: React.FC = () => {

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPending: 0, totalSent: 0, totalFailed: 0 });
  const [channels, setChannels] = useState<ChannelStatus>({ email: false, sms: false, whatsapp: false });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [showLookup, setShowLookup] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'compose'>('queue');

  const [form, setForm] = useState({
    memberNo: '', memberName: '',
    channel: 'SMS' as 'SMS' | 'WHATSAPP' | 'EMAIL',
    recipient: '', message: '',
  });

  // Channel selection before sending
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [pendingSendAction, setPendingSendAction] = useState<{ type: 'one' | 'batch'; id?: number } | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, statRes, chRes] = await Promise.all([
        apiService.get('/notifications/history?limit=500'),
        apiService.get('/notifications/stats'),
        apiService.get('/notifications/channel-status'),
      ]);
      setLogs(Array.isArray((logRes as any)?.data) ? (logRes as any).data : Array.isArray(logRes) ? logRes as any : []);
      const sd = (statRes as any)?.data || statRes;
      if (sd?.totalPending !== undefined) setStats(sd);
      const cd = (chRes as any)?.data || chRes;
      if (cd?.email !== undefined) setChannels(cd);
    } catch { message.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh every 30s to feel alive
  useEffect(() => {
    const timer = setInterval(() => { loadAll(); }, 30000);
    return () => clearInterval(timer);
  }, [loadAll]);

  const filtered = useMemo(() => logs.filter(l => {
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (channelFilter !== 'ALL' && l.channel !== channelFilter) return false;
    if (searchText && !l.memberNo.includes(searchText) && !l.recipient.includes(searchText) && !l.message.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  }), [logs, statusFilter, channelFilter, searchText]);

  const pendingFiltered = useMemo(() => filtered.filter(l => l.status === 'PENDING'), [filtered]);

  const toggleSelect = (id: number) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllPending = () => setSelectedIds(new Set(pendingFiltered.map(l => l.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const promptChannelAndSend = (type: 'one' | 'batch', id?: number) => {
    if (type === 'batch' && selectedIds.size === 0) return;
    setPendingSendAction({ type, id });
    setShowChannelPicker(true);
  };

  const executeSend = useCallback(async () => {
    if (!pendingSendAction) return;
    if (selectedChannel !== 'EMAIL') {
      // SMS and WhatsApp are paid services
      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'info',
          title: `${selectedChannel} Service`,
          message: `${selectedChannel} service requires activation`,
          detail: `${selectedChannel} notifications are a paid service.\n\nTo activate, contact:\n\nPaper White Technology\nEmail: thekovain@gmail.com\nPhone: +91 7692829866\n\nOnce activated, ${selectedChannel} messages will be sent automatically.`,
          buttons: ['OK'],
        });
      } else {
        alert(`${selectedChannel} service requires activation. Contact Paper White Technology.`);
      }
      setShowChannelPicker(false);
      setPendingSendAction(null);
      return;
    }

    setShowChannelPicker(false);
    setSending(true);
    try {
      if (pendingSendAction.type === 'batch') {
        const res = await apiService.post('/notifications/send-batch', {
          ids: Array.from(selectedIds), channel: selectedChannel,
        });
        const d = (res as any)?.data || res;
        message.success(`Sent: ${d?.sent || 0} | Failed: ${d?.failed || 0}`);
        clearSelection();
      } else if (pendingSendAction.id) {
        const res = await apiService.post(`/notifications/send-one/${pendingSendAction.id}`, {
          channel: selectedChannel,
        });
        const d = (res as any)?.data || res;
        d?.success ? message.success(`Sent via ${selectedChannel}! Ref: ${d.msgRef || ''}`) : message.error(d?.error || 'Failed');
      }
      await loadAll();
    } catch { message.error('Send failed'); }
    finally { setSending(false); setPendingSendAction(null); }
  }, [pendingSendAction, selectedChannel, selectedIds, loadAll]);

  // Keep old names as wrappers for backward compatibility
  const handleSendBatch = useCallback(() => promptChannelAndSend('batch'), [selectedIds]);
  const handleSendOne = useCallback((id: number) => promptChannelAndSend('one', id), []);

  const handleCancelBatch = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await apiService.post('/notifications/cancel-batch', { ids: Array.from(selectedIds) });
    message.info(`${selectedIds.size} cancelled`);
    clearSelection(); await loadAll();
  }, [selectedIds, loadAll]);

  const handleQueueManual = useCallback(async () => {
    if (!form.memberNo || !form.recipient || !form.message) { message.warning('Fill all fields'); return; }
    try {
      await apiService.post('/notifications/queue-manual', {
        memberNo: form.memberNo, channel: form.channel,
        recipient: form.recipient, message: form.message,
      });
      message.success('Queued for review');
      setForm(p => ({ ...p, message: '', recipient: '' }));
      setActiveTab('queue');
      await loadAll();
    } catch { message.error('Queue failed'); }
  }, [form, loadAll]);

  const handleTrigger = useCallback(async (type: 'emi' | 'maturity') => {
    try {
      await apiService.post(type === 'emi' ? '/notifications/trigger-emi-check' : '/notifications/trigger-maturity-check', {});
      message.success(`${type === 'emi' ? 'EMI' : 'Maturity'} alerts queued`);
      await loadAll();
    } catch { message.error('Trigger failed'); }
  }, [loadAll]);

  const handleMemberSelect = useCallback((m: any) => {
    setForm(p => ({ ...p, memberNo: m.memberNo || m.mbno || '', memberName: m.memberName || m.name || '' }));
    setShowLookup(false);
  }, []);

  const chIcon = (c: string, s = 14) => c === 'SMS' ? <Phone size={s} /> : c === 'WHATSAPP' ? <MessageCircle size={s} /> : <Mail size={s} />;
  const chTone = (c: string) => c === 'SMS' ? 'tone-info' : c === 'WHATSAPP' ? 'tone-success' : '';
  const stTone = (s: string) => s === 'SENT' ? 'tone-success' : s === 'PENDING' ? 'tone-warning' : s === 'FAILED' ? 'tone-danger' : 'tone-muted';

  const CHANNEL_CHOICES: { key: 'EMAIL' | 'SMS' | 'WHATSAPP'; title: string; badge: string; badgeTone: string; text: string; icon: React.ReactNode; tone: string }[] = [
    { key: 'EMAIL', title: 'Email (Gmail SMTP)', badge: 'Free', badgeTone: 'tone-success', text: 'Send via configured Gmail account. No cost.', icon: <Mail size={20} />, tone: '' },
    { key: 'SMS', title: 'SMS', badge: 'Paid Service', badgeTone: 'tone-warning', text: 'Contact Paper White Technology to activate SMS gateway.', icon: <Phone size={20} />, tone: 'tone-info' },
    { key: 'WHATSAPP', title: 'WhatsApp', badge: 'Paid Service', badgeTone: 'tone-warning', text: 'Contact Paper White Technology to activate WhatsApp Business API.', icon: <MessageCircle size={20} />, tone: 'tone-success' },
  ];

  const closeChannelPicker = () => { setShowChannelPicker(false); setPendingSendAction(null); };

  return (
    <div className="app-window">

      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Communication Hub</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Queue → Review → Send
            <span className="aw-pill tone-success"><i className="aw-status-dot" style={{ background: 'var(--aw-success)' }} />Live</span>
          </p>
        </div>
        <div className="aw-actions">
          {loading && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> Loading...
            </span>
          )}
          <div className="aw-status-strip">
            {(['email', 'sms', 'whatsapp'] as const).map(ch => (
              <span key={ch} className={channels[ch] ? 'is-on' : ''} data-tip={channels[ch] ? `${ch} configured` : `${ch} not configured`} data-tip-pos="bottom">
                {channels[ch] ? <Wifi size={13} /> : <WifiOff size={13} />}
                {ch}
              </span>
            ))}
          </div>
          <button type="button" onClick={loadAll} className="aw-btn aw-btn-secondary" data-tip="Reload the queue now" data-tip-pos="bottom-end">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="aw-fit">
        <div className="aw-split aw-split-form">

          {/* ── Left Panel ── */}
          <div className="aw-side">

            {/* Stats */}
            <div className="aw-stats aw-stats-3">
              {[
                { label: 'Pending', value: stats.totalPending, tone: 'tone-warning' },
                { label: 'Sent', value: stats.totalSent, tone: 'tone-success' },
                { label: 'Failed', value: stats.totalFailed, tone: 'tone-danger' },
              ].map(s => (
                <div key={s.label} className={`aw-stat ${s.tone}`}>
                  <div className="aw-stat-label">{s.label}</div>
                  <div className="aw-stat-value">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Tab switch: Auto Generate / Compose */}
            <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: activeTab === 'queue' ? 0 : 1, ['--seg-count' as any]: 2 }}>
              {(['queue', 'compose'] as const).map(tab => (
                <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>
                  {tab === 'queue' ? 'Auto Generate' : 'Compose Message'}
                </button>
              ))}
            </div>

            {activeTab === 'queue' ? (
              /* Auto-Generate Panel */
              <section className="aw-card aw-fade-in">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><Zap size={14} /></span>
                  <h2 className="aw-card-title">Auto-Generate Queue</h2>
                </div>
                <div className="aw-stack">
                  <button type="button" onClick={() => handleTrigger('emi')} className="aw-btn aw-btn-secondary" style={{ width: '100%' }}
                    data-tip="Queue alerts for members short on EMI">
                    <AlertCircle size={13} /> Generate EMI Deficit Alerts
                  </button>
                  <button type="button" onClick={() => handleTrigger('maturity')} className="aw-btn aw-btn-secondary" style={{ width: '100%' }}
                    data-tip="Queue alerts for accounts nearing maturity">
                    <Clock size={13} /> Generate Maturity Alerts
                  </button>
                  <div className="aw-panel">
                    <p className="aw-muted" style={{ textAlign: 'center', lineHeight: 1.5 }}>
                      Messages are <strong style={{ color: 'var(--aw-warning)' }}>queued only</strong> — they will NOT be sent until you review and click Send.
                      Duplicate messages are automatically prevented.
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              /* Compose Panel */
              <section className="aw-card aw-fade-in">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><Send size={14} /></span>
                  <h2 className="aw-card-title">Compose &amp; Queue</h2>
                </div>
                <div className="aw-stack">
                  <div>
                    <label className="aw-label" htmlFor="ch-member">Member</label>
                    <div className="aw-input-wrap has-action">
                      <input id="ch-member" value={form.memberNo} onChange={e => setForm(p => ({ ...p, memberNo: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') setShowLookup(true); }} placeholder="Member No" className="aw-input" />
                      <button type="button" onClick={() => setShowLookup(true)} className="aw-input-action" aria-label="Search members" data-tip="Search members" data-tip-pos="bottom-end">
                        <Search size={13} />
                      </button>
                    </div>
                    {form.memberName && <div className="aw-strong" style={{ marginTop: 4, color: 'var(--aw-accent)' }}>{form.memberName}</div>}
                  </div>
                  <div className="aw-two" style={{ gap: 10 }}>
                    <div>
                      <label className="aw-label" htmlFor="ch-channel">Channel</label>
                      <Select id="ch-channel" value={form.channel} onChange={v => setForm(p => ({ ...p, channel: v }))} className="aw-select" popupClassName="aw-select-popup"
                        options={[{ value: 'SMS', label: 'SMS' }, { value: 'WHATSAPP', label: 'WhatsApp' }, { value: 'EMAIL', label: 'Email' }]} />
                    </div>
                    <div>
                      <label className="aw-label" htmlFor="ch-recipient">Recipient</label>
                      <input id="ch-recipient" value={form.recipient} onChange={e => setForm(p => ({ ...p, recipient: e.target.value }))} placeholder="Phone/Email" className="aw-input" />
                    </div>
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="ch-message">Message</label>
                    <textarea id="ch-message" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      rows={3} placeholder="Type message..." className="aw-input" />
                  </div>
                  <button type="button" onClick={handleQueueManual} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                    <Inbox size={13} /> Queue for Review
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* ── Main: Message Queue ── */}
          <section className="aw-card aw-main">

            {/* Toolbar */}
            <div className="aw-main-head">
              <div className="aw-toolbar">
                <span className="aw-card-icon"><Inbox size={14} /></span>
                <h2 className="aw-card-title">Message Queue</h2>
                <span className="aw-pill">{filtered.length}</span>
                <div className="aw-input-wrap has-icon" style={{ width: 170 }}>
                  <Search size={13} />
                  <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search..." aria-label="Search messages" className="aw-input" />
                </div>
                <Select value={statusFilter} onChange={setStatusFilter} className="aw-select" popupClassName="aw-select-popup" style={{ width: 130 }}
                  options={[{ value: 'ALL', label: 'All Status' }, { value: 'PENDING', label: 'Pending' }, { value: 'SENT', label: 'Sent' }, { value: 'FAILED', label: 'Failed' }]} />
                <Select value={channelFilter} onChange={setChannelFilter} className="aw-select" popupClassName="aw-select-popup" style={{ width: 140 }}
                  options={[{ value: 'ALL', label: 'All Channel' }, { value: 'SMS', label: 'SMS' }, { value: 'WHATSAPP', label: 'WhatsApp' }, { value: 'EMAIL', label: 'Email' }]} />
              </div>

              {/* Bulk actions */}
              <div className="aw-toolbar">
                {selectedIds.size > 0 ? (
                  <>
                    <span className="aw-pill">{selectedIds.size} selected</span>
                    <button type="button" onClick={handleSendBatch} disabled={sending} className="aw-btn aw-btn-primary aw-btn-sm">
                      {sending ? <RefreshCw size={12} className="aw-spin" /> : <Send size={12} />} Send
                    </button>
                    <button type="button" onClick={handleCancelBatch} className="aw-btn aw-btn-danger aw-btn-sm" data-tip="Cancel the selected messages" data-tip-pos="bottom">
                      <XCircle size={12} /> Cancel
                    </button>
                    <button type="button" onClick={clearSelection} className="aw-btn aw-btn-ghost aw-btn-sm" data-tip="Clear the selection" data-tip-pos="bottom-end">
                      <Square size={12} /> Clear
                    </button>
                  </>
                ) : pendingFiltered.length > 0 ? (
                  <button type="button" onClick={selectAllPending} className="aw-btn aw-btn-secondary aw-btn-sm">
                    <CheckSquare size={12} /> Select All Pending ({pendingFiltered.length})
                  </button>
                ) : null}
              </div>
            </div>

            {/* Message list */}
            <div className="aw-main-body" style={{ padding: 0 }}>
              {filtered.length > 0 ? filtered.map(log => (
                <div key={log.id} className={`aw-list-row ${selectedIds.has(log.id) ? 'is-selected' : ''}`}>

                  {/* Checkbox / status */}
                  <div style={{ width: 24, flex: 'none', paddingTop: 3 }}>
                    {log.status === 'PENDING' ? (
                      <button type="button" role="checkbox" aria-checked={selectedIds.has(log.id)} aria-label={`Select message ${log.id}`}
                        onClick={() => toggleSelect(log.id)} className="aw-check">
                        {selectedIds.has(log.id) ? <CheckSquare size={17} /> : <Square size={17} />}
                      </button>
                    ) : (
                      <span className={`aw-icon-tile ${stTone(log.status)}`} style={{ width: 22, height: 22 }}>
                        {log.status === 'SENT' ? <CheckCircle size={12} /> : log.status === 'FAILED' ? <XCircle size={12} /> : <Clock size={12} />}
                      </span>
                    )}
                  </div>

                  {/* Channel icon */}
                  <span className={`aw-icon-tile ${chTone(log.channel)}`}>{chIcon(log.channel)}</span>

                  {/* Content */}
                  <div className="aw-list-body">
                    <div className="aw-list-line" style={{ marginBottom: 3 }}>
                      <span className="aw-strong">MB: {log.memberNo}</span>
                      <span className={`aw-pill ${chTone(log.channel)}`}>{log.channel}</span>
                      <span className={`aw-pill ${stTone(log.status)}`}>{log.status}</span>
                      <span className="aw-meta" style={{ textTransform: 'uppercase' }}>{log.type?.replace(/_/g, ' ')}</span>
                      {log.msgRef && <span className="aw-meta font-mono">{log.msgRef}</span>}
                    </div>
                    <div className="aw-muted aw-clamp-2" style={{ lineHeight: 1.4 }} title={log.message}>
                      <strong style={{ color: 'var(--aw-accent)' }}>{log.recipient}</strong> — {log.message}
                    </div>
                    <div className="aw-list-line" style={{ marginTop: 3 }}>
                      <span className="aw-meta">{dayjs(log.createdAt).format('DD-MMM-YY HH:mm')}</span>
                      {log.sentAt && <span className="aw-meta" style={{ color: 'var(--aw-success)' }}>Sent {dayjs(log.sentAt).format('DD-MMM HH:mm')}</span>}
                      {log.errorMessage && <span className="aw-meta" style={{ color: 'var(--aw-danger)' }} title={log.errorMessage}>Error: {log.errorMessage.substring(0, 50)}</span>}
                    </div>
                  </div>

                  {/* Action */}
                  <div style={{ flex: 'none' }}>
                    {log.status === 'PENDING' && (
                      <button type="button" onClick={() => handleSendOne(log.id)} disabled={sending} className="aw-btn aw-btn-primary aw-btn-sm">
                        <Send size={12} /> Send
                      </button>
                    )}
                    {log.status === 'FAILED' && (
                      <button type="button" onClick={() => handleSendOne(log.id)} disabled={sending} className="aw-btn aw-btn-warning aw-btn-sm">
                        <RefreshCw size={12} /> Retry
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="aw-empty" style={{ minHeight: '100%' }}>
                  <Inbox size={38} />
                  <strong className="aw-strong">Message queue is empty</strong>
                  <span>Generate auto-alerts or compose a message to get started</span>
                </div>
              )}
            </div>

            {/* Footer summary */}
            <div className="aw-main-foot">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ color: 'var(--aw-success)' }}><i className="aw-status-dot" />LIVE</span>
                <span>
                  {filtered.length} of {logs.length} messages
                  {searchText && ` · "${searchText}"`}
                  {' · Auto-refresh 30s'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>{dayjs().format('DD-MMM-YYYY HH:mm')}</span>
                <span style={{ color: 'var(--aw-accent)' }}>Paper White Technology</span>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Member Lookup Modal */}
      {showLookup && (
        <div className="aw-modal-backdrop" onClick={() => setShowLookup(false)}>
          <div className="aw-modal" role="dialog" aria-modal="true" aria-label="Member Lookup" style={{ maxWidth: '62rem' }} onClick={e => e.stopPropagation()}>
            <div className="aw-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="aw-card-icon"><Search size={14} /></span>
                <h2 className="aw-card-title">Member Lookup</h2>
              </div>
              <button type="button" onClick={() => setShowLookup(false)} className="aw-icon-btn" aria-label="Close" data-tip="Close" data-tip-pos="bottom-end">
                <X size={15} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
              <MemberLookup isModal onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Channel Selection Modal */}
      {showChannelPicker && (
        <div className="aw-modal-backdrop" onClick={closeChannelPicker}>
          <div className="aw-modal" role="dialog" aria-modal="true" aria-label="Choose Delivery Channel"
            style={{ maxWidth: '27rem', height: 'auto', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="aw-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="aw-card-icon"><Send size={14} /></span>
                <h2 className="aw-card-title" style={{ textTransform: 'uppercase' }}>Choose Delivery Channel</h2>
              </div>
              <button type="button" onClick={closeChannelPicker} className="aw-icon-btn" aria-label="Close" data-tip="Close" data-tip-pos="bottom-end">
                <X size={15} />
              </button>
            </div>
            <div className="aw-stack" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
              <p className="aw-muted">Select how you want to deliver this notification:</p>
              {CHANNEL_CHOICES.map(c => (
                <button key={c.key} type="button" onClick={() => setSelectedChannel(c.key)} aria-pressed={selectedChannel === c.key} className="aw-choice"
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`aw-icon-tile ${c.tone}`} style={{ width: 40, height: 40 }}>{c.icon}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="aw-strong">{c.title}</span>
                      <span className={`aw-pill ${c.badgeTone}`} style={{ textTransform: 'uppercase' }}>{c.badge}</span>
                    </span>
                    <span className="aw-meta" style={{ display: 'block', marginTop: 2 }}>{c.text}</span>
                  </span>
                  {selectedChannel === c.key && <CheckCircle size={18} style={{ color: 'var(--aw-accent)', flex: 'none' }} />}
                </button>
              ))}
              <div className="aw-btn-row" style={{ justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button" onClick={closeChannelPicker} className="aw-btn aw-btn-secondary" style={{ flex: 'none' }}>Cancel</button>
                <button type="button" onClick={executeSend} className="aw-btn aw-btn-primary" style={{ flex: 'none' }}>
                  <Send size={13} /> Send via {selectedChannel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationCenter;
