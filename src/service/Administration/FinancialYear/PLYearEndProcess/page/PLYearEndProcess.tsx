// page/PLYearEndProcess.tsx
//
// Redesigned from the Claude Design mockup "P&L Year End Process.dc.html"
// (project "Old app UI to modern redesign"). The mockup's two-step
// Generate → review → Post flow maps directly onto the existing backend split:
// "Generate transaction" = initiateYearTransfer (F6, archives head balances into
// yearend_head) and "Post year end" = initiatePLYearEndProcess (F7, computes
// profit, zeroes Income/Expense, carries forward, rolls the year). The from/to
// period pickers in the mockup are rendered read-only here — F7 always acts on
// the currently active financial year (by today's date), not an arbitrary range,
// so offering a picker that implies otherwise would mislead the operator.

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, Check, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { ConfigProvider, App } from 'antd';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

interface ClosingRow {
  code: string;
  name: string;
  pflag: string;
  closingBal: number;
}

interface PreviewData {
  rows: ClosingRow[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  reserveHead: { code: string; name: string } | null;
}

interface DisplayRow {
  code: string;
  name: string;
  type: 'Income' | 'Expense' | 'Reserve';
  debit: string;
  credit: string;
}

interface FYInfo {
  yearCode: number;
  startDate: string;
  endDate: string;
  closedAt: string | null;
}

const money = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (raw: string | null | undefined): string => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, msg: string, detail = '') => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}${detail ? '\n\n' + detail : ''}`);
  }
};

const closeWindow = () => {
  const api = (window as any).electron;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const typeTagStyle = (type: DisplayRow['type']): React.CSSProperties => {
  const map = {
    Income: { bg: '#e7f1ff', color: '#1747c4' },
    Expense: { bg: '#fdf0e7', color: '#a75a19' },
    Reserve: { bg: '#eaf5ee', color: '#14603c' },
  } as const;
  const c = map[type];
  return {
    display: 'inline-block', padding: '2px 7px', borderRadius: 999,
    fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
    background: c.bg, color: c.color,
  };
};

const PLYearEndProcessContent: React.FC = () => {
  const { message } = App.useApp();

  const [fy, setFy] = useState<FYInfo | null>(null);
  const [loadingFy, setLoadingFy] = useState(true);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const fetchFy = useCallback(async () => {
    setLoadingFy(true);
    try {
      const res = await apiService.getCurrentFinancialYear();
      const data: any = res.data;
      if (res.success && data) {
        setFy({
          yearCode: data.yearCode ?? data.yearcode,
          startDate: data.startDate ?? data.start_date,
          endDate: data.endDate ?? data.end_date,
          closedAt: data.closedAt ?? data.closed_at ?? null,
        });
      } else {
        setFy(null);
      }
    } catch {
      setFy(null);
    } finally {
      setLoadingFy(false);
    }
  }, []);

  const fetchPreview = useCallback(async (yearCode: number) => {
    setLoadingPreview(true);
    try {
      const res = await apiService.getClosingEntriesPreview(yearCode);
      setPreview(res.success && res.data ? res.data : null);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => { fetchFy(); }, [fetchFy]);
  useEffect(() => { if (fy?.yearCode) fetchPreview(fy.yearCode); }, [fy?.yearCode, fetchPreview]);

  const handleGenerate = async () => {
    if (!fy?.yearCode) return;
    setIsGenerating(true);
    try {
      const res = await apiService.initiateYearTransfer(fy.yearCode);
      if (res.success) {
        message.success((res.data as any)?.message || 'Closing entries generated.');
        await fetchPreview(fy.yearCode);
      } else {
        message.error(res.error || 'Failed to generate closing entries.');
      }
    } catch (e: any) {
      message.error(e?.message || 'Unable to reach server.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePost = async () => {
    if (!fy) return;

    const detail =
      `Financial Year ${fy.yearCode} (${fmtDate(fy.startDate)} → ${fmtDate(fy.endDate)})\n\n` +
      `Net profit ${money(preview?.netProfit || 0)} will post to ${preview?.reserveHead?.name || 'the Reserve Fund head'}.\n` +
      `Income and Expenditure heads will be zeroed for the new year.\n\n` +
      `This action cannot be undone.`;

    const api = (window as any).electronAPI;
    let confirmed = false;
    if (api?.showMessageBox) {
      const res = await api.showMessageBox({
        type: 'warning',
        title: 'Post Year End',
        message: `Post P&L Year End for Financial Year ${fy.yearCode}?`,
        detail,
        buttons: ['Cancel', 'Post Year End'],
        defaultId: 0,
        cancelId: 0,
      });
      confirmed = res.response === 1;
    } else {
      confirmed = window.confirm(`Post P&L Year End for FY ${fy.yearCode}?\n\n${detail}`);
    }
    if (!confirmed) return;

    setIsPosting(true);
    try {
      const res = await apiService.initiatePLYearEndProcess();
      if (res.success) {
        await showDialog('info', 'Year End Posted', (res.data as any)?.message || 'P&L Year End Process completed.');
        await fetchFy();
      } else {
        message.error(res.error || 'Post year end failed.');
      }
    } catch (e: any) {
      message.error(e?.message || 'Unable to reach server.');
    } finally {
      setIsPosting(false);
    }
  };

  const rows: DisplayRow[] = [];
  if (preview) {
    for (const r of preview.rows) {
      if (r.pflag === 'I') {
        rows.push({ code: r.code, name: r.name, type: 'Income', debit: money(r.closingBal), credit: '—' });
      } else if (r.pflag === 'E') {
        rows.push({ code: r.code, name: r.name, type: 'Expense', debit: '—', credit: money(r.closingBal) });
      }
    }
    if (preview.netProfit !== 0 && preview.reserveHead) {
      rows.push({
        code: preview.reserveHead.code,
        name: preview.reserveHead.name,
        type: 'Reserve',
        debit: preview.netProfit < 0 ? money(-preview.netProfit) : '—',
        credit: preview.netProfit > 0 ? money(preview.netProfit) : '—',
      });
    }
  }

  const debitTotal = preview ? preview.totalIncome + Math.max(-preview.netProfit, 0) : 0;
  const creditTotal = preview ? preview.totalExpense + Math.max(preview.netProfit, 0) : 0;
  const balanced = Math.abs(debitTotal - creditTotal) < 0.01;

  const isClosed = !!fy?.closedAt;
  const hasEntries = rows.length > 0;
  const canPost = !!fy && !isClosed && hasEntries && !!preview?.reserveHead && !isPosting && !isGenerating;

  usePageToolbarActions({
    onSave: handlePost,
    saveLabel: isPosting ? 'Posting...' : isClosed ? 'Year Closed' : 'Post Year End',
    saveEnabled: canPost,
  });

  return (
    <div className="plye-page" style={{ minHeight: '100vh', background: '#eef1f5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 16px 20px', gap: 12, fontSize: 13 }}>
      <style>{`
        .plye-page, .plye-page * { font-family: 'IBM Plex Sans', system-ui, sans-serif !important; }
        .plye-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace !important; font-variant-numeric: tabular-nums; }
        .plye-btn-primary:hover:not(:disabled) { background: #1a51dd !important; }
        .plye-btn-primary:active:not(:disabled) { background: #1747c4 !important; }
        .plye-btn-post:hover:not(:disabled) { background: #115434 !important; }
        .plye-btn-ghost:hover { background: #eef1f5 !important; color: #1b2230 !important; }
        .plye-btn-outline:hover:not(:disabled) { background: #f5f7fa !important; }
        .plye-row:hover { background: #fafbfd; }

        html.dark .plye-page { background: #0b1220 !important; }
        html.dark .plye-page .plye-card { background: #131c2e !important; border-color: #263248 !important; box-shadow: none !important; }
        html.dark .plye-page .plye-panel { background: #0f1726 !important; }
        html.dark .plye-page .plye-border { border-color: #263248 !important; }
        html.dark .plye-page .plye-text { color: #f5f5f7 !important; }
        html.dark .plye-page .plye-sub { color: #8b98ab !important; }
        html.dark .plye-page .plye-readonly { background: #0f1726 !important; color: #f5f5f7 !important; border-color: #2b3854 !important; }
        html.dark .plye-page .plye-pill { background: #131c2e !important; border-color: #263248 !important; color: #f5f5f7 !important; }
        html.dark .plye-page thead tr { background: #0f1726 !important; }
        html.dark .plye-page tfoot tr { background: #0f1726 !important; }
        html.dark .plye-page .plye-net-panel { background: #0f1f17 !important; }
        html.dark .plye-page td, html.dark .plye-page th { border-color: #223046 !important; }
        html.dark .plye-page tr.plye-row { border-color: #1c273a !important; }
        html.dark .plye-page tr.plye-row:hover { background: #16202f !important; }
      `}</style>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 960, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7b8695', fontWeight: 600 }}>
            <span>Administration</span><span style={{ color: '#c2cad6' }}>/</span><span>Financial Year</span>
          </div>
          <h1 className="plye-text" style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: '#1b2230' }}>P&amp;L Year End Process</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="plye-pill" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 8px', background: '#ffffff', border: '1px solid #dee3ea', borderRadius: 999, fontSize: 11, color: '#4c5766', boxShadow: '0 1px 2px rgba(20,30,50,0.04)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: isClosed ? '#1c7a4d' : '#e5a13a', boxShadow: isClosed ? '0 0 0 3px rgba(28,122,77,0.18)' : '0 0 0 3px rgba(229,161,58,0.18)' }} />
            <span>Year end <strong style={{ fontWeight: 600, color: isClosed ? '#1c7a4d' : '#1b2230' }}>{isClosed ? 'posted' : 'not posted'}</strong></span>
          </div>
          <button onClick={closeWindow} title="Close" className="plye-btn-ghost"
            style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, color: '#7b8695', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="plye-card" style={{ width: '100%', maxWidth: 960, background: '#ffffff', border: '1px solid #dee3ea', borderRadius: 10, boxShadow: '0 1px 2px rgba(20,30,50,0.05), 0 12px 32px -18px rgba(20,30,50,0.25)', overflow: 'hidden' }}>

        {/* Filter row */}
        <div className="plye-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end', padding: '10px 14px', borderBottom: '1px solid #e8ecf1', background: '#fbfcfd' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="plye-sub" style={{ fontSize: 10, fontWeight: 600, color: '#5c6674' }}>Financial year from</span>
            <div className="plye-readonly" style={{ width: '100%', padding: '5px 8px', fontSize: 12, color: '#1b2230', background: '#f5f7fa', border: '1px solid #d3dae3', borderRadius: 7, boxSizing: 'border-box' }}>
              {loadingFy ? '…' : fmtDate(fy?.startDate)}
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="plye-sub" style={{ fontSize: 10, fontWeight: 600, color: '#5c6674' }}>Financial year to</span>
            <div className="plye-readonly" style={{ width: '100%', padding: '5px 8px', fontSize: 12, color: '#1b2230', background: '#f5f7fa', border: '1px solid #d3dae3', borderRadius: 7, boxSizing: 'border-box' }}>
              {loadingFy ? '…' : fmtDate(fy?.endDate)}
            </div>
          </label>
          <button onClick={handleGenerate} disabled={!fy || isClosed || isGenerating} className="plye-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#ffffff', background: '#1e5eff', border: 'none', borderRadius: 7, cursor: (!fy || isClosed || isGenerating) ? 'not-allowed' : 'pointer', boxShadow: '0 1px 2px rgba(20,30,50,0.12)', opacity: (!fy || isClosed) ? 0.5 : 1 }}>
            <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
            <span>{isGenerating ? 'Generating…' : 'Generate transaction'}</span>
          </button>
        </div>

        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #e8ecf1' }}>
          <div className="plye-border" style={{ padding: '8px 14px', borderRight: '1px solid #e8ecf1', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="plye-sub" style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7b8695' }}>Total income</span>
            <span className="plye-mono plye-text" style={{ fontSize: 15, fontWeight: 500, color: '#1b2230' }}>{money(preview?.totalIncome || 0)}</span>
          </div>
          <div className="plye-border" style={{ padding: '8px 14px', borderRight: '1px solid #e8ecf1', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="plye-sub" style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7b8695' }}>Total expenditure</span>
            <span className="plye-mono plye-text" style={{ fontSize: 15, fontWeight: 500, color: '#1b2230' }}>{money(preview?.totalExpense || 0)}</span>
          </div>
          <div className="plye-net-panel" style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2, background: '#f7faf8' }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7b8695' }}>Net profit to {preview?.reserveHead?.name || 'reserve'}</span>
            <span className="plye-mono" style={{ fontSize: 15, fontWeight: 600, color: (preview?.netProfit ?? 0) < 0 ? '#c0392b' : '#1c7a4d' }}>{money(preview?.netProfit || 0)}</span>
          </div>
        </div>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 14px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h2 className="plye-text" style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Closing entries</h2>
            <span className="plye-sub" style={{ fontSize: 11, color: '#7b8695' }}>{rows.length} accounts</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4c5766' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: !hasEntries ? '#c2cad6' : balanced ? '#1c7a4d' : '#c0392b' }} />
            <span className="plye-sub">{!hasEntries ? 'Not generated' : balanced ? 'Balanced' : 'Out of balance'}</span>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: '0 8px 4px', maxHeight: 260, overflowY: 'auto' }}>
          <div className="plye-border" style={{ border: '1px solid #e8ecf1', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f5f7fa' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7686', borderBottom: '1px solid #e8ecf1' }}>Account</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7686', borderBottom: '1px solid #e8ecf1' }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7686', borderBottom: '1px solid #e8ecf1' }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7686', borderBottom: '1px solid #e8ecf1' }}>Debit</th>
                  <th style={{ textAlign: 'right', padding: '6px 12px 6px 10px', fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7686', borderBottom: '1px solid #e8ecf1' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {loadingPreview || loadingFy ? (
                  <tr><td colSpan={5} style={{ padding: 18, textAlign: 'center', color: '#7b8695', fontSize: 11 }}>Loading…</td></tr>
                ) : !fy ? (
                  <tr><td colSpan={5} style={{ padding: 18, textAlign: 'center', color: '#7b8695', fontSize: 11 }}>No active financial year found.</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 18, textAlign: 'center', color: '#7b8695', fontSize: 11 }}>No closing entries yet — click "Generate transaction" to archive this year's head balances.</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={i} className="plye-row" style={{ borderBottom: '1px solid #f0f3f7' }}>
                    <td className="plye-mono" style={{ padding: '6px 10px', fontSize: 11, color: '#4c5766' }}>{r.code}</td>
                    <td className="plye-text" style={{ padding: '6px 10px', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '6px 10px' }}><span style={typeTagStyle(r.type)}>{r.type}</span></td>
                    <td className="plye-mono plye-text" style={{ padding: '6px 10px', textAlign: 'right' }}>{r.debit}</td>
                    <td className="plye-mono plye-text" style={{ padding: '6px 12px 6px 10px', textAlign: 'right' }}>{r.credit}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f5f7fa' }}>
                    <td colSpan={3} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7686' }}>Totals</td>
                    <td className="plye-mono" style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{money(debitTotal)}</td>
                    <td className="plye-mono" style={{ padding: '7px 12px 7px 10px', textAlign: 'right', fontWeight: 600 }}>{money(creditTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="plye-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 14px 10px', marginTop: 4, borderTop: '1px solid #e8ecf1', background: '#fbfcfd' }}>
          <p className="plye-sub" style={{ margin: 0, fontSize: 11, color: '#6b7686', maxWidth: '42ch', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
            {!loadingPreview && preview && !preview.reserveHead && <AlertTriangle size={12} color="#c0392b" style={{ flexShrink: 0, marginTop: 1 }} />}
            <span>
              {!loadingPreview && preview && !preview.reserveHead
                ? 'Reserve Fund head (L1006) not found in Head Master — Post is disabled until it exists.'
                : 'Posting closes the selected financial year. Entries cannot be reversed once posted.'}
            </span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={closeWindow} className="plye-btn-ghost"
              style={{ padding: '6px 10px', fontSize: 12, fontWeight: 500, color: '#4c5766', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
              Exit
            </button>
            <button onClick={() => fy && fetchPreview(fy.yearCode)} disabled={!fy} className="plye-btn-outline"
              style={{ padding: '6px 10px', fontSize: 12, fontWeight: 500, color: '#2b3542', background: '#ffffff', border: '1px solid #d3dae3', borderRadius: 7, cursor: fy ? 'pointer' : 'not-allowed' }}>
              Refresh
            </button>
            <button onClick={handlePost} disabled={!canPost} className="plye-btn-post"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#ffffff', background: '#14603c', border: 'none', borderRadius: 7, cursor: canPost ? 'pointer' : 'not-allowed', boxShadow: '0 1px 2px rgba(20,30,50,0.12)', opacity: canPost ? 1 : 0.5 }}>
              <Check size={12} />
              <span>{isPosting ? 'Posting…' : isClosed ? 'Posted' : 'Post year end'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Branding footer, matches sibling Financial Year pages */}
      <div style={{ width: '100%', maxWidth: 960, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.6, padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Building2 size={10} color="#7b8695" />
          <span className="plye-sub" style={{ fontSize: 9, fontWeight: 600, color: '#7b8695' }}>Financial Year Management</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ShieldCheck size={10} color="#7b8695" />
          <span className="plye-sub" style={{ fontSize: 9, fontWeight: 600, color: '#7b8695' }}>Verified Protocol</span>
        </div>
      </div>
    </div>
  );
};

const PLYearEndProcess: React.FC = () => (
  <ConfigProvider theme={{ token: { colorPrimary: '#1e5eff', borderRadius: 7 } }}>
    <App>
      <PLYearEndProcessContent />
    </App>
  </ConfigProvider>
);

export default PLYearEndProcess;
