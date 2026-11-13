import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { Bell, Plus, X, GripVertical, AlertTriangle, Info, CheckCircle, Pin, StickyNote, Send, Lock, Megaphone } from 'lucide-react';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import { useTranslation } from 'react-i18next';

// The dashboard's notice card. Two views in one card:
//
//   Notice Board  what everyone sees. Anyone can post; an administrator can mark a notice
//                 "Important", which pins it to the top of every user's board.
//   My Notes      personal sticky notes, seen only by the person who wrote them. "Publish" puts a
//                 note on everyone's board; "Make private" takes your own notice back.
//
// A notice is deleted by the person who posted it or by an administrator. The server decides all of
// this (who is an administrator, whose note it is); the card only hides what would be refused.

interface Notice {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  postedAt: string;
  postedBy: string;
  showOnMobile: boolean;
  audienceWing: string | null;
  audienceOffice: number | null;
  isPrivate: boolean;
  isImportant: boolean;
  color: string | null;
  mine: boolean;
  canManage: boolean;
}

type Tab = 'board' | 'mine';

const NOTICE_STYLES = {
  info:    { cls: 'aw-alert-info',    Icon: Info },
  warning: { cls: 'aw-alert-warning', Icon: AlertTriangle },
  success: { cls: 'aw-alert-success', Icon: CheckCircle },
};

const NOTE_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'] as const;
const EMPTY_FORM = { title: '', message: '', type: 'info' as Notice['type'], showOnMobile: false, audienceWing: '', audienceOffice: '', isImportant: false, color: 'yellow' as string };

