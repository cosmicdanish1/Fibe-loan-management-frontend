import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, Star, AppWindow, SearchX } from 'lucide-react';
import {
  useUiPrefs, glassVars, readSearchUsage, recordSearchPick, usageBoost, type UsageMap,
} from '../../services/uiPrefs';
import './topbar.css';

export interface SearchItem {
  id: string;
  title: string;
  path: string;            // breadcrumb, e.g. "Administration › Loan"
  keywords?: string | undefined;       // extra words that should find this item
  suggest?: boolean | undefined;       // shown when nothing has been learned yet
  icon?: React.ReactNode | undefined;
  run: () => void;
}

const MAX_RESULTS = 8;

/** Text-match strength, 0 = not a match. Learned usage is added on top by the caller. */
function matchScore(item: SearchItem, q: string): number {
  const title = item.title.toLowerCase();
  const words = title.split(/[^a-z0-9]+/).filter(Boolean);
  if (title.startsWith(q)) return 100;
  if (words.some(w => w.startsWith(q))) return 82;
  if (title.includes(q)) return 56;
  const extra = `${item.keywords ?? ''} ${item.path}`.toLowerCase();
  if (extra.split(/[^a-z0-9]+/).some(w => w.startsWith(q))) return 44;
  if (extra.includes(q)) return 30;
  if (q.length >= 3) {                       // letters in order: "dyend" → "DayEnd"
    let i = 0;
    for (const ch of title) if (ch === q[i]) i++;
    if (i === q.length) return 18;
  }
  return 0;
}

function highlight(title: string, q: string): React.ReactNode {
  if (!q) return title;
  const i = title.toLowerCase().indexOf(q);
  if (i < 0) return title;
  return (
    <>
      {title.slice(0, i)}<mark>{title.slice(i, i + q.length)}</mark>{title.slice(i + q.length)}
    </>
  );
}

export const GlobalSearch: React.FC<{ items: SearchItem[] }> = ({ items }) => {
  const prefs = useUiPrefs().search;

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [active, setActive] = useState(0);
  const [usage, setUsage] = useState<UsageMap>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) {
      if (prefs.learn) {
        const used = items
          .filter(i => usage[i.id])
          .sort((a, b) => usageBoost(usage[b.id], '') - usageBoost(usage[a.id], ''))
          .slice(0, 6);
        if (used.length) return { label: 'Frequently used', favourite: true, list: used };
      }
      return { label: 'Suggestions', favourite: false, list: items.filter(i => i.suggest).slice(0, 6) };
    }
    const scored = items
      .map(item => {
        const m = matchScore(item, q);
        return { item, score: m === 0 ? 0 : m + (prefs.learn ? usageBoost(usage[item.id], q) : 0) };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, MAX_RESULTS)
      .map(s => s.item);
    return { label: 'Best matches', favourite: false, list: scored };
  }, [items, q, usage, prefs.learn]);

  useEffect(() => { setActive(0); }, [q, open]);

  const openBox = useCallback(() => {
    setUsage(readSearchUsage());
    setClosing(false);
    setOpen(true);
  }, []);

  const closeBox = useCallback(() => {
    if (!open || closing) return;
    inputRef.current?.blur();
    if (!prefs.animations) { setOpen(false); setQuery(''); return; }
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); setQuery(''); }, 170);
  }, [open, closing, prefs.animations]);

  const choose = useCallback((item: SearchItem) => {
    if (prefs.learn) recordSearchPick(item.id, query);
    closeBox();
    item.run();
  }, [prefs.learn, query, closeBox]);

  // Ctrl+K focuses the box from anywhere in the main window.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeBox(); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, closeBox]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = results.list.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (n) setActive(a => (a + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) setActive(a => (a - 1 + n) % n); }
    else if (e.key === 'Enter') { e.preventDefault(); const item = results.list[active]; if (item) choose(item); }
    else if (e.key === 'Escape') { e.preventDefault(); if (query) setQuery(''); else closeBox(); }
  };

  return (
    <div
      className={`tb-root tb-search${prefs.animations ? '' : ' tb-still'}`}
      data-tour="search"
      data-shape={prefs.shape}
      ref={rootRef}
      style={glassVars(prefs.glass, prefs.glassStrength)}
    >
      <div className="tb-field" data-open={open} onClick={() => inputRef.current?.focus()}>
        <Search size={15} />
        <input
          ref={inputRef}
          value={query}
          placeholder="Search windows & features"
          aria-label="Search windows and features"
          role="combobox"
          aria-expanded={open}
          aria-controls="tb-search-list"
          autoComplete="off"
          spellCheck={false}
          onFocus={openBox}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <span className="tb-kbd"><span>Ctrl</span><span>K</span></span>
      </div>

      {open && (
        <div className="tb-pop tb-surface" data-closing={closing} data-style="panel">
          <div className="tb-group" style={{ paddingTop: 12, paddingLeft: 18 }}>{results.label}</div>
          <div className="tb-results" id="tb-search-list" role="listbox" ref={listRef}>
            {results.list.length === 0 ? (
              <div className="tb-empty" style={{ padding: '22px 12px 26px' }}>
                <div className="tb-empty-ico" style={{ color: 'var(--tb-faint)', background: 'var(--tb-hover)' }}><SearchX size={22} /></div>
                <b>No match for “{query.trim()}”</b>
                <span>Try part of a window name, like “loan” or “ledger”.</span>
              </div>
            ) : (
              results.list.map((item, i) => (
                <button
                  key={item.id}
                  className="tb-res"
                  role="option"
                  aria-selected={i === active}
                  data-active={i === active}
                  style={{ ['--tb-i' as string]: i }}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={() => choose(item)}
                >
                  <span className="tb-res-ico">{item.icon ?? <AppWindow size={15} />}</span>
                  <span className="tb-res-main">
                    <div className="tb-res-title">{highlight(item.title, q)}</div>
                    <div className="tb-res-path">{item.path}</div>
                  </span>
                  {results.favourite && <Star size={13} className="tb-res-star" fill="currentColor" />}
                  <span className="tb-res-go">Open <CornerDownLeft size={11} style={{ verticalAlign: '-1px' }} /></span>
                </button>
              ))
            )}
          </div>
          <div className="tb-sfoot">
            <span><b>↑↓</b> move</span>
            <span><b>Enter</b> open</span>
            <span><b>Esc</b> close</span>
            {prefs.learn && <span style={{ marginLeft: 'auto' }}>Learns what you open</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
