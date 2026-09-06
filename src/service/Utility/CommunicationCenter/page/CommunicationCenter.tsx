import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare, Send, Mail, Clock, CheckCircle, XCircle, RefreshCw,
  Zap, AlertCircle, Phone, MessageCircle, Trash2, Inbox, ArrowRight,
  Filter, CheckSquare, Square, Search, ChevronDown, Wifi, WifiOff
} from 'lucide-react';
import { ConfigProvider, Button, Input, Select, Spin, Tag, message, Modal, Badge, theme as antdTheme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { apiService } from '../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';

const { TextArea } = Input;

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
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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
          detail: `${selectedChannel} notifications are a paid service.\n\nTo activate, contact:\n\nPaperWhite Technology\nEmail: support@paperwhite.in\nPhone: +91-XXXXXXXXXX\n\nOnce activated, ${selectedChannel} messages will be sent automatically.`,
          buttons: ['OK'],
        });
      } else {
        alert(`${selectedChannel} service requires activation. Contact PaperWhite Technology.`);
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

  const chIcon = (c: string, s = 11) => c === 'SMS' ? <Phone size={s} /> : c === 'WHATSAPP' ? <MessageCircle size={s} /> : <Mail size={s} />;
  const chClr = (c: string) => c === 'SMS' ? '#3b82f6' : c === 'WHATSAPP' ? '#22c55e' : '#8b5cf6';
  const stClr = (s: string) => s === 'SENT' ? '#22c55e' : s === 'PENDING' ? '#f59e0b' : s === 'FAILED' ? '#ef4444' : '#94a3b8';

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: { colorPrimary: '#6366f1', borderRadius: 8, fontSize: 12 },
    }}>
      <style>{`
        @keyframes ch-fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ch-pulse-ring{0%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)}70%{box-shadow:0 0 0 10px rgba(99,102,241,0)}100%{box-shadow:0 0 0 0 rgba(99,102,241,0)}}
        @keyframes ch-slide-right{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes ch-count-pop{0%{transform:scale(0.8)}60%{transform:scale(1.12)}100%{transform:scale(1)}}
        @keyframes ch-breathe{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:0.7;transform:scale(1.03)}}
        @keyframes ch-float-1{0%,100%{transform:translateY(0) translateX(0)}25%{transform:translateY(-18px) translateX(8px)}50%{transform:translateY(-6px) translateX(16px)}75%{transform:translateY(-22px) translateX(4px)}}
        @keyframes ch-float-2{0%,100%{transform:translateY(0) translateX(0)}25%{transform:translateY(-12px) translateX(-10px)}50%{transform:translateY(-24px) translateX(-4px)}75%{transform:translateY(-8px) translateX(-14px)}}
        @keyframes ch-float-3{0%,100%{transform:translateY(0) translateX(0)}33%{transform:translateY(-16px) translateX(12px)}66%{transform:translateY(-28px) translateX(-6px)}}
        @keyframes ch-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes ch-gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes ch-live-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
        @keyframes ch-wave{0%,100%{transform:scaleY(0.4)}50%{transform:scaleY(1)}}
        @keyframes ch-ping{75%,100%{transform:scale(2);opacity:0}}
        @keyframes ch-row-hover-glow{from{box-shadow:inset 0 0 0 0 rgba(99,102,241,0)}to{box-shadow:inset 0 0 0 1px rgba(99,102,241,0.15)}}

        .ch-row{animation:ch-fade-in .35s cubic-bezier(.16,1,.3,1) both}
        .ch-row:nth-child(1){animation-delay:0s}.ch-row:nth-child(2){animation-delay:.04s}.ch-row:nth-child(3){animation-delay:.08s}
        .ch-row:nth-child(4){animation-delay:.12s}.ch-row:nth-child(5){animation-delay:.16s}.ch-row:nth-child(6){animation-delay:.2s}
        .ch-row:nth-child(7){animation-delay:.24s}.ch-row:nth-child(8){animation-delay:.28s}
        .ch-row:hover{background:linear-gradient(90deg,rgba(99,102,241,${isDark ? '0.08' : '0.03'}),rgba(139,92,246,${isDark ? '0.06' : '0.03'}),transparent) !important}
        .ch-row:hover .ch-send-btn{transform:scale(1.05)}

        .ch-stat{animation:ch-slide-right .5s cubic-bezier(.16,1,.3,1) both}
        .ch-stat:nth-child(1){animation-delay:0s}.ch-stat:nth-child(2){animation-delay:.12s}.ch-stat:nth-child(3){animation-delay:.24s}
        .ch-stat:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.08) !important}
        .ch-stat{transition:transform .2s,box-shadow .2s}

        .ch-badge{animation:ch-count-pop .4s cubic-bezier(.16,1,.3,1)}
        .ch-scroll::-webkit-scrollbar{width:4px}
        .ch-scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(99,102,241,${isDark ? '0.3' : '0.2'}),rgba(139,92,246,${isDark ? '0.15' : '0.1'}));border-radius:4px}
        .ch-glow{box-shadow:0 0 24px rgba(99,102,241,0.06),0 1px 3px rgba(0,0,0,0.04)}
        .ch-glow:hover{box-shadow:0 0 30px rgba(99,102,241,0.1),0 4px 12px rgba(0,0,0,0.06)}

        .ch-header-bg{background-size:200% 200%;animation:ch-gradient-shift 8s ease infinite}
        .ch-shimmer-bar{background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);background-size:200% 100%;animation:ch-shimmer 3s linear infinite}
        .ch-live-indicator{animation:ch-live-dot 1.5s ease-in-out infinite}

        .ch-send-btn{transition:transform .15s,box-shadow .15s}
        .ch-send-btn:hover{transform:scale(1.08) !important;box-shadow:0 4px 12px rgba(34,197,94,0.3) !important}
        .ch-retry-btn:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(245,158,11,0.3)}

        /* ── Communication Center — dark mode (Settings-panel palette) ── */
        html.dark .comm-hub { background-color: #000000 !important; color: #f5f5f7 !important; }
        html.dark .comm-hub .bg-slate-900 { background-color: #000000 !important; }
        html.dark .comm-hub .bg-slate-800 { background-color: #1c1c1e !important; }
        html.dark .comm-hub .bg-slate-800\/80 { background-color: #0c0c0e !important; }
        html.dark .comm-hub .bg-slate-800\/60 { background-color: #0c0c0e !important; }
        html.dark .comm-hub .border-slate-700 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .comm-hub .border-slate-700\/50 { border-color: rgba(255,255,255,.07) !important; }
        html.dark .comm-hub .border-slate-600 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .comm-hub .bg-slate-700\/50 { background-color: rgba(255,255,255,.05) !important; }
        html.dark .comm-hub .text-slate-200 { color: #f5f5f7 !important; }
        html.dark .comm-hub .text-slate-300 { color: #71717a !important; }
        html.dark .comm-hub .text-slate-400 { color: #8e8e93 !important; }
        html.dark .comm-hub .text-slate-500 { color: #8e8e93 !important; }
        html.dark .comm-hub .text-slate-600 { color: #71717a !important; }
        html.dark .comm-hub input,
        html.dark .comm-hub textarea,
        html.dark .comm-hub .ant-input,
        html.dark .comm-hub .ant-input-affix-wrapper,
        html.dark .comm-hub .ant-select-selector {
          background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }

        /* Modals are React-portaled to <body>, so they are styled by unscoped class names below */
        html.dark .ch-lookup-modal .ant-modal-content,
        html.dark .ch-channel-modal .ant-modal-content { background-color: #1c1c1e !important; }
        html.dark .ch-lookup-modal .ant-modal-header,
        html.dark .ch-channel-modal .ant-modal-header { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .ch-channel-modal .text-slate-500 { color: #8e8e93 !important; }
        html.dark .ch-channel-modal .text-slate-800 { color: #f5f5f7 !important; }
        html.dark .ch-channel-modal .text-slate-600 { color: #8e8e93 !important; }
        html.dark .ch-channel-modal .bg-white { background-color: #1c1c1e !important; }
        html.dark .ch-channel-modal .border-slate-200 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .ch-channel-modal .border-slate-300 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .ch-channel-modal button.border-slate-200,
        html.dark .ch-channel-modal button.border-slate-300 { background-color: rgba(255,255,255,.03) !important; }
        html.dark .ch-channel-modal .hover\:bg-slate-50:hover { background-color: rgba(255,255,255,.05) !important; }
      `}</style>

      <div className={`comm-hub h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50'}`}>

        {/* ── Header ── */}
        <div className="ch-header-bg bg-gradient-to-r from-slate-900 to-slate-900 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xl relative overflow-hidden"
          style={{ backgroundSize: '200% 200%' }}>
          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { w: 3, h: 3, l: '10%', t: '20%', anim: 'ch-float-1 12s ease-in-out infinite', opacity: 0.15 },
              { w: 2, h: 2, l: '30%', t: '60%', anim: 'ch-float-2 10s ease-in-out infinite 1s', opacity: 0.1 },
              { w: 4, h: 4, l: '55%', t: '30%', anim: 'ch-float-3 14s ease-in-out infinite 2s', opacity: 0.08 },
              { w: 2, h: 2, l: '75%', t: '50%', anim: 'ch-float-1 11s ease-in-out infinite 3s', opacity: 0.12 },
              { w: 3, h: 3, l: '90%', t: '25%', anim: 'ch-float-2 13s ease-in-out infinite 0.5s', opacity: 0.1 },
            ].map((p, i) => (
              <div key={i} className="absolute rounded-full bg-indigo-400"
                style={{ width: p.w, height: p.h, left: p.l, top: p.t, animation: p.anim, opacity: p.opacity }} />
            ))}
          </div>
          {/* Shimmer bar */}
          <div className="ch-shimmer-bar absolute inset-0 pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-900/50 relative" style={{ animation: stats.totalPending > 0 ? 'ch-pulse-ring 2s infinite' : 'none' }}>
              <MessageSquare size={16} className="text-white" />
              {stats.totalPending > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center fz-micro font-black text-white shadow-lg">
                  <span className="absolute inset-0 rounded-full bg-amber-500" style={{ animation: 'ch-ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
                  <span className="relative">{stats.totalPending > 99 ? '99' : stats.totalPending}</span>
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xs font-black text-white uppercase tracking-widest leading-none">Communication Hub</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="fz-mini font-bold text-indigo-300 uppercase tracking-widest">Queue → Review → Send</p>
                <div className="flex items-center gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 ch-live-indicator" />
                  <span className="fz-micro font-bold text-emerald-400 uppercase">Live</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm">
              {(['email', 'sms', 'whatsapp'] as const).map(ch => (
                <div key={ch} className="flex items-center gap-1.5 group" title={channels[ch] ? `${ch} configured` : `${ch} not configured`}>
                  <div className="relative">
                    {channels[ch] ? <Wifi size={10} className="text-emerald-400 transition-transform group-hover:scale-110" /> : <WifiOff size={10} className="text-slate-500" />}
                    {channels[ch] && <div className="absolute inset-0 rounded-full bg-emerald-400/30" style={{ animation: 'ch-breathe 2s ease-in-out infinite' }} />}
                  </div>
                  <span className={`fz-mini font-bold uppercase ${channels[ch] ? 'text-emerald-300' : 'text-slate-500'}`}>{ch}</span>
                </div>
              ))}
            </div>
            {/* Audio wave indicator */}
            <div className="flex items-end gap-[2px] h-3">
              {[0, 0.15, 0.3, 0.45, 0.3].map((d, i) => (
                <div key={i} className="w-[2px] bg-indigo-400/40 rounded-full origin-bottom"
                  style={{ height: '100%', animation: `ch-wave 1.2s ease-in-out infinite ${d}s` }} />
              ))}
            </div>
            <Button size="small" icon={<RefreshCw size={11} />} onClick={loadAll}
              className="h-7 fz-caption font-bold bg-white/10 text-white border-white/20 hover:bg-white/20 transition-all hover:scale-105">Refresh</Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden p-2.5 flex gap-2.5">

          {/* ── Left Panel ── */}
          <div className="w-[260px] flex flex-col gap-2 shrink-0">

            {/* Stats */}
            <div className="flex gap-1.5">
              {[
                { label: 'Pending', value: stats.totalPending, color: '#f59e0b', bg: isDark ? 'bg-amber-950/40' : 'bg-amber-50', border: isDark ? 'border-amber-800/50' : 'border-amber-200', text: isDark ? 'text-amber-400' : 'text-amber-700' },
                { label: 'Sent', value: stats.totalSent, color: '#22c55e', bg: isDark ? 'bg-emerald-950/40' : 'bg-emerald-50', border: isDark ? 'border-emerald-800/50' : 'border-emerald-200', text: isDark ? 'text-emerald-400' : 'text-emerald-700' },
                { label: 'Failed', value: stats.totalFailed, color: '#ef4444', bg: isDark ? 'bg-rose-950/40' : 'bg-rose-50', border: isDark ? 'border-rose-800/50' : 'border-rose-200', text: isDark ? 'text-rose-400' : 'text-rose-700' },
              ].map((s, i) => (
                <div key={i} className={`ch-stat flex-1 ${s.bg} border ${s.border} rounded-xl p-2 text-center ch-glow`}>
                  <div className="fz-micro font-black uppercase tracking-wider" style={{ color: s.color }}>{s.label}</div>
                  <div className={`text-lg font-black ${s.text} ch-badge leading-tight`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Tab switch: Queue / Compose */}
            <div className={`flex rounded-lg border p-0.5 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              {(['queue', 'compose'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 rounded-md fz-tiny font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  {tab === 'queue' ? 'Auto Generate' : 'Compose Message'}
                </button>
              ))}
            </div>

            {activeTab === 'queue' ? (
              /* Auto-Generate Panel */
              <div className={`rounded-xl border shadow-sm ch-glow overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`px-3 py-2 border-b flex items-center gap-1.5 ${isDark ? 'bg-amber-900/20 border-amber-800/30' : 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200/50'}`}>
                  <Zap size={11} className="text-amber-500" />
                  <span className={`fz-tiny font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Auto-Generate Queue</span>
                </div>
                <div className="p-3 space-y-2">
                  <Button block size="small" icon={<AlertCircle size={11} />} onClick={() => handleTrigger('emi')}
                    className={`h-8 font-bold fz-small hover:shadow-md transition-all ${isDark ? 'bg-rose-900/30 text-rose-400 border-rose-800/50' : 'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 border-rose-200'}`}>
                    Generate EMI Deficit Alerts
                  </Button>
                  <Button block size="small" icon={<Clock size={11} />} onClick={() => handleTrigger('maturity')}
                    className={`h-8 font-bold fz-small hover:shadow-md transition-all ${isDark ? 'bg-blue-900/30 text-blue-400 border-blue-800/50' : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200'}`}>
                    Generate Maturity Alerts
                  </Button>
                  <div className={`rounded-lg p-2 border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                    <p className={`fz-mini text-center leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Messages are <span className="font-bold text-amber-600">queued only</span> — they will NOT be sent until you review and click Send.
                      Duplicate messages are automatically prevented.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Compose Panel */
              <div className={`rounded-xl border shadow-sm ch-glow overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`px-3 py-2 border-b flex items-center gap-1.5 ${isDark ? 'bg-indigo-900/20 border-indigo-800/30' : 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-indigo-200/50'}`}>
                  <Send size={11} className="text-indigo-500" />
                  <span className={`fz-tiny font-black uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Compose & Queue</span>
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <div className="fz-mini font-bold uppercase mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}">Member</div>
                    <Input.Search value={form.memberNo} onChange={e => setForm(p => ({ ...p, memberNo: e.target.value }))}
                      onSearch={() => setShowLookup(true)} size="small" className="h-7 fz-caption font-semibold" placeholder="Member No" />
                    {form.memberName && <div className="fz-tiny text-indigo-600 font-semibold mt-0.5">{form.memberName}</div>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="fz-mini font-bold uppercase mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}">Channel</div>
                      <Select value={form.channel} onChange={v => setForm(p => ({ ...p, channel: v }))} size="small" className="w-full"
                        options={[{ value: 'SMS', label: 'SMS' }, { value: 'WHATSAPP', label: 'WhatsApp' }, { value: 'EMAIL', label: 'Email' }]} />
                    </div>
                    <div>
                      <div className="fz-mini font-bold uppercase mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}">Recipient</div>
                      <Input value={form.recipient} onChange={e => setForm(p => ({ ...p, recipient: e.target.value }))} size="small" placeholder="Phone/Email" className="fz-caption" />
                    </div>
                  </div>
                  <div>
                    <div className="fz-mini font-bold uppercase mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}">Message</div>
                    <TextArea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      rows={3} placeholder="Type message..." className="fz-small resize-none" />
                  </div>
                  <Button type="primary" block size="small" icon={<Inbox size={11} />} onClick={handleQueueManual}
                    className="h-8 bg-gradient-to-r from-indigo-600 to-indigo-700 font-bold fz-small uppercase shadow-md hover:shadow-lg transition-all">
                    Queue for Review
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Main: Message Queue ── */}
          <div className={`flex-1 min-w-0 rounded-xl border shadow-sm flex flex-col overflow-hidden ch-glow ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>

            {/* Toolbar */}
            <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-slate-100 bg-gradient-to-r from-white to-slate-50'}`}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Inbox size={12} className="text-indigo-500" />
                  <span className="fz-small font-black text-slate-700 uppercase">Message Queue</span>
                  <Badge count={filtered.length} showZero overflowCount={999}
                    style={{ backgroundColor: '#6366f1', fontSize: 9, fontWeight: 800, boxShadow: '0 2px 6px rgba(99,102,241,0.3)' }} />
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* Search */}
                <Input size="small" prefix={<Search size={10} className="text-slate-300" />}
                  value={searchText} onChange={e => setSearchText(e.target.value)}
                  placeholder="Search..." className="w-[140px] h-6 fz-small" allowClear />

                {/* Filters */}
                <Select value={statusFilter} onChange={setStatusFilter} size="small" className="w-[85px]" style={{ fontSize: 9 }}
                  suffixIcon={<ChevronDown size={10} />}
                  options={[{ value: 'ALL', label: 'All Status' }, { value: 'PENDING', label: 'Pending' }, { value: 'SENT', label: 'Sent' }, { value: 'FAILED', label: 'Failed' }]} />
                <Select value={channelFilter} onChange={setChannelFilter} size="small" className="w-[95px]" style={{ fontSize: 9 }}
                  suffixIcon={<ChevronDown size={10} />}
                  options={[{ value: 'ALL', label: 'All Channel' }, { value: 'SMS', label: 'SMS' }, { value: 'WHATSAPP', label: 'WhatsApp' }, { value: 'EMAIL', label: 'Email' }]} />
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-1.5">
                {selectedIds.size > 0 ? (
                  <>
                    <span className="fz-tiny font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{selectedIds.size} selected</span>
                    <Button size="small" type="primary" icon={<Send size={10} />} onClick={handleSendBatch} loading={sending}
                      className="h-6 fz-tiny font-bold bg-emerald-600 hover:bg-emerald-500 border-0 shadow-sm">Send</Button>
                    <Button size="small" danger icon={<XCircle size={10} />} onClick={handleCancelBatch}
                      className="h-6 fz-tiny font-bold">Cancel</Button>
                    <Button size="small" icon={<Square size={10} />} onClick={clearSelection}
                      className="h-6 fz-tiny font-bold text-slate-400">Clear</Button>
                  </>
                ) : pendingFiltered.length > 0 ? (
                  <Button size="small" icon={<CheckSquare size={10} />} onClick={selectAllPending}
                    className="h-6 fz-tiny font-bold text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100">
                    Select All Pending ({pendingFiltered.length})
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto ch-scroll">
              <Spin spinning={loading} size="small">
                {filtered.length > 0 ? filtered.map((log, idx) => (
                  <div key={log.id} className={`ch-row flex items-start gap-2.5 px-3 py-2.5 border-b transition-all cursor-default ${isDark ? 'border-slate-700/50' : 'border-slate-50'} ${selectedIds.has(log.id) ? (isDark ? 'bg-indigo-900/20' : 'bg-indigo-50/60') : ''}`}
                    style={{ animationDelay: `${Math.min(idx, 10) * 0.03}s` }}>

                    {/* Checkbox */}
                    <div className="pt-0.5 w-5 shrink-0">
                      {log.status === 'PENDING' ? (
                        <div onClick={() => toggleSelect(log.id)} className="cursor-pointer transition-transform hover:scale-110">
                          {selectedIds.has(log.id)
                            ? <CheckSquare size={15} className="text-indigo-600" />
                            : <Square size={15} className="text-slate-300 hover:text-indigo-400" />}
                        </div>
                      ) : (
                        <div className="w-[15px] h-[15px] rounded-full flex items-center justify-center" style={{ backgroundColor: `${stClr(log.status)}15` }}>
                          {log.status === 'SENT' ? <CheckCircle size={10} style={{ color: stClr(log.status) }} /> :
                           log.status === 'FAILED' ? <XCircle size={10} style={{ color: stClr(log.status) }} /> :
                           <Clock size={10} style={{ color: stClr(log.status) }} />}
                        </div>
                      )}
                    </div>

                    {/* Channel icon */}
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${chClr(log.channel)}12` }}>
                      {React.cloneElement(chIcon(log.channel, 13) as React.ReactElement, { style: { color: chClr(log.channel) } })}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`fz-small font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>MB: {log.memberNo}</span>
                        <span className="fz-mini font-bold px-1.5 py-0 rounded-full uppercase" style={{ color: chClr(log.channel), backgroundColor: `${chClr(log.channel)}12` }}>{log.channel}</span>
                        <span className="fz-mini font-bold px-1.5 py-0 rounded-full uppercase" style={{ color: stClr(log.status), backgroundColor: `${stClr(log.status)}12` }}>{log.status}</span>
                        <span className="fz-mini font-semibold text-slate-400 uppercase">{log.type?.replace(/_/g, ' ')}</span>
                        {log.msgRef && <span className="fz-micro font-mono text-slate-300">{log.msgRef}</span>}
                      </div>
                      <div className={`fz-small leading-snug line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} title={log.message}>
                        <span className="text-indigo-400 font-semibold">{log.recipient}</span> — {log.message}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="fz-mini text-slate-400">{dayjs(log.createdAt).format('DD-MMM-YY HH:mm')}</span>
                        {log.sentAt && <span className="fz-mini text-emerald-500 font-semibold">Sent {dayjs(log.sentAt).format('DD-MMM HH:mm')}</span>}
                        {log.errorMessage && <span className="fz-mini text-rose-500" title={log.errorMessage}>Error: {log.errorMessage.substring(0, 50)}</span>}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 pt-0.5">
                      {log.status === 'PENDING' && (
                        <Button size="small" type="primary" icon={<Send size={9} />}
                          onClick={() => handleSendOne(log.id)} loading={sending}
                          className="ch-send-btn h-6 px-2 fz-mini font-bold bg-emerald-600 hover:bg-emerald-500 border-0 shadow-sm">
                          Send
                        </Button>
                      )}
                      {log.status === 'FAILED' && (
                        <Button size="small" icon={<RefreshCw size={9} />}
                          onClick={() => handleSendOne(log.id)} loading={sending}
                          className="ch-retry-btn h-6 px-2 fz-mini font-bold text-amber-600 border-amber-200">
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="py-24 text-center" style={{ animation: 'ch-fade-in .5s ease-out' }}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner ${isDark ? 'bg-slate-700' : 'bg-indigo-50'}`}>
                      <Inbox size={28} className={isDark ? 'text-slate-500' : 'text-indigo-200'} />
                    </div>
                    <p className={`fz-caption font-black uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Message queue is empty</p>
                    <p className={`fz-tiny mt-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>Generate auto-alerts or compose a message to get started</p>
                  </div>
                )}
              </Spin>
            </div>

            {/* Footer summary */}
            <div className={`px-3 py-1.5 border-t flex items-center justify-between shrink-0 ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-100 bg-gradient-to-r from-slate-50/80 to-indigo-50/30'}`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ch-live-indicator" />
                  <span className="fz-mini font-bold text-emerald-600">LIVE</span>
                </div>
                <span className="fz-mini text-slate-400">
                  {filtered.length} of {logs.length} messages
                  {searchText && ` · "${searchText}"`}
                  {' · Auto-refresh 30s'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="fz-mini text-slate-400">{dayjs().format('DD-MMM-YYYY HH:mm')}</span>
                <span className="fz-mini font-bold text-indigo-400">Paper White Technology</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={<div className="flex items-center gap-2"><div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center"><Search size={14} className="text-white" /></div><span className="font-black text-sm">Member Lookup</span></div>}
        open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={1000} centered destroyOnClose
        className="ch-lookup-modal">
        <div className="p-2"><MemberLookup isModal onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} /></div>
      </Modal>

      {/* Channel Selection Modal */}
      <Modal
        title={<div className="flex items-center gap-2"><Send size={16} className="text-indigo-600" /><span className="font-black text-sm uppercase">Choose Delivery Channel</span></div>}
        open={showChannelPicker}
        onCancel={() => { setShowChannelPicker(false); setPendingSendAction(null); }}
        footer={null} width={420} centered destroyOnClose
        className="ch-channel-modal">
        <div className="py-4 space-y-3">
          <p className="text-xs text-slate-500 mb-3">Select how you want to deliver this notification:</p>

          {/* Email — Free */}
          <button
            onClick={() => setSelectedChannel('EMAIL')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
              selectedChannel === 'EMAIL'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}>
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <Mail size={20} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-800">Email (Gmail SMTP)</span>
                <span className="fz-tiny font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">Free</span>
              </div>
              <p className="fz-small text-slate-500 mt-0.5">Send via configured Gmail account. No cost.</p>
            </div>
            {selectedChannel === 'EMAIL' && <CheckCircle size={18} className="text-indigo-600 shrink-0" />}
          </button>

          {/* SMS — Paid */}
          <button
            onClick={() => setSelectedChannel('SMS')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
              selectedChannel === 'SMS'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Phone size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-800">SMS</span>
                <span className="fz-tiny font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Paid Service</span>
              </div>
              <p className="fz-small text-slate-500 mt-0.5">Contact PaperWhite Technology to activate SMS gateway.</p>
            </div>
          </button>

          {/* WhatsApp — Paid */}
          <button
            onClick={() => setSelectedChannel('WHATSAPP')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
              selectedChannel === 'WHATSAPP'
                ? 'border-green-500 bg-green-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <MessageCircle size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-800">WhatsApp</span>
                <span className="fz-tiny font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Paid Service</span>
              </div>
              <p className="fz-small text-slate-500 mt-0.5">Contact PaperWhite Technology to activate WhatsApp Business API.</p>
            </div>
          </button>

          {/* Send Button */}
          <div className="pt-2 flex justify-end gap-2">
            <button onClick={() => { setShowChannelPicker(false); setPendingSendAction(null); }}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={executeSend}
              className="px-4 py-2 text-xs font-black text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 uppercase tracking-wide flex items-center gap-1.5">
              <Send size={12} /> Send via {selectedChannel}
            </button>
          </div>
        </div>
      </Modal>

    </ConfigProvider>
  );
};

export default CommunicationCenter;
