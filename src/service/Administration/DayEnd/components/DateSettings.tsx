import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, Download, History, RefreshCw, Save, Search, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AwDialog from '@/components/shared/kit/AwDialog';
import { showDialog4 as showDialog } from '@/utils/dialog';
import { useDatePolicy, type DateMode, type DatePolicyRow, type ImportPreview } from '../hooks/useDatePolicy';

type Filter = 'all' | 'posts' | 'stores' | 'system' | 'unsaved';

/** The text of a chosen file (File.text() where the browser has it, FileReader otherwise) */
const readFileText = (file: File): Promise<string> => (typeof file.text === 'function'
  ? file.text()
  : new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result ?? '')); r.onerror = () => reject(r.error); r.readAsText(file); }));

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/**
 * Day End > Date settings. Every window dates its entries on the Day-End WORKING date unless the client switches it to
 * the SYSTEM date (today's real date, India time). Saved for everybody, logged, and exportable / importable as a file.
 */
const DateSettings: React.FC = () => {
  const { t } = useTranslation();
  const dp = useDatePolicy();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dp.rows.filter((r) => {
      if (q && !`${r.label} ${r.area}`.toLowerCase().includes(q)) return false;
      if (filter === 'posts') return r.kind === 'posts';
      if (filter === 'stores') return r.kind === 'stores';
      if (filter === 'system') return dp.modeOf(r) === 'SYSTEM';
      if (filter === 'unsaved') return dp.dirtyKeys.includes(r.key);
      return true;
    });
  }, [dp.rows, dp.modeOf, dp.dirtyKeys, query, filter]);

  const areas = useMemo(() => {
    const map = new Map<string, DatePolicyRow[]>();
    for (const r of visible) map.set(r.area, [...(map.get(r.area) ?? []), r]);
    return [...map.entries()];
  }, [visible]);

  const systemCount = dp.rows.filter((r) => dp.modeOf(r) === 'SYSTEM').length;

  const handleSave = async () => {
    const res = await dp.save();
    await showDialog(res.ok ? 'info' : 'error', 'electron-react-ts', res.ok ? t('Date settings saved') : t('Date settings not saved'), res.message);
  };

  const handleExport = async () => {
    const text = await dp.exportText();
    if (!text) { await showDialog('error', 'electron-react-ts', t('Export failed'), t('The date settings could not be exported.')); return; }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `espat-date-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) { await showDialog('error', 'electron-react-ts', t('File too large'), t('This is not a date settings file (it is larger than 1 MB).')); return; }
    const res = await dp.previewImport(await readFileText(file));
    if (!res.ok) { await showDialog('error', 'electron-react-ts', t('File not accepted'), res.message); return; }
    setPreview(res.preview);
  };

  const applyImport = async () => {
    if (!preview) return;
    const res = await dp.applyImport(preview.file);
    setPreview(null);
    await showDialog(res.ok ? 'info' : 'error', 'electron-react-ts', res.ok ? t('File applied') : t('File not applied'), res.message);
  };

  const modeLabel = (m: DateMode) => (m === 'SYSTEM' ? t('System date') : t('Working date'));

  return (
    <div className="aw-stack aw-narrow" style={{ maxWidth: 1040 }}>
      <section className="aw-card">
        <div className="aw-card-head">
          <h2 className="aw-card-title">{t('Which date does each window use?')}</h2>
          {systemCount > 0 && <span className="aw-pill tone-warning" style={{ marginLeft: 'auto' }}>{t('{{1}} window(s) on System date', { 1: systemCount })}</span>}
        </div>
        <p className="aw-meta" style={{ lineHeight: 1.5 }}>
          {t('By default every window dates its entries on the Day-End working date, as the legacy system does. Switch a window to System date to use today\'s real date (India time) instead. A closed day or a closed financial year still refuses postings in either case.')}
        </p>
        <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0 }}>
          <AlertCircle size={15} />
          <span>{t('A window on System date posts on today\'s real date while the books are still on the working date. Day-End totals count only the working date, so mixing the two can make the day book and cash book disagree.')}</span>
        </div>
      </section>

      <section className="aw-card">
        <div className="aw-inline" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="aw-input-wrap has-icon" style={{ flex: '1 1 220px', maxWidth: 320 }}>
            <Search size={13} />
            <input className="aw-input" aria-label={t('Search windows')} placeholder={t('Search windows...')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="aw-input" aria-label={t('Show')} value={filter} onChange={(e) => setFilter(e.target.value as Filter)} style={{ width: 200 }}>
            <option value="all">{t('All windows')}</option>
            <option value="posts">{t('Posts to the books')}</option>
            <option value="stores">{t('Stores a date only')}</option>
            <option value="system">{t('On System date')}</option>
            <option value="unsaved">{t('Unsaved changes')}</option>
          </select>
          <span style={{ flex: 1 }} />
          <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={handleExport} disabled={dp.isLoading}><Download size={13} /> {t('Export')}</button>
          <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => fileRef.current?.click()} disabled={dp.isLoading || dp.isSaving}><Upload size={13} /> {t('Import')}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} style={{ display: 'none' }} data-testid="date-policy-file" />
          <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={dp.discard} disabled={dp.dirtyKeys.length === 0 || dp.isSaving}>{t('Discard')}</button>
          <button type="button" className="aw-btn aw-btn-primary aw-btn-sm" onClick={handleSave} disabled={dp.dirtyKeys.length === 0 || dp.isSaving}>
            {dp.isSaving ? <RefreshCw size={13} className="aw-spin" /> : <Save size={13} />} {t('Save changes')}{dp.dirtyKeys.length > 0 ? ` (${dp.dirtyKeys.length})` : ''}
          </button>
        </div>

        {dp.error && (
          <div className="aw-alert aw-alert-danger" role="alert" style={{ marginBottom: 0 }}>
            <AlertCircle size={15} /><span style={{ flex: 1 }}>{dp.error}</span>
            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={dp.reload}>{t('Retry')}</button>
          </div>
        )}

        {dp.isLoading ? (
          <div className="aw-empty" style={{ padding: 24 }}><RefreshCw size={20} className="aw-spin" /></div>
        ) : (
          <div className="aw-table-wrap">
            <table className="aw-table">
              <thead>
                <tr>
                  <th>{t('Window')}</th>
                  <th style={{ width: 150 }}>{t('What it does')}</th>
                  <th style={{ width: 250 }}>{t('Date used')}</th>
                  <th style={{ width: 150 }}>{t('Connected')}</th>
                  <th style={{ width: 190 }}>{t('Last changed')}</th>
                </tr>
              </thead>
              <tbody>
                {areas.length === 0 && (
                  <tr><td colSpan={5}><div className="aw-empty" style={{ padding: 20 }}><span className="aw-meta">{t('No windows match.')}</span></div></td></tr>
                )}
                {areas.map(([area, list]) => (
                  <React.Fragment key={area}>
                    <tr><td colSpan={5} className="aw-meta" style={{ fontWeight: 700, background: 'var(--aw-surface-muted)' }}>{area}</td></tr>
                    {list.map((r) => {
                      const mode = dp.modeOf(r);
                      const unsaved = dp.dirtyKeys.includes(r.key);
                      return (
                        <tr key={r.key} data-testid={`row-${r.key}`}>
                          <td>{r.label}{unsaved && <span className="aw-pill tone-info" style={{ marginLeft: 8 }}>{t('unsaved')}</span>}</td>
                          <td className="is-muted">{r.kind === 'posts' ? t('Posts to the books') : t('Stores a date only')}</td>
                          <td>
                            <div className="aw-seg" role="radiogroup" aria-label={`${r.label}: ${t('Date used')}`}
                              style={{ ['--seg-index' as any]: mode === 'SYSTEM' ? 1 : 0, ['--seg-count' as any]: 2, opacity: r.wired ? 1 : 0.55 }}>
                              {(['WORKING', 'SYSTEM'] as DateMode[]).map((m) => (
                                <button key={m} type="button" role="radio" aria-checked={mode === m} aria-selected={mode === m}
                                  disabled={!r.wired} onClick={() => dp.setMode(r.key, m)}
                                  title={r.wired ? undefined : t('Not connected yet: this window still uses its own date until it is connected')}>
                                  {modeLabel(m)}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>{r.wired ? <span className="aw-pill tone-success">{t('Connected')}</span> : <span className="aw-pill">{t('Not connected yet')}</span>}</td>
                          <td className="is-muted">{r.changedBy ? `${r.changedBy}, ${when(r.changedAt)}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="aw-card">
        <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" style={{ alignSelf: 'flex-start' }}
          onClick={() => { const next = !showHistory; setShowHistory(next); if (next) dp.loadHistory(); }}>
          <History size={13} /> {showHistory ? t('Hide change history') : t('Show change history')}
        </button>
        {showHistory && (
          dp.history.length === 0
            ? <p className="aw-meta">{t('No changes recorded yet.')}</p>
            : (
              <div className="aw-table-wrap" style={{ maxHeight: 260 }}>
                <table className="aw-table">
                  <thead><tr><th>{t('When')}</th><th>{t('Window')}</th><th>{t('From')}</th><th>{t('To')}</th><th>{t('By')}</th><th>{t('How')}</th></tr></thead>
                  <tbody>
                    {dp.history.map((h, i) => (
                      <tr key={i}>
                        <td>{when(h.changedAt)}</td>
                        <td>{dp.rows.find((r) => r.key === h.windowKey)?.label ?? h.windowKey}</td>
                        <td>{modeLabel(h.from as DateMode)}</td><td>{modeLabel(h.to as DateMode)}</td>
                        <td>{h.changedBy}</td><td>{h.source === 'import' ? t('File import') : t('Screen')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}
      </section>

      <AwDialog open={!!preview} title={t('Import date settings')} onClose={() => setPreview(null)} maxWidth="34rem" compact>
        {preview && (
          <div className="aw-stack">
            {preview.willChange.length === 0 ? (
              <p className="aw-meta">{t('The file matches the current settings. Nothing would change.')}</p>
            ) : (
              <>
                <p className="aw-meta">{t('This file would change {{1}} window(s):', { 1: preview.willChange.length })}</p>
                <div className="aw-table-wrap" style={{ maxHeight: 260 }}>
                  <table className="aw-table">
                    <thead><tr><th>{t('Window')}</th><th>{t('From')}</th><th>{t('To')}</th></tr></thead>
                    <tbody>
                      {preview.willChange.map((c) => (
                        <tr key={c.windowKey}><td>{c.label}</td><td>{modeLabel(c.from)}</td><td><strong>{modeLabel(c.to)}</strong></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setPreview(null)}>{t('Cancel')}</button>
              <button type="button" className="aw-btn aw-btn-primary" onClick={applyImport} disabled={preview.willChange.length === 0 || dp.isSaving}>{t('Apply file')}</button>
            </div>
          </div>
        )}
      </AwDialog>
    </div>
  );
};

export default DateSettings;
