import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Settings, ChevronLeft, ChevronRight,
  TrendingUp, Search, RefreshCw, Printer, FileDown
} from 'lucide-react';
import { Select } from 'antd';
import { apiService } from '../../../../services/api';
import dayjs from 'dayjs';


const showDialog = async (type: 'info' | 'warning' | 'error', msg: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

interface StatementData { key: string; demandForMonth: string; balanceForMonth: number; interestReceived: number; interestReceivable: number; amount: number; month: number; year: number; }


const InterestReceivableReceivedStatement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatementData[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const stableId = React.useRef(Math.random().toString(16).slice(2, 10).toUpperCase());

  const [filters, setFilters] = useState({
    fromMonth: dayjs().subtract(6, 'month').month() + 1,
    fromYear: dayjs().subtract(6, 'month').year(),
    toMonth: dayjs().month() + 1,
    toYear: dayjs().year(),
    branch: undefined as string | undefined,
    fromMember: '',
    toMember: '',
    wingNo: undefined as string | undefined
  });

  const months = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
    { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
    { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
    { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 }
  ];
  const years = Array.from({ length: 11 }, (_, i) => dayjs().year() - 5 + i);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const wingRes = await apiService.getReportWings();
      if (wingRes.success && wingRes.data) setWings(wingRes.data);
    } catch { }
  }, []);

  const handleWingChange = useCallback(async (value: string) => {
    setFilters(prev => ({ ...prev, wingNo: value, branch: undefined }));
    setOffices([]);
    if (value) {
      try {
        const officeRes = await apiService.getReportOffices(value);
        if (officeRes.success && officeRes.data) setOffices(officeRes.data);
      } catch { await showDialog('error', 'Fetch Error', 'Failed to fetch offices.'); }
    }
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getInterestReceivableReceivedStatement({
        fromMonth: filters.fromMonth, fromYear: filters.fromYear,
        toMonth: filters.toMonth, toYear: filters.toYear,
        branch: filters.branch, fromMember: filters.fromMember, toMember: filters.toMember
      });
      if (response.success && response.data) {
        setData(response.data);
        if (response.data.length === 0) await showDialog('info', 'No Records', 'No records found. Adjust your criteria.');
      } else await showDialog('error', 'Fetch Failed', response.message || 'Failed to fetch data.');
    } catch { await showDialog('error', 'Connection Error', 'Error fetching statement.'); }
    finally { setLoading(false); }
  }, [filters]);

  const formatCurrency = useCallback((amount: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount), []);

  const handleExportCSV = useCallback(async () => {
    if (data.length === 0) { await showDialog('warning', 'No Data', 'No data to export.'); return; }
    const headers = ['Month/Demand Cycle', 'Interest Receivable', 'Interest Received', 'Variance'];
    const rows = data.map(r => [r.demandForMonth, r.interestReceivable.toFixed(2), r.interestReceived.toFixed(2), (r.interestReceived - r.interestReceivable).toFixed(2)]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `interest-statement-${new Date().toISOString().split('T')[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
  }, [data]);

  const totals = useMemo(() => data.reduce((acc, curr) => ({
    receivable: acc.receivable + curr.interestReceivable,
    received: acc.received + curr.interestReceived,
    total: acc.total + curr.amount
  }), { receivable: 0, received: 0, total: 0 }), [data]);
  const STATEMENT_PAGE_SIZE = 30;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [data]);
  const pages = Math.ceil(data.length / STATEMENT_PAGE_SIZE);
  const pageRows = data.slice((page - 1) * STATEMENT_PAGE_SIZE, page * STATEMENT_PAGE_SIZE);
  const variance = totals.received - totals.receivable;

  const monthOptions = months.map(m => ({ value: m.value, label: m.label.slice(0, 3) }));
  const yearOptions = years.map(y => ({ value: y, label: String(y) }));

  return (
    <div className="app-window">

      {/* Header */}
      <div className="aw-header aw-ambient aw-noprint">
        <div className="min-w-0">
          <h1 className="aw-title">Interest Statement</h1>
          <p className="aw-desc">Loan Asset Performance Monitoring</p>
        </div>
        <div className="aw-actions">
          {loading && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> Generating statement...
            </span>
          )}
          <button type="button" onClick={() => window.print()} className="aw-btn aw-btn-secondary" data-tip="Print this statement" data-tip-pos="bottom-end">
            <Printer size={13} /> Print Report
          </button>
          <button type="button" onClick={handleExportCSV} className="aw-btn aw-btn-primary" data-tip="Download as a spreadsheet file" data-tip-pos="bottom-end">
            <FileDown size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="aw-fit">
        <div className="aw-split aw-split-form aw-print-full">

          {/* Left Filter Panel */}
          <div className="aw-side aw-noprint">
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Settings size={14} /></span>
                <h2 className="aw-card-title">Parameters</h2>
                <button type="button" onClick={() => setFilters({ fromMonth: 1, fromYear: 2020, toMonth: 12, toYear: 2025, branch: undefined, fromMember: '', toMember: '', wingNo: undefined })}
                  className="aw-icon-btn" style={{ marginLeft: 'auto' }} aria-label="Reset filters" data-tip="Reset filters" data-tip-pos="bottom-end">
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="aw-stack">

                <div className="aw-two" style={{ gap: 10 }}>
                  <div>
                    <label className="aw-label" htmlFor="irr-from-month">From Month</label>
                    <Select id="irr-from-month" className="aw-select" popupClassName="aw-select-popup" value={filters.fromMonth}
                      onChange={v => setFilters(f => ({ ...f, fromMonth: v }))} options={monthOptions} />
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="irr-from-year">Year</label>
                    <Select id="irr-from-year" className="aw-select" popupClassName="aw-select-popup" value={filters.fromYear}
                      onChange={v => setFilters(f => ({ ...f, fromYear: v }))} options={yearOptions} />
                  </div>
                </div>

                <div className="aw-two" style={{ gap: 10 }}>
                  <div>
                    <label className="aw-label" htmlFor="irr-to-month">To Month</label>
                    <Select id="irr-to-month" className="aw-select" popupClassName="aw-select-popup" value={filters.toMonth}
                      onChange={v => setFilters(f => ({ ...f, toMonth: v }))} options={monthOptions} />
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="irr-to-year">Year</label>
                    <Select id="irr-to-year" className="aw-select" popupClassName="aw-select-popup" value={filters.toYear}
                      onChange={v => setFilters(f => ({ ...f, toYear: v }))} options={yearOptions} />
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--aw-border)' }} />

                <div>
                  <label className="aw-label" htmlFor="irr-wing">Wing / Section</label>
                  <Select id="irr-wing" className="aw-select" popupClassName="aw-select-popup" placeholder="Select Wing" allowClear
                    value={filters.wingNo ?? null} onChange={v => handleWingChange(v as string)}
                    options={wings.map(w => ({ value: w.wingNo, label: w.name || w.wingName || w.wingNo }))} />
                </div>
                <div>
                  <label className="aw-label" htmlFor="irr-office">Office / Branch</label>
                  <Select id="irr-office" className="aw-select" popupClassName="aw-select-popup" placeholder="Select Office" allowClear
                    value={filters.branch ?? null} onChange={v => setFilters(f => ({ ...f, branch: v as string | undefined }))} disabled={!filters.wingNo}
                    options={offices.map(o => ({ value: o.officeNo, label: o.name || o.officeName }))} />
                </div>

                <div style={{ height: 1, background: 'var(--aw-border)' }} />

                <div className="aw-two" style={{ gap: 10 }}>
                  <div>
                    <label className="aw-label" htmlFor="irr-from-member">From Member</label>
                    <input id="irr-from-member" value={filters.fromMember} onChange={e => setFilters(f => ({ ...f, fromMember: e.target.value }))}
                      placeholder="MB No..." className="aw-input" />
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="irr-to-member">To Member</label>
                    <input id="irr-to-member" value={filters.toMember} onChange={e => setFilters(f => ({ ...f, toMember: e.target.value }))}
                      placeholder="MB No..." className="aw-input" />
                  </div>
                </div>

                <button type="button" onClick={handleSearch} disabled={loading} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                  {loading ? <RefreshCw size={13} className="aw-spin" /> : <Search size={13} />} Generate Statement
                </button>

                {data.length > 0 && (
                  <div className="aw-rows aw-fade-in" style={{ paddingTop: 4, borderTop: '1px solid var(--aw-border)' }}>
                    <div className="aw-row">
                      <span className="aw-row-label">Total Receivable</span>
                      <span className="aw-row-value" style={{ color: 'var(--aw-info)' }}>₹{formatCurrency(totals.receivable)}</span>
                    </div>
                    <div className="aw-row">
                      <span className="aw-row-label">Total Received</span>
                      <span className="aw-row-value" style={{ color: 'var(--aw-success)' }}>₹{formatCurrency(totals.received)}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Statement Table */}
          <section className="aw-card aw-main">
            <div className="aw-main-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="aw-card-icon"><FileText size={14} /></span>
                <h2 className="aw-card-title">Interest Statement</h2>
                {data.length > 0 && <span className="aw-pill">{data.length} rows</span>}
              </div>
              <span className="aw-meta" style={{ textTransform: 'uppercase' }}>Ref: {stableId.current}</span>
            </div>
            <div className="aw-main-body" style={{ padding: 0 }}>
              {data.length > 0 ? (
                <table className="aw-table aw-fade-in">
                  <thead>
                    <tr>
                      {['Month / Cycle', 'Int. Receivable', 'Int. Received', 'Variance'].map((h, i) => (
                        <th key={h} className={i > 0 ? 'is-right' : ''}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(r => {
                      const v = r.interestReceived - r.interestReceivable;
                      return (
                        <tr key={r.key}>
                          <td>{r.demandForMonth}</td>
                          <td className="is-right is-info">₹{formatCurrency(r.interestReceivable)}</td>
                          <td className="is-right is-success">₹{formatCurrency(r.interestReceived)}</td>
                          <td className={`is-right ${v >= 0 ? 'is-success' : 'is-danger'}`}>{v >= 0 ? '+' : ''}{formatCurrency(v)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ textTransform: 'uppercase' }}>Grand Total</td>
                      <td className="is-right" style={{ color: 'var(--aw-info)' }}>₹{formatCurrency(totals.receivable)}</td>
                      <td className="is-right" style={{ color: 'var(--aw-success)' }}>₹{formatCurrency(totals.received)}</td>
                      <td className="is-right" style={{ color: variance >= 0 ? 'var(--aw-success)' : 'var(--aw-danger)' }}>₹{formatCurrency(variance)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="aw-empty" style={{ minHeight: '100%' }}>
                  <TrendingUp size={36} />
                  <span>No statement data — configure filters and generate</span>
                </div>
              )}
            </div>
            {pages > 1 && (
              <div className="aw-main-foot aw-noprint">
                <span>
                  {((page - 1) * STATEMENT_PAGE_SIZE) + 1}–{Math.min(page * STATEMENT_PAGE_SIZE, data.length)} of {data.length}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="aw-btn aw-btn-secondary" style={{ padding: '0 8px' }} aria-label="Previous page" data-tip="Previous page" data-tip-pos="top-end">
                    <ChevronLeft size={15} />
                  </button>
                  <span className="aw-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>{page} / {pages}</span>
                  <button type="button" onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}
                    className="aw-btn aw-btn-secondary" style={{ padding: '0 8px' }} aria-label="Next page" data-tip="Next page" data-tip-pos="top-end">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default InterestReceivableReceivedStatement;
