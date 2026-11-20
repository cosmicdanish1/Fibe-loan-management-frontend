import React, { useState, useCallback } from 'react';
import { Printer, Scale, Search } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../services/api';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useBsSpec, ProBento, ProTerm, ProEd } from '../views/bsPro';
import { showDialog3 as showDialog } from '@/utils/dialog';

interface BalanceSheetItem {
  headCode: string;
  headName: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
}

interface BalanceSheetData {
  liabilities: BalanceSheetItem[];
  assets: BalanceSheetItem[];
  totals: {
    totalLiabilities: number;
    totalAssets: number;
    difference: number;
  };
}

interface FinancialOptions {
  includeFinancialYrOpBal: boolean;
  zeroClosingBalance: boolean;
  zeroTransactionAc: boolean;
  profitLossTransferAccount: string;
}

const PLBalanceSheet: React.FC = () => {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('year'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [options, setOptions] = useState<FinancialOptions>({
    includeFinancialYrOpBal: true,
    zeroClosingBalance: false,
    zeroTransactionAc: true,
    profitLossTransferAccount: ''
  });

  const { enabled, view, setView } = useReportViews('yearly.pl-balance-sheet');
  const bsSpec = useBsSpec(data ?? { liabilities: [], assets: [], totals: { totalLiabilities: 0, totalAssets: 0, difference: 0 } }, toDate?.format('DD MMM YYYY') ?? '');

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      // The balance-sheet endpoint accepts a single as-on date; the "To" date is that date.
      // (Backend has no support for the FY-opening / suppress / P&L-transfer options below.)
      const response = await apiService.getBalanceSheet(
        toDate?.format('YYYY-MM-DD'),
        {
          // The two "Suppress A/c with" checkboxes: checked = hide those accounts
          includeZeroClosing: !options.zeroClosingBalance,
          includeZeroTransaction: !options.zeroTransactionAc,
        }
      );

      // The backend wraps the payload in { success, data } and the interceptor wraps it again
      const payload = response.data?.liabilities ? response.data : response.data?.data;
      if (response.success && payload) {
        setData(payload);
      } else {
        setData(null);
        await showDialog('warning', 'No Data', 'No balance sheet data found');
      }
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      await showDialog('error', 'Fetch Error', 'Failed to load balance sheet data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  }, []);

  const handleShow = () => {
    fetchBalanceSheet();
  };

  const handlePrint = async () => {
    if (!data) {
      await showDialog('warning', 'No Data', 'No data available for printing');
      return;
    }
    window.print();
  };

  // The legacy layout is what gets printed, so any other view switches to it first.
  const handlePrintAny = () => {
    if (view !== 'legacy') { setView('legacy'); setTimeout(() => window.print(), 250); return; }
    handlePrint();
  };

  const asOn = toDate?.format('DD MMMM YYYY') ?? '';

  return (
    <ReportShell
      className="plbs-page aw-calm"
      title="Balance Sheet"
      desc="Espat Karmchari Co-Operative Credit Society Limited."
      switcher={data ? <ReportViewSwitcher enabled={enabled} value={view} onChange={setView} /> : undefined}
      actions={
        <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrintAny} disabled={!data}><Printer size={14} /> Print</button>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Scale size={14} />}>
            <div>
              <label className="aw-label" htmlFor="plbs-from">From</label>
              <input id="plbs-from" type="date" className="aw-input" value={fromDate ? fromDate.format('YYYY-MM-DD') : ''} onChange={e => setFromDate(e.target.value ? dayjs(e.target.value) : null)} />
            </div>
            <div>
              <label className="aw-label" htmlFor="plbs-to">To (as on)</label>
              <input id="plbs-to" type="date" className="aw-input" value={toDate ? toDate.format('YYYY-MM-DD') : ''} onChange={e => setToDate(e.target.value ? dayjs(e.target.value) : null)} />
              <p className="aw-meta" style={{ marginTop: 4 }}>The date depends on the financial year.</p>
            </div>
            <label className="aw-check" title="Not supported by the balance sheet report yet" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={options.includeFinancialYrOpBal} disabled onChange={e => setOptions(prev => ({ ...prev, includeFinancialYrOpBal: e.target.checked }))} />
              <span>Include financial year opening balance</span>
            </label>
            <div>
              <span className="aw-label">Suppress accounts with</span>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <input type="checkbox" checked={options.zeroClosingBalance} onChange={e => setOptions(prev => ({ ...prev, zeroClosingBalance: e.target.checked }))} />
                <span>Zero closing balance</span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={options.zeroTransactionAc} onChange={e => setOptions(prev => ({ ...prev, zeroTransactionAc: e.target.checked }))} />
                <span>Zero transaction accounts</span>
              </label>
            </div>
            <div>
              <label className="aw-label" htmlFor="plbs-pl">Profit / loss transfer account</label>
              <input id="plbs-pl" className="aw-input" value={options.profitLossTransferAccount} disabled title="Not supported by the balance sheet report yet" placeholder="Account name" onChange={e => setOptions(prev => ({ ...prev, profitLossTransferAccount: e.target.value }))} />
              <p className="aw-meta" style={{ marginTop: 4 }}>Profit or loss is carried to the balance sheet in this ledger account.</p>
            </div>
            <button type="button" className="aw-btn aw-btn-primary" onClick={handleShow} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Show'}
            </button>
          </ParamCard>
          {data && (
            <StatCards items={[
              { label: 'Total liabilities', value: `₹${formatCurrency(data.totals?.totalLiabilities || 0)}`, tone: 'muted' },
              { label: 'Total assets', value: `₹${formatCurrency(data.totals?.totalAssets || 0)}`, tone: 'muted' },
            ]} />
          )}
        </>
      }
      footerLeft="Balance Sheet"
      footerRight={asOn ? `As on ${asOn}` : ''}
    >
      {data && view === 'bento' && <div className="plbs-noprint"><ProBento spec={bsSpec} /></div>}
      {data && view === 'terminal' && <div className="plbs-noprint" style={{ height: 'calc(100vh - 220px)', minHeight: 360 }}><ProTerm spec={bsSpec} /></div>}
      {data && view === 'editorial' && <div className="plbs-noprint"><ProEd spec={bsSpec} subtitle={`As on ${asOn}`} /></div>}

      {data && view === 'legacy' && (
        <section className="aw-card plbs-sheet" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--aw-pad)' }}>
            <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
              <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
              <div className="aw-meta">Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
              <div className="aw-strong" style={{ marginTop: 6, letterSpacing: '.08em' }}>BALANCE SHEET</div>
              <div className="aw-meta">As on {asOn}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {([
                { label: 'LIABILITIES', rows: data.liabilities, total: data.totals?.totalLiabilities, type: 'credit' as const, none: 'No liability data available' },
                { label: 'ASSETS', rows: data.assets, total: data.totals?.totalAssets, type: 'debit' as const, none: 'No asset data available' },
              ]).map(col => (
                <div key={col.label} className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                  <table className="aw-table">
                    <thead><tr><th colSpan={2}>{col.label}</th></tr></thead>
                    <tbody>
                      {Array.isArray(col.rows) && col.rows.length > 0 ? col.rows.map(item => (
                        <tr key={item.headCode}>
                          <td>
                            <div className="aw-strong">{item.headName}</div>
                            <div className="aw-meta">{item.headCode}</div>
                          </td>
                          <td className="is-right">
                            {item.closingBalance !== 0 && <CrDrIndicator type={col.type} className="mr-1 cr-dr-print-hide" />}
                            {formatCurrency(item.closingBalance)}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={2} className="is-muted" style={{ textAlign: 'center' }}>{col.none}</td></tr>
                      )}
                      <tr>
                        <td><b>TOTAL</b></td>
                        <td className="is-right">
                          <b>{!!col.total && <CrDrIndicator type={col.type} className="mr-1 cr-dr-print-hide" />}{formatCurrency(col.total || 0)}</b>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!data && (
        <ReportEmpty icon={<Scale size={34} />} title={loading ? 'Loading…' : 'No Balance Sheet Data'} hint="Set the dates and options, then click Show" />
      )}

      {/* Printing prints the legacy sheet only: the window chrome and the other views stay out of the paper copy. */}
      <style>{`
        @media print {
          .plbs-page .aw-header, .plbs-page aside, .plbs-page .aw-footer, .plbs-noprint { display: none !important; }
          .plbs-page, .plbs-page .aw-content, .plbs-page .plbs-sheet { background: #fff !important; color: #000 !important; box-shadow: none !important; border: 0 !important; }
          .plbs-page .aw-content { padding: 0 !important; overflow: visible !important; }
          .plbs-page { height: auto !important; overflow: visible !important; }
          .plbs-page .aw-table-wrap { max-height: none !important; overflow: visible !important; }
          .plbs-page .aw-table th, .plbs-page .aw-table td, .plbs-page .aw-meta, .plbs-page .aw-strong { color: #000 !important; background: #fff !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          .cr-dr-print-hide { display: none !important; }
        }
      `}</style>
    </ReportShell>
  );
};

export default PLBalanceSheet;