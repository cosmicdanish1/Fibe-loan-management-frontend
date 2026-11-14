import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Wrench } from 'lucide-react';
import { Switch, message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { AppVersionRow, FeaturesState, mobileAdminApi } from '../api/mobileAdminApi';

const fmt = (v?: string | null) => (v ? dayjs(v).format('DD MMM YYYY, HH:mm') : '—');

interface VersionDraft { latestVersion: string; minSupportedVersion: string; storeUrl: string; message: string }
const toDraft = (v: AppVersionRow): VersionDraft => ({ latestVersion: v.latestVersion ?? '', minSupportedVersion: v.minSupportedVersion ?? '', storeUrl: v.storeUrl ?? '', message: v.message ?? '' });

/**
 * Features and releases (PRD 14, ES-241): switch app modules on or off for every member, set the lowest allowed app version
 * (older apps are told to update) and turn on maintenance mode. Each change asks for the approver's authenticator code when
 * that is switched on for "Mobile App: features, versions and maintenance mode" in Two-Factor Authentication.
 */
const FeaturesPanel: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<FeaturesState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VersionDraft>>({});
  const [maintText, setMaintText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await mobileAdminApi.features();
      setState(s);
      setDrafts(Object.fromEntries(s.versions.map((v) => [v.platform, toDraft(v)])));
      setMaintText(s.maintenance.message);
    } catch (err: any) { message.error(err?.message || t('Could not load the features')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const run = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    try { await fn(); message.success(ok); await load(); }
    catch (err: any) { message.error(err?.message || t('Something went wrong')); }
    finally { setBusy(null); }
  };

  const setDraft = (platform: string, patch: Partial<VersionDraft>) =>
    setDrafts((d) => ({ ...d, [platform]: { latestVersion: '', minSupportedVersion: '', storeUrl: '', message: '', ...d[platform], ...patch } as VersionDraft }));

  return (
    <>
      <section className="aw-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 className="aw-card-title">{t('App features')}</h2>
          <button type="button" className="aw-icon-btn" onClick={load} disabled={loading} aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="bottom-end">
            <RefreshCw size={14} className={loading ? 'aw-spin' : ''} />
          </button>
        </div>
        <p className="aw-meta">{t('A switched-off feature disappears from every member’s app within a minute. Fixed deposits stay off until the society defines how they should work.')}</p>
        <div className="aw-table-wrap">
          <table className="aw-table">
            <thead><tr><th>{t('Feature')}</th><th>{t('What it is')}</th><th>{t('On')}</th><th>{t('Last changed')}</th></tr></thead>
            <tbody>
              {(state?.flags ?? []).map((f) => (
                <tr key={f.key}>
                  <td className="is-accent">{f.key}</td>
                  <td>{f.description || '—'}</td>
                  <td>
                    <Switch size="small" checked={f.enabled} loading={busy === `flag-${f.key}`} aria-label={f.key}
                      onChange={(v) => run(`flag-${f.key}`, () => mobileAdminApi.setFlag(f.key, v), v ? t('Switched on') : t('Switched off'))} />
                  </td>
                  <td className="aw-meta">{f.updatedBy ? `${f.updatedBy}, ${fmt(f.updatedAt)}` : fmt(f.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="aw-card">
        <h2 className="aw-card-title">{t('App versions')}</h2>
        <p className="aw-meta">{t('Apps older than the lowest allowed version are told to update before they can be used. Version numbers look like 1.2.3.')}</p>
        {(state?.versions ?? []).map((v) => {
          const d = drafts[v.platform] ?? toDraft(v);
          return (
            <div key={v.platform} className="aw-stack" style={{ borderTop: '1px solid var(--aw-border, transparent)', paddingTop: 10, marginTop: 10 }}>
              <h3 className="aw-label">{v.platform === 'android' ? 'Android' : 'iPhone (iOS)'} <span className="aw-meta">— {fmt(v.updatedAt)}</span></h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div><label className="aw-label" htmlFor={`v-latest-${v.platform}`}>{t('Latest version')}</label>
                  <input id={`v-latest-${v.platform}`} className="aw-input" style={{ width: 130 }} value={d.latestVersion} onChange={(e) => setDraft(v.platform, { latestVersion: e.target.value })} placeholder="1.2.3" /></div>
                <div><label className="aw-label" htmlFor={`v-min-${v.platform}`}>{t('Lowest allowed version')}</label>
                  <input id={`v-min-${v.platform}`} className="aw-input" style={{ width: 130 }} value={d.minSupportedVersion} onChange={(e) => setDraft(v.platform, { minSupportedVersion: e.target.value })} placeholder="1.0.0" /></div>
                <div style={{ flex: 1, minWidth: 220 }}><label className="aw-label" htmlFor={`v-url-${v.platform}`}>{t('Store link (https)')}</label>
                  <input id={`v-url-${v.platform}`} className="aw-input" value={d.storeUrl} onChange={(e) => setDraft(v.platform, { storeUrl: e.target.value })} placeholder="https://…" /></div>
              </div>
              <div><label className="aw-label" htmlFor={`v-msg-${v.platform}`}>{t('Message shown with the update request')}</label>
                <input id={`v-msg-${v.platform}`} className="aw-input" maxLength={300} value={d.message} onChange={(e) => setDraft(v.platform, { message: e.target.value })} /></div>
              <div>
                <button type="button" className="aw-btn aw-btn-primary" disabled={busy === `ver-${v.platform}`}
                  onClick={() => run(`ver-${v.platform}`, () => mobileAdminApi.setVersion(v.platform, { latestVersion: d.latestVersion.trim(), minSupportedVersion: d.minSupportedVersion.trim(), storeUrl: d.storeUrl.trim() || undefined, message: d.message.trim() || undefined }), t('Versions saved'))}>
                  {t('Save versions')}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="aw-card">
        <h2 className="aw-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wrench size={15} /> {t('Maintenance mode')}</h2>
        <p className="aw-meta">{t('While maintenance mode is on, every member sees the message below instead of their data. Use it before a server upgrade.')}</p>
        <div className="aw-stack">
          <label className="aw-label" htmlFor="mcc-maint">{t('Message for members')}</label>
          <input id="mcc-maint" className="aw-input" maxLength={300} value={maintText} onChange={(e) => setMaintText(e.target.value)} placeholder={t('We are updating the server. Please try again after 3 pm.')} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Switch checked={!!state?.maintenance.enabled} loading={busy === 'maint'} aria-label={t('Maintenance mode')}
              onChange={(v) => {
                if (v && !maintText.trim()) { message.warning(t('Write the message members will see first.')); return; }
                void run('maint', () => mobileAdminApi.setMaintenance(v, maintText.trim()), v ? t('Maintenance mode is ON') : t('Maintenance mode is off'));
              }} />
            <span>{state?.maintenance.enabled ? t('ON: members cannot see their data') : t('Off')}</span>
          </div>
        </div>
      </section>
    </>
  );
};

export default FeaturesPanel;
