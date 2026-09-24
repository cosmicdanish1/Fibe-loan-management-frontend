import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  FileDown,
  BookOpen,
  RefreshCw,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Spin, Select, theme as antdTheme } from 'antd';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../store';
import { setInterfaceMode } from '../../../../store/slices/themeSlice';
import { apiService } from '../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

interface GeneralLedgerEntry {
  transactionNo: number;
  transactionDate: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  transactionType: 'DR' | 'CR';
  memberNumber?: number | string;
  username: string;
}

interface GeneralLedgerData {
  headCode: string;
  headName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entries: GeneralLedgerEntry[];
  totalTransactions: number;
}

interface HeadMaster {
  code: string;
  headName: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const GeneralLedger: React.FC = () => {
  const dispatch = useDispatch();
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' || (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => dispatch(setInterfaceMode(isDark ? 'light' : 'dark'));

  const [headCode, setHeadCode]     = useState<string>('');
  const [fromDate, setFromDate]     = useState<Dayjs | null>(dayjs('2024-01-01'));
  const [toDate, setToDate]         = useState<Dayjs | null>(dayjs('2024-01-31'));
  const [headMasters, setHeadMasters]   = useState<HeadMaster[]>([]);
  const [ledgerData, setLedgerData]     = useState<GeneralLedgerData | null>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [isLoadingHeads, setIsLoadingHeads] = useState(false);

  useEffect(() => { loadHeadMasters(); }, []);

  const loadHeadMasters = async () => {
    setIsLoadingHeads(true);
    try {
      const response = await apiService.getGeneralLedgerHeadMasters();
      if (response.success && response.data) {
        let actualData = response.data;
        if (actualData.data) actualData = actualData.data;
        if (Array.isArray(actualData)) setHeadMasters(actualData);
      }
    } catch {
      await showDialog('error', 'Load Failed', 'Failed to load Account Heads');
    } finally {
      setIsLoadingHeads(false);
    }
  };

  const generateReport = async () => {
    if (!headCode || !fromDate || !toDate) {
      await showDialog('warning', 'Validation', 'Please select Account Head and Date Range');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiService.getGeneralLedgerReport({
        headCode,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
        outputType: 'screen',
      });
      if (response.success && response.data) {
        let actualData = response.data;
        if (actualData.data) actualData = actualData.data;
        setLedgerData(actualData);
      } else {
        await showDialog('error', 'Load Failed', response.message || 'Failed to fetch ledger data');
      }
    } catch {
      await showDialog('error', 'Error', 'An error occurred while fetching report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!ledgerData?.entries?.length) { await showDialog('warning', 'No Data', 'No data to export'); return; }
    const headers = ['Date', 'MB No', 'Voucher', 'Narration', 'Payment', 'Receipt', 'Balance'];
    const rows = ledgerData.entries.map(e => [
      dayjs(e.transactionDate).format('DD-MMM-YYYY'),
      e.memberNumber || '',
      e.voucherNo || '',
      e.narration || '',
      e.debit > 0 ? e.debit.toFixed(2) : '0.00',
      e.credit > 0 ? e.credit.toFixed(2) : '0.00',
      e.balance.toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `general_ledger_${headCode}_${dayjs().format('YYYYMMDD')}.csv`;
    link.click();
  };

  const selectedHead = headMasters.find(h => h.code === headCode);
  const headName = selectedHead?.headName || '';

  /* ── theme tokens ── */
  const bg       = isDark ? 'bg-[#0f172a]'  : 'bg-slate-50';
  const panel    = isDark ? 'bg-[#1e293b]'  : 'bg-white';
  const panelBdr = isDark ? 'border-[#334155]' : 'border-slate-200';
  const text     = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted    = isDark ? 'text-slate-400' : 'text-slate-500';
  const tblHd    = isDark ? 'bg-[#263148] text-slate-300' : 'bg-slate-100 text-slate-700';
  const tblBdr   = isDark ? 'border-slate-600' : 'border-slate-300';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-emerald-50/40';
  const sumRow   = isDark ? 'bg-[#263148]'  : 'bg-slate-100';

  return (
    <ConfigProvider theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { colorPrimary: '#10b981', borderRadius: 8 } }}>
      <div className={`gl-page h-screen flex flex-col ${bg} font-sans overflow-hidden`}>

        {/* ── Header ── */}
        <div className={`gl-header ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white border-slate-200'} border-b px-4 py-2 flex items-center justify-between shrink-0 shadow-sm`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-1.5 rounded-lg text-white shadow">
              <BookOpen size={15} />
            </div>
            <div>
              <h1 className={`text-sm font-black ${text} tracking-tight leading-none uppercase`}>General Ledger</h1>
              <div className={`flex items-center gap-1 mt-0.5 fz-tiny font-bold ${muted} uppercase tracking-wide`}>
                <ShieldCheck size={9} className="text-emerald-500" /> Head-wise Account Statement
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={toggleTheme}
              className={`h-7 w-7 flex items-center justify-center rounded-lg border ${panelBdr} transition hover:border-emerald-500`}>
              {isDark ? <Sun size={13} className="text-yellow-400" /> : <Moon size={13} className="text-slate-500" />}
            </button>
            <Button size="small" icon={<Printer size={11} />} onClick={() => window.print()}
              className="h-7 px-2 fz-small font-bold uppercase">Print</Button>
            <Button size="small" type="primary" icon={<FileDown size={11} />} onClick={handleExportCSV}
              className="h-7 px-2 fz-small font-bold uppercase bg-emerald-600 border-0 hover:!bg-emerald-700">Export CSV</Button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className={`gl-filter-bar ${panel} border-b ${panelBdr} px-4 py-2 flex items-end gap-3 shrink-0`}>
          {/* Head */}
          <div className="flex flex-col gap-0.5 min-w-[220px] max-w-[320px] flex-1">
            <label className={`fz-tiny font-bold ${muted} uppercase tracking-wide`}>Head Name</label>
            <Select
              value={headCode || undefined}
              onChange={setHeadCode}
              placeholder="Select head code"
              showSearch
              size="small"
              loading={isLoadingHeads}
              className="w-full"
              filterOption={(input, option) => {
                const code = option?.value?.toString().toLowerCase() || '';
                const label = (option?.label as string)?.toLowerCase() || '';
                const s = input.toLowerCase();
                return code.includes(s) || label.includes(s);
              }}
            >
              {headMasters.map(h => (
                <Option key={h.code} value={h.code} label={`${h.code} ${h.headName}`}>
                  <span className="fz-small font-black text-emerald-600 mr-2">{h.code}</span>
                  <span className="fz-small text-slate-500">{h.headName}</span>
                </Option>
              ))}
            </Select>
          </div>

          {/* From */}
          <div className="flex flex-col gap-0.5">
            <label className={`fz-tiny font-bold ${muted} uppercase tracking-wide`}>From</label>
            <DatePicker size="small" value={fromDate} onChange={setFromDate} format="DD-MMM-YYYY" className="w-32" />
          </div>

          {/* To */}
          <div className="flex flex-col gap-0.5">
            <label className={`fz-tiny font-bold ${muted} uppercase tracking-wide`}>To</label>
            <DatePicker size="small" value={toDate} onChange={setToDate} format="DD-MMM-YYYY" className="w-32" />
          </div>

          <Button type="primary" size="small" icon={<RefreshCw size={12} />} onClick={generateReport} loading={isLoading}
            className="h-[30px] px-4 fz-small font-bold uppercase bg-emerald-600 border-0 hover:!bg-emerald-700 shrink-0">
            Generate
          </Button>
        </div>

        {/* ── Stats Bar (shown only when data loaded) ── */}
        {ledgerData && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className={`gl-stats-bar ${panel} border-b ${panelBdr} px-4 py-1.5 flex items-center gap-6 shrink-0`}>
            {[
              { label: 'Opening',      value: ledgerData.openingBalance,  color: text },
              { label: 'Total Payments', value: ledgerData.totalDebits,   color: 'text-rose-500' },
              { label: 'Total Receipts',value: ledgerData.totalCredits,   color: 'text-emerald-500' },
              { label: 'Closing',      value: ledgerData.closingBalance,  color: 'text-teal-400' },
            ].map(s => (
              <div key={s.label}>
                <div className={`fz-tiny font-bold ${muted} uppercase tracking-wide leading-none`}>{s.label}</div>
                <div className={`fz-caption font-black font-mono ${s.color} leading-tight`}>₹{fmt(s.value)}</div>
              </div>
            ))}
            <div className="ml-auto">
              <div className={`fz-tiny font-bold ${muted} uppercase tracking-wide leading-none`}>Transactions</div>
              <div className={`fz-caption font-black font-mono ${text} leading-tight`}>{ledgerData.totalTransactions}</div>
            </div>
          </motion.div>
        )}

        {/* ── Report Table ── */}
        <div className="gl-report-panel flex-1 overflow-auto p-3 custom-scrollbar-emerald">
          <Spin spinning={isLoading} tip="Loading…" size="small">
            {ledgerData && ledgerData.entries.length > 0 ? (
              <div className="font-mono fz-small">
                {/* Company header */}
                <div className={`text-center mb-2 pb-2 border-b border-dashed ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                  <div className={`fz-caption font-bold ${text}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                  <div className={`fz-tiny ${muted}`}>Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                  <div className="fz-small font-bold text-emerald-500 mt-0.5">General Ledger Report</div>
                  <div className={`fz-tiny ${muted}`}>Head: {headCode} – {headName} &nbsp;|&nbsp; Period: {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}</div>
                </div>

                {/* Table */}
                <table className={`gl-table w-full border ${tblBdr}`} style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className={`gl-table-head ${tblHd}`}>
                      <th className={`text-left py-1.5 px-2 border-r ${tblBdr} font-bold w-24`}>Date</th>
                      <th className={`text-left py-1.5 px-2 border-r ${tblBdr} font-bold w-20`}>MB No</th>
                      <th className={`text-left py-1.5 px-2 border-r ${tblBdr} font-bold w-20`}>Voucher</th>
                      <th className={`text-left py-1.5 px-2 border-r ${tblBdr} font-bold`}>Narration</th>
                      <th className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold w-28`}>Payment</th>
                      <th className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold w-28`}>Receipt</th>
                      <th className={`text-right py-1.5 px-2 font-bold w-32`}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening row */}
                    <tr className={`border-b ${tblBdr} ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
                      <td colSpan={4} className={`py-1 px-2 border-r ${tblBdr} font-bold ${text} text-right`}>Opening Balance :</td>
                      <td className={`text-right py-1 px-2 border-r ${tblBdr} ${muted}`}>–</td>
                      <td className={`text-right py-1 px-2 border-r ${tblBdr} ${muted}`}>–</td>
                      <td className="text-right py-1 px-2 font-bold text-emerald-500">{fmt(ledgerData.openingBalance)}</td>
                    </tr>

                    {/* Entries */}
                    {ledgerData.entries.map((e, idx) => (
                      <tr key={idx} className={`border-b ${tblBdr} ${rowHover} transition-colors`}>
                        <td className={`py-1 px-2 border-r ${tblBdr} ${text} whitespace-nowrap`}>
                          {dayjs(e.transactionDate).format('DD-MMM-YYYY')}
                        </td>
                        <td className={`py-1 px-2 border-r ${tblBdr} ${muted}`}>{e.memberNumber || '–'}</td>
                        <td className={`py-1 px-2 border-r ${tblBdr} ${text}`}>{e.voucherNo || '–'}</td>
                        <td className={`py-1 px-2 border-r ${tblBdr} ${muted}`}>{e.narration}</td>
                        <td className={`text-right py-1 px-2 border-r ${tblBdr} font-semibold ${e.debit > 0 ? 'text-rose-500' : muted}`}>
                          {e.debit > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{fmt(e.debit)}</>) : '–'}
                        </td>
                        <td className={`text-right py-1 px-2 border-r ${tblBdr} font-semibold ${e.credit > 0 ? 'text-emerald-500' : muted}`}>
                          {e.credit > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{fmt(e.credit)}</>) : '–'}
                        </td>
                        <td className="text-right py-1 px-2 font-bold text-teal-400">{fmt(e.balance)}</td>
                      </tr>
                    ))}

                    {/* Summary footer */}
                    <tr className={`border-t-2 ${tblBdr} ${sumRow}`}>
                      <td colSpan={4} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold ${text}`}>Opening Balance :</td>
                      <td colSpan={2} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-semibold ${text}`}>{fmt(ledgerData.openingBalance)}</td>
                      <td className="py-1.5 px-2" />
                    </tr>
                    <tr className={`border-b ${tblBdr} ${sumRow}`}>
                      <td colSpan={4} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold ${text}`}>Total Payments :</td>
                      <td colSpan={2} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-semibold text-rose-500`}>
                        {ledgerData.totalDebits > 0 && <CrDrIndicator type="debit" className="mr-1" />}{fmt(ledgerData.totalDebits)}
                      </td>
                      <td className="py-1.5 px-2" />
                    </tr>
                    <tr className={`border-b ${tblBdr} ${sumRow}`}>
                      <td colSpan={4} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold ${text}`}>Total Receipts :</td>
                      <td colSpan={2} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-semibold text-emerald-500`}>
                        {ledgerData.totalCredits > 0 && <CrDrIndicator type="credit" className="mr-1" />}{fmt(ledgerData.totalCredits)}
                      </td>
                      <td className="py-1.5 px-2" />
                    </tr>
                    <tr className={`${sumRow}`}>
                      <td colSpan={4} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold text-emerald-500`}>Closing Balance :</td>
                      <td colSpan={2} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-black text-emerald-500`}>{fmt(ledgerData.closingBalance)}</td>
                      <td className="py-1.5 px-2" />
                    </tr>
                  </tbody>
                </table>

                <div className={`text-center mt-2 fz-tiny ${muted}`}>* Report As Per Data Available</div>
              </div>
            ) : !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center py-24 select-none opacity-40">
                <FileText size={52} className="text-slate-400 mb-3" />
                <h3 className={`text-xs font-black ${muted} uppercase tracking-widest`}>No Data</h3>
                <p className={`fz-small font-bold ${muted} uppercase mt-1 text-center`}>Select head code and date range, then Generate</p>
              </div>
            ) : null}
          </Spin>
        </div>

      </div>

      <style>{`
        .custom-scrollbar-emerald::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar-emerald::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-emerald::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
        @media print {
          header, .shrink-0 { display: none !important; }
          .flex-1 { overflow: visible !important; }
          /* Strip all the on-screen accent colors (rose/emerald/teal for
             debit/credit/balance) — printed output should be plain black
             text on white, not a copy of the dark-mode color scheme. */
          .gl-report-panel, .gl-report-panel * {
            color: #000 !important;
            background: #fff !important;
            border-color: #999 !important;
          }
        }

        /* ── General Ledger — dark mode ── */
        html.dark .gl-page { background-color: #000000 !important; color: #f5f5f7 !important; }
        html.dark .gl-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .gl-filter-bar { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .gl-stats-bar { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .gl-report-panel { background-color: #000000 !important; }
        html.dark .gl-table { border-color: rgba(255,255,255,.07) !important; }
        html.dark .gl-table td,
        html.dark .gl-table th { border-color: rgba(255,255,255,.07) !important; }
        html.dark .gl-table-head { background-color: #1c1c1e !important; color: #8e8e93 !important; }
        html.dark .gl-page input,
        html.dark .gl-page .ant-picker,
        html.dark .gl-page .ant-select-selector {
          background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .gl-page .ant-picker-input > input,
        html.dark .gl-page .ant-select-selection-item { color: #f5f5f7 !important; }
        html.dark .gl-page label { color: #8e8e93 !important; }
        html.dark .gl-page button:not(.ant-btn-primary):not(.bg-emerald-600) {
          background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important;
        }
      `}</style>
    </ConfigProvider>
  );
};

export default GeneralLedger;
