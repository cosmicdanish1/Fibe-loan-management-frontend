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
import { useTranslation } from 'react-i18next';


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
  const { t } = useTranslation();

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
      if (logRes.success) {
        setLogs(Array.isArray((logRes as any)?.data) ? (logRes as any).data : []);
      } else {
        // keep the previously loaded logs rather than blanking the queue
        message.error(logRes.message || logRes.error || t('Failed to load notification history'));
      }
      if (statRes.success) {
        const sd = (statRes as any)?.data;
        if (sd?.totalPending !== undefined) setStats(sd);
      }
      if (chRes.success) {
        const cd = (chRes as any)?.data;
        if (cd?.email !== undefined) setChannels(cd);
      }
    } catch { message.error(t('Failed to load')); }
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
    setPendingSendAction(id !== undefined ? { type, id } : { type });
    setShowChannelPicker(true);
  };

  const executeSend = useCallback(async () => {
    if (!pendingSendAction) return;
    if (selectedChannel !== 'EMAIL') {
      // SMS and WhatsApp are paid services
      if (window.electronAPI?.showMessageBox) {
        await window.electronAPI.showMessageBox({
          type: 'info',
          title: t('{{1}} Service', { 1: selectedChannel }),
          message: `${selectedChannel} service requires activation`,
          detail: `${selectedChannel} notifications are a paid service.\n\nTo activate, contact:\n\nPaper White Technology\nEmail: thekovain@gmail.com\nPhone: +91 7692829866\n\nOnce activated, ${selectedChannel} messages will be sent automatically.`,
          buttons: ['OK'],
        });
      } else {
        alert(t('{{1}} service requires activation. Contact Paper White Technology.', { 1: selectedChannel }));
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
        if (!res.success) {
          message.error(res.message || res.error || t('Batch send failed'));
        } else {
          const d = (res as any)?.data;
          message.success(t('Sent: {{1}} | Failed: {{2}}', { 1: d?.sent || 0, 2: d?.failed || 0 }));
          clearSelection();
        }
      } else if (pendingSendAction.id) {
        const res = await apiService.post(`/notifications/send-one/${pendingSendAction.id}`, {
          channel: selectedChannel,
        });
        const d = res.success ? ((res as any)?.data || res) : { success: false, error: res.message || res.error };
        d?.success ? message.success(t('Sent via {{1}}! Ref: {{2}}', { 1: selectedChannel, 2: d.msgRef || '' })) : message.error(d?.error || t('Failed'));
      }
      await loadAll();
    } catch { message.error(t('Send failed')); }
    finally { setSending(false); setPendingSendAction(null); }
  }, [pendingSendAction, selectedChannel, selectedIds, loadAll]);

  // Keep old names as wrappers for backward compatibility
  const handleSendBatch = useCallback(() => promptChannelAndSend('batch'), [selectedIds]);
  const handleSendOne = useCallback((id: number) => promptChannelAndSend('one', id), []);

  const handleCancelBatch = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const res = await apiService.post('/notifications/cancel-batch', { ids: Array.from(selectedIds) });
    if (!res.success) { message.error(res.message || res.error || t('Cancel failed')); return; }
    message.info(t('{{1}} cancelled', { 1: selectedIds.size }));
    clearSelection(); await loadAll();
  }, [selectedIds, loadAll]);

  const handleQueueManual = useCallback(async () => {
    if (!form.memberNo || !form.recipient || !form.message) { message.warning(t('Fill all fields')); return; }
    try {
      const res = await apiService.post('/notifications/queue-manual', {
        memberNo: form.memberNo, channel: form.channel,
        recipient: form.recipient, message: form.message,
      });
      if (!res.success) { message.error(res.message || res.error || t('Queue failed')); return; }
      message.success(t('Queued for review'));
      setForm(p => ({ ...p, message: '', recipient: '' }));
      setActiveTab('queue');
      await loadAll();
    } catch { message.error(t('Queue failed')); }
  }, [form, loadAll]);

  const handleTrigger = useCallback(async (type: 'emi' | 'maturity') => {
    try {
      const res = await apiService.post(type === 'emi' ? '/notifications/trigger-emi-check' : '/notifications/trigger-maturity-check', {});
      if (!res.success) { message.error(res.message || res.error || t('Trigger failed')); return; }
      message.success(t('{{1}} alerts queued', { 1: type === 'emi' ? 'EMI' : 'Maturity' }));
      await loadAll();
    } catch { message.error(t('Trigger failed')); }
  }, [loadAll]);

  const handleMemberSelect = useCallback((m: any) => {
    setForm(p => ({ ...p, memberNo: m.memberNo || m.mbno || '', memberName: m.memberName || m.name || '' }));
    setShowLookup(false);
  }, []);

  const chIcon = (c: string, s = 14) => c === 'SMS' ? <Phone size={s} /> : c === 'WHATSAPP' ? <MessageCircle size={s} /> : <Mail size={s} />;
  const chTone = (c: string) => c === 'SMS' ? 'tone-info' : c === 'WHATSAPP' ? 'tone-success' : '';
  const stTone = (s: string) => s === 'SENT' ? 'tone-success' : s === 'PENDING' ? 'tone-warning' : s === 'FAILED' ? 'tone-danger' : 'tone-muted';

  const CHANNEL_CHOICES: { key: 'EMAIL' | 'SMS' | 'WHATSAPP'; title: string; badge: string; badgeTone: string; text: string; icon: React.ReactNode; tone: string }[] = [
    { key: 'EMAIL', title: t('Email (Gmail SMTP)'), badge: 'Free', badgeTone: 'tone-success', text: 'Send via configured Gmail account. No cost.', icon: <Mail size={20} />, tone: '' },
    { key: 'SMS', title: 'SMS', badge: 'Paid Service', badgeTone: 'tone-warning', text: 'Contact Paper White Technology to activate SMS gateway.', icon: <Phone size={20} />, tone: 'tone-info' },
    { key: 'WHATSAPP', title: t('WhatsApp'), badge: 'Paid Service', badgeTone: 'tone-warning', text: 'Contact Paper White Technology to activate WhatsApp Business API.', icon: <MessageCircle size={20} />, tone: 'tone-success' },
  ];

  const closeChannelPicker = () => { setShowChannelPicker(false); setPendingSendAction(null); };

  return (
    <div className="app-window">

      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Communication Hub')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('Queue → Review → Send')}
            <span className="aw-pill tone-success"><i className="aw-status-dot" style={{ background: 'var(--aw-success)' }} />{t('Live')}</span>
          </p>
        </div>
        <div className="aw-actions">
          {loading && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> {t('Loading...')}
            </span>
          )}
          <div className="aw-status-strip">
            {(['email', 'sms', 'whatsapp'] as const).map(ch => (
              <span key={ch} className={channels[ch] ? 'is-on' : ''} data-tip={channels[ch] ? t('{{1}} configured', { 1: ch }) : t('{{1}} not configured', { 1: ch })} data-tip-pos="bottom">
                {channels[ch] ? <Wifi size={13} /> : <WifiOff size={13} />}
                {ch}
              </span>
            ))}
          </div>
          <button type="button" onClick={loadAll} className="aw-btn aw-btn-secondary" data-tip={t('Reload the queue now')} data-tip-pos="bottom-end">
            <RefreshCw size={13} /> {t('Refresh')}
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
                { label: t('Pending'), value: stats.totalPending, tone: 'tone-warning' },
                { label: t('Sent'), value: stats.totalSent, tone: 'tone-success' },
                { label: t('Failed'), value: stats.totalFailed, tone: 'tone-danger' },
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
                  {tab === 'queue' ? t('Auto Generate') : t('Compose Message')}
                </button>
              ))}
            </div>

            {activeTab === 'queue' ? (
              /* Auto-Generate Panel */
              <section className="aw-card aw-fade-in">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><Zap size={14} /></span>
                  <h2 className="aw-card-title">{t('Auto-Generate Queue')}</h2>
                </div>
                <div className="aw-stack">
                  <button type="button" onClick={() => handleTrigger('emi')} className="aw-btn aw-btn-secondary" style={{ width: '100%' }}
                    data-tip={t('Queue alerts for members short on EMI')}>
                    <AlertCircle size={13} /> {t('Generate EMI Deficit Alerts')}
                  </button>
                  <button type="button" onClick={() => handleTrigger('maturity')} className="aw-btn aw-btn-secondary" style={{ width: '100%' }}
                    data-tip={t('Queue alerts for accounts nearing maturity')}>
                    <Clock size={13} /> {t('Generate Maturity Alerts')}
                  </button>
                  <div className="aw-panel">
                    <p className="aw-muted" style={{ textAlign: 'center', lineHeight: 1.5 }}>
                      {t('Messages are')} <strong style={{ color: 'var(--aw-warning)' }}>{t('queued only')}</strong> — they will NOT be sent until you review and click Send.
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
                  <h2 className="aw-card-title">{t('Compose & Queue')}</h2>
                </div>
                <div className="aw-stack">
                  <div>
                    <label className="aw-label" htmlFor="ch-member">{t('Member')}</label>
                    <div className="aw-input-wrap has-action">
                      <input id="ch-member" value={form.memberNo} onChange={e => setForm(p => ({ ...p, memberNo: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') setShowLookup(true); }} placeholder={t('Member No')} className="aw-input" />
                      <button type="button" onClick={() => setShowLookup(true)} className="aw-input-action" aria-label={t('Search members')} data-tip={t('Search members')} data-tip-pos="bottom-end">
                        <Search size={13} />
                      </button>
                    </div>
                    {form.memberName && <div className="aw-strong" style={{ marginTop: 4, color: 'var(--aw-accent)' }}>{form.memberName}</div>}
                  </div>
                  <div className="aw-two" style={{ gap: 10 }}>
                    <div>
                      <label className="aw-label" htmlFor="ch-channel">{t('Channel')}</label>
                      <Select id="ch-channel" value={form.channel} onChange={v => setForm(p => ({ ...p, channel: v }))} className="aw-select" popupClassName="aw-select-popup"
                        options={[{ value: 'SMS', label: 'SMS' }, { value: 'WHATSAPP', label: t('WhatsApp') }, { value: 'EMAIL', label: t('Email') }]} />
                    </div>
                    <div>
                      <label className="aw-label" htmlFor="ch-recipient">{t('Recipient')}</label>
                      <input id="ch-recipient" value={form.recipient} onChange={e => setForm(p => ({ ...p, recipient: e.target.value }))} placeholder={t('Phone/Email')} className="aw-input" />
                    </div>
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="ch-message">{t('Message')}</label>
                    <textarea id="ch-message" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      rows={3} placeholder={t('Type message...')} className="aw-input" />
                  </div>
                  <button type="button" onClick={handleQueueManual} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                    <Inbox size={13} /> {t('Queue for Review')}
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
                <h2 className="aw-card-title">{t('Message Queue')}</h2>
                <span className="aw-pill">{filtered.length}</span>
                <div className="aw-input-wrap has-icon" style={{ width: 170 }}>
                  <Search size={13} />
                  <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder={t('Search...')} aria-label={t('Search messages')} className="aw-input" />
                </div>
                <Select value={statusFilter} onChange={setStatusFilter} className="aw-select" popupClassName="aw-select-popup" style={{ width: 130 }}
                  options={[{ value: 'ALL', label: t('All Status') }, { value: 'PENDING', label: t('Pending') }, { value: 'SENT', label: t('Sent') }, { value: 'FAILED', label: t('Failed') }]} />
                <Select value={channelFilter} onChange={setChannelFilter} className="aw-select" popupClassName="aw-select-popup" style={{ width: 140 }}
                  options={[{ value: 'ALL', label: t('All Channel') }, { value: 'SMS', label: 'SMS' }, { value: 'WHATSAPP', label: t('WhatsApp') }, { value: 'EMAIL', label: t('Email') }]} />
              </div>

              {/* Bulk actions */}
              <div className="aw-toolbar">
                {selectedIds.size > 0 ? (
                  <>
                    <span className="aw-pill">{t('{{1}} selected', { 1: selectedIds.size })}</span>
                    <button type="button" onClick={handleSendBatch} disabled={sending} className="aw-btn aw-btn-primary aw-btn-sm">
                      {sending ? <RefreshCw size={12} className="aw-spin" /> : <Send size={12} />} {t('Send')}
                    </button>
                    <button type="button" onClick={handleCancelBatch} className="aw-btn aw-btn-danger aw-btn-sm" data-tip={t('Cancel the selected messages')} data-tip-pos="bottom">
                      <XCircle size={12} /> {t('Cancel')}
                    </button>
                    <button type="button" onClick={clearSelection} className="aw-btn aw-btn-ghost aw-btn-sm" data-tip={t('Clear the selection')} data-tip-pos="bottom-end">
                      <Square size={12} /> {t('Clear')}
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
                      <button type="button" role="checkbox" aria-checked={selectedIds.has(log.id)} aria-label={t('Select message {{1}}', { 1: log.id })}
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
                      {log.sentAt && <span className="aw-meta" style={{ color: 'var(--aw-success)' }}>{t('Sent')} {dayjs(log.sentAt).format('DD-MMM HH:mm')}</span>}
                      {log.errorMessage && <span className="aw-meta" style={{ color: 'var(--aw-danger)' }} title={log.errorMessage}>{t('Error:')} {log.errorMessage.substring(0, 50)}</span>}
                    </div>
                  </div>

                  {/* Action */}
                  <div style={{ flex: 'none' }}>
                    {log.status === 'PENDING' && (
                      <button type="button" onClick={() => handleSendOne(log.id)} disabled={sending} className="aw-btn aw-btn-primary aw-btn-sm">
                        <Send size={12} /> {t('Send')}
                      </button>
                    )}
                    {log.status === 'FAILED' && (
                      <button type="button" onClick={() => handleSendOne(log.id)} disabled={sending} className="aw-btn aw-btn-warning aw-btn-sm">
                        <RefreshCw size={12} /> {t('Retry')}
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="aw-empty" style={{ minHeight: '100%' }}>
                  <Inbox size={38} />
                  <strong className="aw-strong">{t('Message queue is empty')}</strong>
                  <span>{t('Generate auto-alerts or compose a message to get started')}</span>
                </div>
              )}
            </div>

            {/* Footer summary */}
            <div className="aw-main-foot">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ color: 'var(--aw-success)' }}><i className="aw-status-dot" />LIVE</span>
                <span>{t('{{1}} of {{2}} messages {{3}} {{4}}', { 1: filtered.length, 2: logs.length, 3: searchText && ` · "${searchText}"`, 4: ' · ' + t('Auto-refresh 30s') })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>{dayjs().format('DD-MMM-YYYY HH:mm')}</span>
                <span style={{ color: 'var(--aw-accent)' }}>{t('Paper White Technology')}</span>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Member Lookup Modal */}
      {showLookup && (
        <div className="aw-modal-backdrop" onClick={() => setShowLookup(false)}>
          <div className="aw-modal" role="dialog" aria-modal="true" aria-label={t('Member Lookup')} style={{ maxWidth: '62rem' }} onClick={e => e.stopPropagation()}>
            <div className="aw-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="aw-card-icon"><Search size={14} /></span>
                <h2 className="aw-card-title">{t('Member Lookup')}</h2>
              </div>
              <button type="button" onClick={() => setShowLookup(false)} className="aw-icon-btn" aria-label={t('Close')} data-tip={t('Close')} data-tip-pos="bottom-end">
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
          <div className="aw-modal" role="dialog" aria-modal="true" aria-label={t('Choose Delivery Channel')}
            style={{ maxWidth: '27rem', height: 'auto', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="aw-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="aw-card-icon"><Send size={14} /></span>
                <h2 className="aw-card-title" style={{ textTransform: 'uppercase' }}>{t('Choose Delivery Channel')}</h2>
              </div>
              <button type="button" onClick={closeChannelPicker} className="aw-icon-btn" aria-label={t('Close')} data-tip={t('Close')} data-tip-pos="bottom-end">
                <X size={15} />
              </button>
            </div>
            <div className="aw-stack" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
              <p className="aw-muted">{t('Select how you want to deliver this notification:')}</p>
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
                <button type="button" onClick={closeChannelPicker} className="aw-btn aw-btn-secondary" style={{ flex: 'none' }}>{t('Cancel')}</button>
                <button type="button" onClick={executeSend} className="aw-btn aw-btn-primary" style={{ flex: 'none' }}>
                  <Send size={13} /> {t('Send via')} {selectedChannel}
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
