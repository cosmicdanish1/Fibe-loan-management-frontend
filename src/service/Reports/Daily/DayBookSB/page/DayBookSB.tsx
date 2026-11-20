import React, { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, PiggyBank, Calendar } from 'lucide-react';
import { DatePicker, message } from 'antd';
import { apiService } from '../../../../../services/api';
import { CrDrIndicator } from '../../../../../components/shared/CrDrIndicator';
import { ReportShell, StatCards } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import SbBento from '../views/SbBento';
import SbTerminal from '../views/SbTerminal';
import { adaptFlatDayBook, isFlatDayBook, type SBData } from '../views/sbModel';
import dayjs from 'dayjs';
import { csvCell } from '@/utils/csv';
import { escapeHtml } from '@/utils/html';

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? '-' : '') + fmt(n);

// Print-only layout matching the legacy report exactly (letterhead, Tr No/A/C
// No./A/C Name/Deposit(Cash,Transfer,Total)/Withdrawal(Cash,Transfer,Total)
// columns, TOTAL row, summary block) — plain decimals, no thousands
// separators or currency symbol, same as the legacy screen. On-screen view is
// untouched; this feeds handlePrint only.
// Portrait, not landscape: this app's print pipeline doesn't honor
// `@page { size: landscape }` from a dynamically-written iframe (confirmed
// live — content came out sideways on a portrait sheet). Portrait + narrow
// columns is the pattern already proven to work elsewhere (Day-Book 1.3).
const SB_LINE_W = 94;
const SB_DASH = '-'.repeat(SB_LINE_W);
const SB_COL_TR = 6;
const SB_COL_ACC = 8;
const SB_COL_NAME = 20;
const SB_COL_AMT = 10;

