import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronsRight, ChevronLeft, ChevronsLeft, AppWindow, Search, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MenuItem } from '../utils/windowRights';

interface Props {
  menus: MenuItem[];
  granted: number[];
  loading: boolean;
  error: string | null;
  unrestricted: boolean;
  /** No level chosen yet */
  noLevel: boolean;
  onMove: (ids: number[], toGranted: boolean) => void;
  onRetry: () => void;
}

/** Which windows one person may open: two lists with arrows, like the legacy Default Rights / Rights Allot lists. */
const WindowRightsPanel: React.FC<Props> = ({ menus, granted, loading, error, unrestricted, noLevel, onMove, onRetry }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [pickLeft, setPickLeft] = useState<number[]>([]);
  const [pickRight, setPickRight] = useState<number[]>([]);

  const grantedSet = useMemo(() => new Set(granted), [granted]);
  const q = query.trim().toLowerCase();
  const match = (m: MenuItem) => !q || m.label.toLowerCase().includes(q);
  const left = useMemo(() => menus.filter(m => !grantedSet.has(m.id) && match(m)), [menus, grantedSet, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => menus.filter(m => grantedSet.has(m.id) && match(m)), [menus, grantedSet, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const grantedCount = useMemo(() => menus.filter(m => grantedSet.has(m.id)).length, [menus, grantedSet]);

  const toggle = (pick: number[], set: (v: number[]) => void, id: number, multi: boolean) =>
    set(multi ? (pick.includes(id) ? pick.filter(p => p !== id) : [...pick, id]) : (pick.length === 1 && pick[0] === id ? [] : [id]));

  const grant = (ids: number[]) => { onMove(ids, true); setPickLeft([]); };
  const revoke = (ids: number[]) => { onMove(ids, false); setPickRight([]); };

  const row = (m: MenuItem, picked: boolean, onClick: (multi: boolean) => void, onDouble: () => void) => (
    <div
      key={m.id}
      role="option"
      aria-selected={picked}
      tabIndex={0}
      className={`aw-perm-item ${picked ? 'is-selected' : ''}`}
      onClick={(e) => onClick(e.ctrlKey || e.metaKey)}
      onDoubleClick={onDouble}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e.ctrlKey || e.metaKey); } }}
    >
      {m.label}
    </div>
  );

  let body: React.ReactNode;
  if (noLevel) {
    body = <div className="aw-empty" style={{ padding: 32 }}><AppWindow size={24} /><strong className="aw-strong">{t('Choose a user level first')}</strong><span className="aw-meta">{t('The windows start from the level and can then be changed for this person')}</span></div>;
  } else if (unrestricted) {
    body = <div className="aw-empty" style={{ padding: 32 }}><ShieldCheck size={24} /><strong className="aw-strong">{t('Every window')}</strong><span className="aw-meta">{t('Administrators and SYSTEM users always have every window, so there is nothing to pick')}</span></div>;
  } else if (error) {
    body = (
      <div className="aw-empty" style={{ padding: 32 }}>
        <strong className="aw-strong">{error}</strong>
        <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={onRetry}><RotateCcw size={13} /> {t('Try again')}</button>
      </div>
    );
  } else {
    body = (
      <>
        <div className="aw-input-wrap has-icon" style={{ maxWidth: 320, marginBottom: 12 }}>
          <Search size={13} />
          <input type="text" className="aw-input" placeholder={t('Search windows')} aria-label={t('Search windows')} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) auto minmax(0, 5fr)', gap: 'var(--aw-gap)', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="aw-label" style={{ marginBottom: 0 }}>{t('Not allowed')}</span>
              <span className="aw-pill tone-muted">{t('{{1}} windows', { 1: menus.length - grantedCount })}</span>
            </div>
            <div className="aw-perm-list" role="listbox" aria-label={t('Windows not allowed')} aria-multiselectable="true" style={{ maxHeight: 360 }}>
              {left.length === 0 && <div className="aw-empty" style={{ height: '100%', justifyContent: 'center' }}><span className="aw-meta">{t('Empty')}</span></div>}
              {left.map(m => row(m, pickLeft.includes(m.id), (multi) => toggle(pickLeft, setPickLeft, m.id, multi), () => grant([m.id])))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <button type="button" className="aw-icon-btn" disabled={pickLeft.length === 0} onClick={() => grant(pickLeft)} aria-label={t('Allow selected')} data-tip={t('Allow selected')} data-tip-pos="top-start"><ChevronRight size={15} /></button>
            <button type="button" className="aw-icon-btn" disabled={left.length === 0} onClick={() => grant(left.map(m => m.id))} aria-label={t('Allow all shown')} data-tip={t('Allow all shown')} data-tip-pos="top-start"><ChevronsRight size={15} /></button>
            <div style={{ height: 1, background: 'var(--aw-border)' }} />
            <button type="button" className="aw-icon-btn" disabled={pickRight.length === 0} onClick={() => revoke(pickRight)} aria-label={t('Remove selected')} data-tip={t('Remove selected')} data-tip-pos="top-start"><ChevronLeft size={15} /></button>
            <button type="button" className="aw-icon-btn" disabled={right.length === 0} onClick={() => revoke(right.map(m => m.id))} aria-label={t('Remove all shown')} data-tip={t('Remove all shown')} data-tip-pos="top-start"><ChevronsLeft size={15} /></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="aw-label" style={{ marginBottom: 0 }}>{t('Allowed')}</span>
              <span className="aw-pill">{t('{{1}} windows', { 1: grantedCount })}</span>
            </div>
            <div className="aw-perm-list is-accent" role="listbox" aria-label={t('Windows allowed')} aria-multiselectable="true" style={{ maxHeight: 360 }}>
              {right.length === 0 && <div className="aw-empty" style={{ height: '100%', justifyContent: 'center' }}><span className="aw-meta">{t('No windows yet')}</span></div>}
              {right.map(m => row(m, pickRight.includes(m.id), (multi) => toggle(pickRight, setPickRight, m.id, multi), () => revoke([m.id])))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <section className="aw-card" style={{ minWidth: 0 }} aria-label={t('Window rights')}>
      <div className="aw-card-head">
        <span className="aw-card-icon"><AppWindow size={14} /></span>
        <div>
          <h2 className="aw-card-title">{t('Window rights')}</h2>
          <p className="aw-meta">{t('The windows this person may open. Click to select, Ctrl+Click for several, double-click to move one')}</p>
        </div>
        {loading && <Loader2 size={14} className="aw-spin" style={{ marginLeft: 'auto' }} aria-label={t('Loading')} />}
      </div>
      {body}
    </section>
  );
};

export default WindowRightsPanel;
