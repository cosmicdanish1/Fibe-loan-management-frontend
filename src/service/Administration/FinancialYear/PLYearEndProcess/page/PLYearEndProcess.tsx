// page/PLYearEndProcess.tsx
//
// Rebuilt on the shared .app-window kit (was redesigned from the Claude Design mockup "P&L Year End Process.dc.html"). The mockup's two-step
// Generate → review → Post flow maps directly onto the existing backend split:
// "Generate transaction" = initiateYearTransfer (F6, archives head balances into
// yearend_head) and "Post year end" = initiatePLYearEndProcess (F7, computes
// profit, zeroes Income/Expense, carries forward, rolls the year). The from/to
// period pickers in the mockup are rendered read-only here — F7 always acts on
// the currently active financial year (by today's date), not an arbitrary range,
// so offering a picker that implies otherwise would mislead the operator.

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, Check, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { App } from 'antd';
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
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <p className="aw-meta" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>Administration / Financial Year</p>
          <h1 className="aw-title">P&amp;L Year End Process</h1>
        </div>
        <div className="aw-actions">
          <span className={`aw-pill tone-${isClosed ? 'success' : 'warning'}`}>
            <i className="aw-status-dot" style={{ marginRight: 5, background: isClosed ? 'var(--aw-success)' : 'var(--aw-warning)' }} />
            Year end {isClosed ? 'posted' : 'not posted'}
          </span>
          <button type="button" onClick={() => fy && fetchPreview(fy.yearCode)} disabled={!fy} className="aw-btn aw-btn-secondary">
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" onClick={handlePost} disabled={!canPost} className="aw-btn aw-btn-primary">
            {isPosting ? <RefreshCw size={13} className="aw-spin" /> : <Check size={13} />}
            {isPosting ? 'Posting…' : isClosed ? 'Posted' : 'Post year end'}
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> Exit
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          {/* ── Period + generate ── */}
          <section className="aw-card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'end' }}>
              <div>
                <span className="aw-label">Financial year from</span>
                <div className="aw-input" style={{ display: 'flex', alignItems: 'center' }}>{loadingFy ? '…' : fmtDate(fy?.startDate)}</div>
              </div>
              <div>
                <span className="aw-label">Financial year to</span>
                <div className="aw-input" style={{ display: 'flex', alignItems: 'center' }}>{loadingFy ? '…' : fmtDate(fy?.endDate)}</div>
              </div>
              <button type="button" onClick={handleGenerate} disabled={!fy || isClosed || isGenerating} className="aw-btn aw-btn-secondary">
                <RefreshCw size={13} className={isGenerating ? 'aw-spin' : ''} />
                {isGenerating ? 'Generating…' : 'Generate transaction'}
              </button>
            </div>
          </section>

          {/* ── Summary ── */}
          <div className="aw-stats aw-stats-3">
            <div className="aw-stat aw-stat-left">
              <div className="aw-stat-label">Total income</div>
              <div className="aw-stat-value">{money(preview?.totalIncome || 0)}</div>
            </div>
            <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-warning)' }}>
              <div className="aw-stat-label">Total expenditure</div>
              <div className="aw-stat-value">{money(preview?.totalExpense || 0)}</div>
            </div>
            <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: (preview?.netProfit ?? 0) < 0 ? 'var(--aw-danger)' : 'var(--aw-success)' }}>
              <div className="aw-stat-label">Net profit to {preview?.reserveHead?.name || 'reserve'}</div>
              <div className="aw-stat-value">{money(preview?.netProfit || 0)}</div>
            </div>
          </div>

          {/* ── Closing entries ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <div>
                <h2 className="aw-card-title">Closing entries</h2>
                <p className="aw-meta">{rows.length} accounts</p>
              </div>
              <span className={`aw-pill tone-${!hasEntries ? 'muted' : balanced ? 'success' : 'danger'}`} style={{ marginLeft: 'auto' }}>
                {!hasEntries ? 'Not generated' : balanced ? 'Balanced' : 'Out of balance'}
              </span>
            </div>

            <div className="aw-table-wrap" style={{ maxHeight: '44vh' }}>
              <table className="aw-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th className="is-right">Debit</th>
                    <th className="is-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPreview || loadingFy ? (
                    <tr><td colSpan={5}><div className="aw-empty" style={{ padding: 24 }}><RefreshCw size={22} className="aw-spin" /><span className="aw-meta">Loading…</span></div></td></tr>
                  ) : !fy ? (
                    <tr><td colSpan={5}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">No active financial year found.</span></div></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={5}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">No closing entries yet — click "Generate transaction" to archive this year's head balances.</span></div></td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i}>
                      <td className="is-muted">{r.code}</td>
                      <td>{r.name}</td>
                      <td><span className={`aw-pill tone-${r.type === 'Income' ? 'info' : r.type === 'Expense' ? 'warning' : 'success'}`}>{r.type}</span></td>
                      <td className="is-right">{r.debit}</td>
                      <td className="is-right">{r.credit}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Totals</td>
                      <td className="is-right">{money(debitTotal)}</td>
                      <td className="is-right">{money(creditTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <div className={`aw-alert ${!loadingPreview && preview && !preview.reserveHead ? 'aw-alert-danger' : 'aw-alert-info'}`} style={{ marginBottom: 0 }}>
            {!loadingPreview && preview && !preview.reserveHead ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
            <span>
              {!loadingPreview && preview && !preview.reserveHead
                ? 'Reserve Fund head (L1006) not found in Head Master — Post is disabled until it exists.'
                : 'Posting closes the selected financial year. Entries cannot be reversed once posted.'}
            </span>
          </div>
        </div>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={12} /> Financial Year Management</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={12} /> Verified Protocol</span>
      </div>
    </div>
  );
};

const PLYearEndProcess: React.FC = () => (
  <App>
    <PLYearEndProcessContent />
  </App>
);

export default PLYearEndProcess;