const NoticeBoardCard: React.FC = () => {
  const { t } = useTranslation();
  const [notices, setNotices] = useState<Notice[]>([]);
  const noticesRef = useRef<Notice[]>([]);
  noticesRef.current = notices;
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>('board');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [noticeWings, setNoticeWings] = useState<any[]>([]);
  const [noticeOffices, setNoticeOffices] = useState<any[]>([]);
  // Ids currently animating out before removal — lets the delete fade play.
  const [removingIds, setRemovingIds] = useState<number[]>([]);
  // Dragged notice id, tracked outside state so drag-over doesn't re-render.
  const dragIdRef = useRef<number | null>(null);

  const refreshNotices = useCallback(async () => {
    const res = await apiService.getDashboardNotices();
    if (res.success && Array.isArray(res.data)) {
      setNotices(res.data.map((n: any): Notice => ({
        id: n.id, title: n.title, message: n.message, type: n.type,
        postedAt: n.createdAt, postedBy: n.postedBy, showOnMobile: !!n.showOnMobile,
        audienceWing: n.audienceWing ?? null, audienceOffice: n.audienceOffice ?? null,
        isPrivate: !!n.isPrivate, isImportant: !!n.isImportant, color: n.color ?? null,
        // A server from before private notes sends neither flag: keep the old behaviour (anyone may delete).
        mine: !!n.mine, canManage: n.canManage === undefined ? true : !!n.canManage,
      })));
    }
  }, []);

  useEffect(() => {
    refreshNotices();
    apiService.getDashboardNoticeAccess().then(res => {
      if (res.success && res.data) setIsAdmin(!!(res.data as any).isAdmin);
    }).catch(() => { /* not an administrator as far as this card knows */ });
  }, [refreshNotices]);

  const board = notices.filter(n => !n.isPrivate);
  const mine = notices.filter(n => n.isPrivate);

  const closeForm = useCallback(() => {
    setShowAddForm(false);
    setForm(EMPTY_FORM);
    setNoticeOffices([]);
  }, []);

  const addNotice = useCallback(async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    const isPrivate = tab === 'mine';
    const res = await apiService.createDashboardNotice({
      title: form.title.trim(), message: form.message.trim(), type: form.type, postedBy: '',
      isPrivate,
      ...(isPrivate ? { color: form.color } : {
        isImportant: isAdmin && form.isImportant,
        showOnMobile: form.showOnMobile,
        audienceWing: form.showOnMobile && form.audienceWing ? form.audienceWing : null,
        audienceOffice: form.showOnMobile && form.audienceWing && form.audienceOffice !== '' ? Number(form.audienceOffice) : null,
      }),
    });
    if (!res.success) {
      message.error(isPrivate ? t('Could not save the note — please try again.') : t('Could not post the notice — please try again.'));
      return;
    }
    await refreshNotices();
    closeForm();
  }, [form, tab, isAdmin, refreshNotices, closeForm, t]);

  const deleteNotice = useCallback((id: number) => {
    // Play the fade-out, then commit the removal.
    setRemovingIds(prev => [...prev, id]);
    setTimeout(async () => {
      const res = await apiService.deleteDashboardNotice(id);
      if (res.success) setNotices(prev => prev.filter(n => n.id !== id));
      else message.error(t('Could not delete the notice — please try again.'));
      setRemovingIds(prev => prev.filter(x => x !== id));
    }, 200);
  }, [t]);

  // Publish a private note to everyone, or take your own notice back to private.
  const setPrivate = useCallback(async (n: Notice, isPrivate: boolean) => {
    const res = await apiService.setDashboardNoticePrivate(n.id, isPrivate);
    if (!res.success) {
      message.error(isPrivate ? t('Could not make the notice private — please try again.') : t('Could not publish the note — please try again.'));
      return;
    }
    await refreshNotices();
    message.success(isPrivate ? t('Moved to My Notes. Only you can see it now.') : t('Published. Everyone can see it on the Notice Board.'));
  }, [refreshNotices, t]);

  // Wing list loads the first time the mobile option is ticked; offices load per wing.
  const onShowOnMobileChange = useCallback(async (checked: boolean) => {
    setForm(p => ({ ...p, showOnMobile: checked, ...(checked ? {} : { audienceWing: '', audienceOffice: '' }) }));
    if (checked && noticeWings.length === 0) {
      const res: any = await apiService.getReportWings();
      if (res.success && Array.isArray(res.data)) setNoticeWings(res.data);
    }
  }, [noticeWings.length]);

  const onAudienceWingChange = useCallback(async (wingNo: string) => {
    setForm(p => ({ ...p, audienceWing: wingNo, audienceOffice: '' }));
    setNoticeOffices([]);
    if (wingNo) {
      const res: any = await apiService.getReportOffices(wingNo);
      if (res.success && Array.isArray(res.data)) setNoticeOffices(res.data);
    }
  }, []);

  // Drag-and-drop reorder of the shared board — optimistic locally, persisted in the background.
  // Important notices stay on top whatever the order, so they are not draggable.
  const handleNoticeDrop = useCallback((targetId: number) => {
    const draggedId = dragIdRef.current;
    dragIdRef.current = null;
    if (draggedId === null || draggedId === targetId) return;
    // Compute the new order outside the state updater (updaters must be pure; StrictMode runs
    // them twice) and fire the API call exactly once.
    const prev = noticesRef.current;
    const list = prev.filter(n => !n.isPrivate);
    const fromIdx = list.findIndex(n => n.id === draggedId);
    const toIdx = list.findIndex(n => n.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = list.splice(fromIdx, 1);
    if (!moved) return;
    list.splice(toIdx, 0, moved);
    // Important first, exactly as the server will return them.
    const ordered = [...list.filter(n => n.isImportant), ...list.filter(n => !n.isImportant)];
    setNotices([...ordered, ...prev.filter(n => n.isPrivate)]);
    apiService.reorderDashboardNotices(ordered.map(n => n.id)).then(res => {
      if (res && res.success === false) throw new Error('reorder failed');
    }).catch(() => {
      setNotices(prev);
      message.error(t('Could not save the new notice order — please try again.'));
    });
  }, [t]);

  // Enter posts (Ctrl/⌘+Enter inside the textarea, where Enter is a newline); Esc cancels.
  const handleFormKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeForm(); return; }
    if (e.key === 'Enter') {
      const isTextarea = (e.target as HTMLElement).tagName === 'TEXTAREA';
      if (!isTextarea || e.ctrlKey || e.metaKey) { e.preventDefault(); addNotice(); }
    }
  }, [addNotice, closeForm]);

  const switchTab = (next: Tab) => { setTab(next); closeForm(); };
  const stamp = (n: Notice) => `${n.postedBy} · ${dayjs(n.postedAt).format('D MMM, h:mm A')}`;

  return (
    <section className="aw-card dash-notice">
      <div className="aw-card-head">
        <span className="aw-card-icon"><Bell size={14} /></span>
        <h2 className="aw-card-title">{t('Notice Board')}</h2>
        <div className="aw-chips dash-notice-tabs" role="radiogroup" aria-label={t('Notice Board')}>
          <button type="button" role="radio" aria-checked={tab === 'board'} className="aw-chip" onClick={() => switchTab('board')}>
            <Megaphone size={12} /> {t('Everyone')} <span className="dash-notice-count">{board.length}</span>
          </button>
          <button type="button" role="radio" aria-checked={tab === 'mine'} className="aw-chip" onClick={() => switchTab('mine')}>
            <StickyNote size={12} /> {t('My Notes')} <span className="dash-notice-count">{mine.length}</span>
          </button>
        </div>
        <button type="button" onClick={() => (showAddForm ? closeForm() : setShowAddForm(true))} className="aw-btn aw-btn-primary aw-btn-sm" style={{ marginLeft: 'auto' }}>
          <Plus size={12} /> {tab === 'mine' ? t('Add Note') : t('Add Notice')}
        </button>
      </div>

      {showAddForm && (
        <div className="aw-panel aw-fade-in dash-notice-form" onKeyDown={handleFormKeyDown}>
          <p className="aw-meta" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {tab === 'mine'
              ? <><Lock size={12} /> {t('Only you will see this note. You can publish it to everyone later.')}</>
              : <><Megaphone size={12} /> {t('Every user will see this notice on their dashboard.')}</>}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: tab === 'mine' ? '1fr' : '2fr 1fr', gap: 'var(--aw-gap)' }}>
            <input aria-label={t('Notice title')} className="aw-input" autoFocus value={form.title} maxLength={200}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={tab === 'mine' ? t('Note title...') : t('Notice title...')} />
            {tab === 'board' && (
              <select aria-label={t('Notice type')} className="aw-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as Notice['type'] }))}>
                <option value="info">{t('Info')}</option>
                <option value="warning">{t('Warning')}</option>
                <option value="success">{t('Success')}</option>
              </select>
            )}
          </div>
          <textarea aria-label={t('Notice message')} className="aw-input" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            placeholder={tab === 'mine' ? t('Write your note...') : t('Notice message...')} rows={2} style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />

          {tab === 'mine' ? (
            <div className="aw-inline" style={{ alignItems: 'center', gap: 8 }}>
              <span className="aw-label" style={{ margin: 0 }}>{t('Colour')}</span>
              {NOTE_COLORS.map(c => (
                <button key={c} type="button" className={`dash-swatch${form.color === c ? ' is-on' : ''}`} data-color={c}
                  aria-label={t(c)} aria-pressed={form.color === c} onClick={() => setForm(p => ({ ...p, color: c }))} />
              ))}
            </div>
          ) : (
            <>
              {isAdmin && (
                <label className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isImportant} onChange={e => setForm(p => ({ ...p, isImportant: e.target.checked }))} />
                  <Pin size={12} /> {t('Important — keep at the top of every user\'s board')}
                </label>
              )}
              <label className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.showOnMobile} onChange={e => onShowOnMobileChange(e.target.checked)} />
                {t('Show on mobile app')}
              </label>
              {form.showOnMobile && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--aw-gap)' }}>
                  <select aria-label={t('Audience wing')} className="aw-input" value={form.audienceWing} onChange={e => onAudienceWingChange(e.target.value)}>
                    <option value="">{t('All members')}</option>
                    {noticeWings.map(w => <option key={w.wingNo} value={w.wingNo}>{w.name || w.wingName || w.wingNo}</option>)}
                  </select>
                  <select aria-label={t('Audience office')} className="aw-input" value={form.audienceOffice} disabled={!form.audienceWing}
                    onChange={e => setForm(p => ({ ...p, audienceOffice: e.target.value }))}>
                    <option value="">{t('All offices of the wing')}</option>
                    {noticeOffices.map(o => <option key={o.officeNo} value={o.officeNo}>{o.name || o.officeName || o.officeNo}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          <div className="aw-btn-row">
            <button type="button" onClick={addNotice} className="aw-btn aw-btn-primary aw-btn-sm">{tab === 'mine' ? t('Save note') : t('Post')}</button>
            <button type="button" onClick={closeForm} className="aw-btn aw-btn-secondary aw-btn-sm">{t('Cancel')}</button>
          </div>
        </div>
      )}

      {tab === 'board' ? (
        <div className="dash-notice-list">
          {board.length === 0 ? (
            <div className="aw-empty" style={{ padding: 24 }}>
              <Bell size={28} />
              <p className="aw-strong">{t('No notices posted yet')}</p>
              <span className="aw-meta">{t('Click "Add Notice" to post one')}</span>
            </div>
          ) : board.map(n => {
            const s = NOTICE_STYLES[n.type] ?? NOTICE_STYLES.info;
            return (
              <div key={n.id}
                draggable={!n.isImportant}
                onDragStart={() => { dragIdRef.current = n.id; }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleNoticeDrop(n.id)}
                className={`aw-alert ${s.cls} aw-fade-in dash-notice-item${n.isImportant ? ' is-important' : ''}`}
                style={{ opacity: removingIds.includes(n.id) ? 0 : 1 }}>
                {n.isImportant ? <Pin size={14} style={{ flex: 'none', marginTop: 2 }} /> : <GripVertical size={13} style={{ flex: 'none', marginTop: 2, cursor: 'grab' }} />}
                {!n.isImportant && <s.Icon size={14} style={{ flex: 'none', marginTop: 2 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{n.title}</strong>
                  {n.isImportant && <span className="aw-pill tone-danger dash-notice-flag">{t('Important')}</span>}
                  <p>{n.message}</p>
                  <p className="aw-meta" style={{ textTransform: 'uppercase', marginTop: 4 }}>
                    {stamp(n)}{n.showOnMobile ? ` · ${t('Shown in mobile app')}${n.audienceWing ? ` (${t('Wing')} ${n.audienceWing}${n.audienceOffice != null ? `, ${t('Office')} ${n.audienceOffice}` : ''})` : ''}` : ''}
                  </p>
                </div>
                {n.mine && (
                  <button type="button" className="aw-icon-btn is-sm" onClick={() => setPrivate(n, true)} aria-label={t('Make private')} data-tip={t('Make private (move to My Notes)')} data-tip-pos="left"><Lock size={13} /></button>
                )}
                {n.canManage && (
                  <button type="button" className="aw-icon-btn is-sm is-danger" onClick={() => deleteNotice(n.id)} aria-label={t('Delete notice')} data-tip={t('Delete notice')} data-tip-pos="left"><X size={13} /></button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dash-notice-list">
          {mine.length === 0 ? (
            <div className="aw-empty" style={{ padding: 24 }}>
              <StickyNote size={28} />
              <p className="aw-strong">{t('No personal notes yet')}</p>
              <span className="aw-meta">{t('Click "Add Note" to write one. Only you can see it until you publish it.')}</span>
            </div>
          ) : (
            <div className="dash-notes">
              {mine.map((n, i) => (
                <article key={n.id} className="dash-note aw-fade-in" data-color={n.color || 'yellow'}
                  style={{ ['--tilt' as any]: `${[-1.2, 0.9, -0.6, 1.3][i % 4]}deg`, opacity: removingIds.includes(n.id) ? 0 : 1 }}>
                  <header>
                    <strong>{n.title}</strong>
                    <button type="button" className="aw-icon-btn is-sm is-danger" onClick={() => deleteNotice(n.id)} aria-label={t('Delete note')}><X size={13} /></button>
                  </header>
                  <p>{n.message}</p>
                  <footer>
                    <span>{dayjs(n.postedAt).format('D MMM, h:mm A')}</span>
                    <button type="button" className="dash-note-publish" onClick={() => setPrivate(n, false)}>
                      <Send size={11} /> {t('Publish')}
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default NoticeBoardCard;