const plain = (n: number) => Math.abs(n).toFixed(2);
const plainSigned = (n: number) => (n < 0 ? '-' : '') + plain(n);
const padL = (s: string, w: number) => s.padStart(w);
const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const centerIn = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildSBPrintLines(data: SBData, dateLabel: string, bookLabel = 'Saving'): string[] {
  const lines: string[] = [];
  const prefixW = SB_COL_TR + SB_COL_ACC + SB_COL_NAME;
  const amtSpan = SB_COL_AMT * 3;
  const tag = bookLabel === 'CD' ? 'CD' : 'SB';

  lines.push(centerIn('Espat Karmchari Co-Operative Credit Society Limited.', SB_LINE_W));
  lines.push(centerIn('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', SB_LINE_W));
  lines.push('');
  lines.push(centerIn(`Day Book [${bookLabel}] for Date :${dateLabel}`, SB_LINE_W));
  lines.push('');
  lines.push(padL('Page Number : 1', SB_LINE_W));
  lines.push(SB_DASH);

  lines.push(
    `${padR('Tr No', SB_COL_TR)}${padR('A/C No.', SB_COL_ACC)}${padR('A/C Name', SB_COL_NAME)}` +
    `${centerIn('Deposit', amtSpan)}${centerIn('Withdrawal', amtSpan)}`
  );
  lines.push(
    `${' '.repeat(prefixW)}${padR('Cash', SB_COL_AMT)}${padR('Transfer', SB_COL_AMT)}${padR('Total', SB_COL_AMT)}` +
    `${padR('Cash', SB_COL_AMT)}${padR('Transfer', SB_COL_AMT)}${padR('Total', SB_COL_AMT)}`
  );
  lines.push(SB_DASH);

  data.entries.forEach(e => {
    const depTotal = e.depositCash + e.depositTransfer;
    const wdTotal = e.withdrawalCash + e.withdrawalTransfer;
    lines.push(
      `${padR(String(e.srNo), SB_COL_TR)}${padR(e.accNo, SB_COL_ACC)}${padR(e.acName, SB_COL_NAME)}` +
      `${padR(e.depositCash > 0 ? plain(e.depositCash) : '', SB_COL_AMT)}` +
      `${padR(e.depositTransfer > 0 ? plain(e.depositTransfer) : '', SB_COL_AMT)}` +
      `${padR(depTotal > 0 ? plain(depTotal) : '', SB_COL_AMT)}` +
      `${padR(e.withdrawalCash > 0 ? plain(e.withdrawalCash) : '', SB_COL_AMT)}` +
      `${padR(e.withdrawalTransfer > 0 ? plain(e.withdrawalTransfer) : '', SB_COL_AMT)}` +
      `${padR(wdTotal > 0 ? plain(wdTotal) : '', SB_COL_AMT)}`
    );
  });

  lines.push(SB_DASH);
  lines.push(
    `${padR('TOTAL :-', prefixW)}` +
    `${padR(plain(data.totalDepositCash), SB_COL_AMT)}` +
    `${padR(plain(data.totalDepositTransfer), SB_COL_AMT)}` +
    `${padR(plain(data.totalDeposit), SB_COL_AMT)}` +
    `${padR(plain(data.totalWithdrawalCash), SB_COL_AMT)}` +
    `${padR(plain(data.totalWithdrawalTransfer), SB_COL_AMT)}` +
    `${padR(plain(data.totalWithdrawal), SB_COL_AMT)}`
  );
  lines.push(SB_DASH);

  const IND = ' '.repeat(34);
  const LBL_W = 24;
  const VAL_W = 12;
  ([
    [`Opening Balance [${tag}]`, plainSigned(data.openingBalance)],
    [`Total Deposit [${tag}]`, plain(data.totalDeposit)],
    [`Total Cash In Hand [${tag}]`, plain(data.totalCashInHand)],
    [`Total Withdrawal [${tag}]`, plain(data.totalWithdrawal)],
    [`Closing Balance [${tag}]`, plainSigned(data.closingBalance)],
  ] as [string, string][]).forEach(([label, value]) => {
    lines.push(`${IND}${label.padEnd(LBL_W)}${padL(value, VAL_W)}`);
  });
  lines.push(SB_DASH);
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

// The savings (SB) and compulsory-deposit (CD) day books share this window. The CD report comes back as
// a flat list, so it is turned into the savings shape (one row per transaction, deposit / withdrawal,
// cash / transfer) before anything is drawn.
const DayBookSB: React.FC<{ filterType?: 'sb' | 'cd' }> = ({ filterType = 'sb' }) => {
  const bookLabel = filterType === 'cd' ? 'CD' : 'Saving';
  const shortLabel = filterType === 'cd' ? 'CD' : 'SB';
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SBData | null>(null);
  const { enabled, view, setView } = useReportViews(filterType === 'cd' ? 'daily.day-book-cd' : 'daily.day-book-sb');

  // themeSlice normalises interfaceMode to 'light' | 'dark' (there is no 'system' value)

  useEffect(() => { loadData(); }, [selectedDate, filterType]);

  const loadRequestId = useRef(0);

  const loadData = async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    try {
      const response = filterType === 'cd'
        ? await apiService.getDayBookReport(selectedDate.format('YYYY-MM-DD'), 'screen', 'cd')
        : await apiService.getDayBookSBReport(selectedDate.format('YYYY-MM-DD'), 'screen');
      if (requestId !== loadRequestId.current) return; // a newer date was requested meanwhile
      if (response.success && response.data) {
        const d = response.data?.data ?? response.data;
        setData(isFlatDayBook(d) || filterType === 'cd' ? adaptFlatDayBook(d) : d);
      } else {
        setData(null);
        message.error(response.message || response.error || 'Failed to load report');
      }
    } catch {
      if (requestId !== loadRequestId.current) return;
      setData(null);
      message.error('An error occurred while fetching report');
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  };

  // Print always uses the legacy monospace letterhead, whichever view is on screen.
  const handlePrint = () => {
    if (!data) return;
    const lines = buildSBPrintLines(data, selectedDate.format('DD-MMM-YYYY'), bookLabel);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Day Book [${shortLabel}]</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; white-space: pre; width: fit-content; margin: 0 auto; }
</style></head><body><pre>${escapeHtml(lines.join('\n'))}</pre></body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    let csv = 'Sr No,A/C No,A/C Name,Deposit Cash,Deposit Transfer,Deposit Total,Withdrawal Cash,Withdrawal Transfer,Withdrawal Total\n';
    data.entries.forEach(e =>
      csv += `${e.srNo},${e.accNo},${csvCell(e.acName)},${e.depositCash},${e.depositTransfer},${e.depositCash + e.depositTransfer},${e.withdrawalCash},${e.withdrawalTransfer},${e.withdrawalCash + e.withdrawalTransfer}\n`
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `DayBook${shortLabel}_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const hasData = Boolean(data && data.entries.length > 0);

  return (
    <ReportShell
      className="dbsb-page aw-calm"
      title={`Day Book [${bookLabel}]`}
      desc={filterType === 'cd' ? 'Compulsory deposit ledger' : 'Savings bank ledger'}
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!hasData}><FileDown size={14} /> CSV</button>
        </>
      }
      aside={
        <>
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Settings size={14} /></span>
              <h2 className="aw-card-title">Parameters</h2>
              <button type="button" className="aw-icon-btn" style={{ marginLeft: 'auto' }} onClick={loadData} data-tip="Reload" aria-label="Reload"><RefreshCw size={13} /></button>
            </div>
            <div className="aw-stack">
              <div>
                <label className="aw-label" htmlFor="dbsb-date">Date</label>
                <DatePicker id="dbsb-date" value={selectedDate} allowClear={false} onChange={v => v && setSelectedDate(v)}
                  format="DD-MMM-YYYY" className="aw-picker" popupClassName="aw-select-popup" suffixIcon={<Calendar size={13} />} />
              </div>
              <button type="button" className="aw-btn aw-btn-primary" onClick={loadData} disabled={loading} style={{ width: '100%' }}>
                <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load report'}
              </button>
            </div>
          </section>
          {data && <StatCards items={[
            { label: `Opening [${shortLabel}]`, value: fmtSigned(data.openingBalance), tone: 'muted' },
            { label: 'Total deposit', value: fmt(data.totalDeposit), tone: 'success' },
            { label: 'Cash in hand', value: fmt(data.totalCashInHand), tone: 'muted' },
            { label: 'Total withdrawal', value: fmt(data.totalWithdrawal), tone: 'danger' },
            { label: `Closing [${shortLabel}]`, value: fmtSigned(data.closingBalance), tone: data.closingBalance >= 0 ? 'info' : 'danger' },
            { label: 'Transactions', value: String(data.totalTransactions), tone: 'muted' },
          ]} />}
        </>
      }
      footerLeft={`Day Book [${shortLabel}] · ${filterType === 'cd' ? 'Compulsory deposit ledger' : 'Savings ledger'}`}
      footerRight={selectedDate.format('YYYYMMDD')}
    >
      {/* Pro views draw the same transactions differently. Print is always the legacy letterhead. */}
      {hasData && data && view === 'bento' && <SbBento data={data} bookLabel={shortLabel} />}
      {hasData && data && view === 'terminal' && <div style={{ height: 'calc(100vh - 190px)', minHeight: 360 }}><SbTerminal data={data} bookLabel={shortLabel} /></div>}

      {view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Day Book [{bookLabel}] — {selectedDate.format('DD-MMM-YYYY')}</span>
            {data && <span className="aw-meta">{data.totalTransactions} entries</span>}
          </div>
          <div className="rpt-legacy-doc" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
              {hasData && data ? (
                <div id="sb-print-area">
                  <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
                    <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
                    <div className="aw-meta">Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                    <div className="aw-meta">Day Book [{bookLabel}] for Date : {selectedDate.format('DD-MMM-YYYY')}</div>
                  </div>

                  <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                    <table className="aw-table">
                      <thead>
                        <tr>
                          <th rowSpan={2}>Tr no</th><th rowSpan={2}>A/C no.</th><th rowSpan={2}>A/C name</th>
                          <th colSpan={3} className="is-center">Deposit</th>
                          <th colSpan={3} className="is-center">Withdrawal</th>
                        </tr>
                        <tr>
                          <th className="is-right">Cash</th><th className="is-right">Transfer</th><th className="is-right">Total</th>
                          <th className="is-right">Cash</th><th className="is-right">Transfer</th><th className="is-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.entries.map((e, i) => (
                          <tr key={i}>
                            <td className="is-muted">{e.srNo}</td>
                            <td className="is-accent">{e.accNo}</td>
                            <td>{e.acName}</td>
                            <td className="is-right is-success">{e.depositCash > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{fmt(e.depositCash)}</>) : '0.00'}</td>
                            <td className="is-right is-success">{e.depositTransfer > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{fmt(e.depositTransfer)}</>) : '0.00'}</td>
                            <td className="is-right is-success">{(e.depositCash + e.depositTransfer) > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{fmt(e.depositCash + e.depositTransfer)}</>) : '0.00'}</td>
                            <td className="is-right" style={{ color: 'var(--aw-danger)' }}>{e.withdrawalCash > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{fmt(e.withdrawalCash)}</>) : '0.00'}</td>
                            <td className="is-right" style={{ color: 'var(--aw-danger)' }}>{e.withdrawalTransfer > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{fmt(e.withdrawalTransfer)}</>) : '0.00'}</td>
                            <td className="is-right" style={{ color: 'var(--aw-danger)' }}>{(e.withdrawalCash + e.withdrawalTransfer) > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{fmt(e.withdrawalCash + e.withdrawalTransfer)}</>) : '0.00'}</td>
                          </tr>
                        ))}

                        {/* Grand total */}
                        <tr>
                          <td colSpan={3} className="is-right"><b>TOTAL :-</b></td>
                          <td className="is-right"><b>{data.totalDepositCash > 0 && <CrDrIndicator type="credit" className="mr-1" />}{fmt(data.totalDepositCash)}</b></td>
                          <td className="is-right"><b>{data.totalDepositTransfer > 0 && <CrDrIndicator type="credit" className="mr-1" />}{fmt(data.totalDepositTransfer)}</b></td>
                          <td className="is-right"><b>{data.totalDeposit > 0 && <CrDrIndicator type="credit" className="mr-1" />}{fmt(data.totalDeposit)}</b></td>
                          <td className="is-right"><b>{data.totalWithdrawalCash > 0 && <CrDrIndicator type="debit" className="mr-1" />}{fmt(data.totalWithdrawalCash)}</b></td>
                          <td className="is-right"><b>{data.totalWithdrawalTransfer > 0 && <CrDrIndicator type="debit" className="mr-1" />}{fmt(data.totalWithdrawalTransfer)}</b></td>
                          <td className="is-right"><b>{data.totalWithdrawal > 0 && <CrDrIndicator type="debit" className="mr-1" />}{fmt(data.totalWithdrawal)}</b></td>
                        </tr>

                        {/* Summary rows */}
                        {[
                          { label: `Opening Balance [${shortLabel}]`, value: fmtSigned(data.openingBalance), crdr: null },
                          { label: `Total Deposit [${shortLabel}]`, value: fmt(data.totalDeposit), crdr: 'credit' as const },
                          { label: `Total Cash In Hand [${shortLabel}]`, value: fmt(data.totalCashInHand), crdr: null },
                          { label: `Total Withdrawal [${shortLabel}]`, value: fmt(data.totalWithdrawal), crdr: 'debit' as const },
                          { label: `Closing Balance [${shortLabel}]`, value: fmtSigned(data.closingBalance), crdr: null },
                        ].map(({ label, value, crdr }, i) => (
                          <tr key={`sum-${i}`}>
                            <td colSpan={7} className="is-right"><b>{label}</b></td>
                            <td colSpan={2} className="is-right"><b>{crdr && <CrDrIndicator type={crdr} className="mr-1" />}{value}</b></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="aw-meta" style={{ marginTop: 10, fontStyle: 'italic' }}>* Report As Per Data Available ..</p>
                </div>
              ) : !loading ? (
                <div className="aw-empty" style={{ padding: 32 }}>
                  <PiggyBank size={34} />
                  <p className="aw-strong">No {shortLabel} transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
                  <span className="aw-meta">Try a date with {filterType === 'cd' ? 'compulsory deposit' : 'savings account'} activity</span>
                </div>
              ) : null}
          </div>
        </section>
      )}

      {view !== 'legacy' && !hasData && !loading && (
        <section className="aw-card">
          <div className="aw-empty" style={{ padding: 32 }}>
            <PiggyBank size={34} />
            <p className="aw-strong">No {shortLabel} transactions</p>
            <span className="aw-meta">{selectedDate.format('DD MMM YYYY')}</span>
          </div>
        </section>
      )}
    </ReportShell>
  );
};

export default DayBookSB;
