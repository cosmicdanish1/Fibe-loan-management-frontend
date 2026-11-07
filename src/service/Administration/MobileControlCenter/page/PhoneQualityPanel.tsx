import React, { useCallback, useEffect, useState } from 'react';
import { Phone, RefreshCw } from 'lucide-react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { PhoneQualityMember, PhoneQualitySummary, mobileAdminApi } from '../api/mobileAdminApi';

type Group = 'MISSING' | 'INVALID' | 'SHARED';

/**
 * Phone data quality (PRD 2.2, ES-232): who has a usable registered phone. Staff use it to correct numbers at the counter,
 * because the activation call-back needs a number that belongs to one member.
 */
const PhoneQualityPanel: React.FC = () => {
  const { t } = useTranslation();
  const [sum, setSum] = useState<PhoneQualitySummary | null>(null);
  const [group, setGroup] = useState<Group>('MISSING');
  const [rows, setRows] = useState<PhoneQualityMember[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([mobileAdminApi.phoneQuality(), mobileAdminApi.phoneQualityMembers(group)]);
      setSum(s);
      setRows(r);
    } catch (err: any) { message.error(err?.message || t('Could not load the phone report')); }
    finally { setLoading(false); }
  }, [group, t]);

  useEffect(() => { void load(); }, [load]);

  const pct = (n: number) => (sum && sum.activeMembers ? `${Math.round((n / sum.activeMembers) * 100)}%` : '');
  const tile = (label: string, n: number, color: string) => (
    <div className="aw-card" style={{ padding: 12, minWidth: 150 }}>
      <div className="aw-meta">{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{n.toLocaleString('en-IN')}</div>
      <div className="aw-meta">{pct(n)}</div>
    </div>
  );

  return (
    <section className="aw-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <p className="aw-meta" style={{ margin: 0 }}>
          {t('A usable phone belongs to one member (not shared by more than 3) and has 10 digits. Only these members can be called back for an activation request.')}
        </p>
        <button type="button" className="aw-icon-btn" onClick={load} disabled={loading} aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="bottom-end">
          <RefreshCw size={14} className={loading ? 'aw-spin' : ''} />
        </button>
      </div>

      {sum && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0' }}>
          {tile(t('Active members'), sum.activeMembers, 'var(--aw-text, inherit)')}
          {tile(t('Usable phone'), sum.ok, 'var(--aw-success)')}
          {tile(t('No phone'), sum.missing, 'var(--aw-danger)')}
          {tile(t('Invalid phone'), sum.invalid, 'var(--aw-danger)')}
          {tile(t('Shared phone'), sum.shared, 'var(--aw-warning)')}
        </div>
      )}

      {sum && sum.sharedNumbers.length > 0 && (
        <p className="aw-meta">
          {t('Most shared numbers')}: {sum.sharedNumbers.slice(0, 5).map((s) => `${s.phone} (${s.members})`).join(', ')}.{' '}
          {t('A number used by very many members is probably a placeholder.')}
        </p>
      )}

      <div className="aw-chips" role="radiogroup" aria-label={t('Group')} style={{ marginTop: 8 }}>
        {(['MISSING', 'INVALID', 'SHARED'] as Group[]).map((g) => (
          <button key={g} type="button" role="radio" aria-checked={group === g} className="aw-chip" onClick={() => setGroup(g)}>
            {g === 'MISSING' ? t('No phone') : g === 'INVALID' ? t('Invalid phone') : t('Shared phone')}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="aw-empty"><Phone size={26} /><span>{loading ? t('Loading…') : t('Nobody in this group.')}</span></div>
      ) : (
        <div className="aw-table-wrap" style={{ marginTop: 12 }}>
          <table className="aw-table">
            <thead><tr><th>{t('Member')}</th><th>{t('Name')}</th><th>{t('Phone on record')}</th>{group === 'SHARED' && <th>{t('Members on this number')}</th>}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.mbno}>
                  <td className="is-accent">{r.mbno}</td><td>{r.name}</td><td>{r.phone || '—'}</td>
                  {group === 'SHARED' && <td>{r.sharedCount}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="aw-meta" style={{ marginTop: 6 }}>{t('Showing the first 100. Correct the number in Member Master.')}</p>
        </div>
      )}
    </section>
  );
};

export default PhoneQualityPanel;
