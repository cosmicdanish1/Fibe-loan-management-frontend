import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, History, RotateCcw } from 'lucide-react';
import { apiService } from '../../../../../services/api';

interface Row { id: number; at: string; event: string; actor: string | null; user: string | null; detail: string | null }

/** Activity (administrators only): the latest two-factor events, including who approved what. */
const ActivityPanel: React.FC = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    setErr('');
    try { setRows(await apiService.twoFaAudit()); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not load activity'); setRows([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="aw-card">
      <div className="aw-card-head">
        <span className="aw-card-icon"><History size={14} /></span>
        <h2 className="aw-card-title">Activity</h2>
        <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" style={{ marginLeft: 'auto' }} onClick={load}><RotateCcw size={12} /> Refresh</button>
      </div>
      <p className="aw-meta">The latest 150 events: set-ups, resets, lockouts, who approved which action, and protection switches.</p>
      {err && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{err}</div></div>}
      <div className="aw-table-wrap" style={{ maxHeight: 460, overflow: 'auto' }}>
        <table className="aw-table">
          <thead><tr><th>When</th><th>Event</th><th>User</th><th>By</th><th>Detail</th></tr></thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleString()}</td>
                <td>{r.event.replace(/_/g, ' ')}</td>
                <td>{r.user || '-'}</td>
                <td>{r.actor || '-'}</td>
                <td className="aw-meta">{r.detail || ''}</td>
              </tr>
            ))}
            {rows && rows.length === 0 && !err && <tr><td colSpan={5} className="aw-meta" style={{ textAlign: 'center' }}>No activity yet</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ActivityPanel;
