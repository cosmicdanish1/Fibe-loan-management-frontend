import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DatePicker, Select } from 'antd';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { Printer, FileDown, Settings, RefreshCw, FileText, Search } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../services/api';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { csvCell } from '@/utils/csv';
import { isFromAfterTo } from '@/utils/dates';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useLoanLedgerSpec, ProBento, ProTerm, ProEd } from '../views/loanLedgerPro';
import { showDialog3 as showDialog } from '@/utils/dialog';


interface LedgerTransaction {
  key: string;
  date: string;
  type: string;
  amount: number;
  narration: string;
  voucherNo: string;
  balance: number;
}

interface MemberInfo {
  memberNo: string;
  memberName: string;
  loanCaseNo: string;
}

// Print-only layout matching the legacy report design standard used across
// every report this session (letterhead, Date/Page Number line, dashed
// rules, TOTAL row, summary block) — plain monospace text, not a clone of
// the on-screen colorful UI. Feeds handlePrint only.
const MLL_LINE_W = 94;
const MLL_DASH = '-'.repeat(MLL_LINE_W);
const MLL_COL_DATE = 12;
const MLL_COL_VCHR = 12;
const MLL_COL_NARR = 30;
const MLL_COL_AMT = (MLL_LINE_W - MLL_COL_DATE - MLL_COL_VCHR - MLL_COL_NARR) / 3;

const mllFmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mllPadL = (s: string, w: number) => s.padStart(w);
const mllPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const mllCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildMemberLoanLedgerLines(
  data: LedgerTransaction[], memberInfo: MemberInfo | null, loanCaseNo: string,
  fromLabel: string, toLabel: string, openingBalance: number,
  totalDebits: number, totalCredits: number, closingBalance: number,
): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(mllCenter('Espat Karmchari Co-Operative Credit Society Limited.', MLL_LINE_W));
  lines.push(mllCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', MLL_LINE_W));
  lines.push(mllCenter('Member Loan Ledger', MLL_LINE_W));
  lines.push('');
  if (memberInfo) lines.push(`Member : ${memberInfo.memberName} (${memberInfo.memberNo})${loanCaseNo ? ` | Loan Case: ${loanCaseNo}` : ''}`);
  lines.push(`Period : ${fromLabel} to ${toLabel}`);
  lines.push(`Opening Balance : ${mllFmt(openingBalance)}`);
  const printedStr = `Printed : ${now}`;
  const pageStr = 'Page Number :  1';
  lines.push(`${printedStr}${mllPadL(pageStr, MLL_LINE_W - printedStr.length)}`);
  lines.push(MLL_DASH);

  lines.push(
    `${mllPadR('Date', MLL_COL_DATE)}${mllPadR('Voucher', MLL_COL_VCHR)}${mllPadR('Narration', MLL_COL_NARR)}` +
    `${mllPadL('Debit', MLL_COL_AMT)}${mllPadL('Credit', MLL_COL_AMT)}${mllPadL('Balance', MLL_COL_AMT)}`
  );
  lines.push(MLL_DASH);

  data.forEach(item => {
    const isDebit = item.type === 'DR' || item.type === 'D';
    lines.push(
      `${mllPadR(dayjs(item.date).format('DD-MMM-YY'), MLL_COL_DATE)}${mllPadR(item.voucherNo, MLL_COL_VCHR)}${mllPadR(item.narration, MLL_COL_NARR)}` +
      `${mllPadL(isDebit ? mllFmt(item.amount) : '', MLL_COL_AMT)}` +
      `${mllPadL(!isDebit ? mllFmt(item.amount) : '', MLL_COL_AMT)}` +
      `${mllPadL(mllFmt(item.balance), MLL_COL_AMT)}`
    );
  });

  lines.push(MLL_DASH);
  lines.push(
    `${mllPadR('TOTAL :-', MLL_COL_DATE + MLL_COL_VCHR + MLL_COL_NARR)}` +
    `${mllPadL(mllFmt(totalDebits), MLL_COL_AMT)}${mllPadL(mllFmt(totalCredits), MLL_COL_AMT)}${mllPadL(mllFmt(closingBalance), MLL_COL_AMT)}`
  );
  lines.push(MLL_DASH);

  const IND = '        ';
  const LBL_W = 18;
  const VAL_W = 20;
  lines.push(`${IND}${'Opening Balance :'.padEnd(LBL_W)} ${mllPadL(mllFmt(openingBalance), VAL_W)}`);
  lines.push(`${IND}${'Total Debit     :'.padEnd(LBL_W)} ${mllPadL(mllFmt(totalDebits), VAL_W)}`);
  lines.push(`${IND}${'Total Credit    :'.padEnd(LBL_W)} ${mllPadL(mllFmt(totalCredits), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push(`${IND}${'Closing Balance :'.padEnd(LBL_W)} ${mllPadL(mllFmt(closingBalance), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push('');
  lines.push('* Report generated as per available data in the system');

  return lines;
}

const MemberLoanLedger: React.FC = () => {
  const [data, setData] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [memberNo, setMemberNo] = useState<string>('');
  const [loanCaseNo, setLoanCaseNo] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [loanCases, setLoanCases] = useState<string[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const { enabled, view, setView } = useReportViews('monthly.member-loan-ledger');

  // Changing the member invalidates the selected loan case and the case list.
  // Case lookups are debounced and guarded so a slow earlier response (typed digit by digit)
  // can never overwrite the list for the current member.
  useEffect(() => {
    setLoanCaseNo('');
    setLoanCases([]);
    if (!memberNo) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response: any = await apiService.getMemberLoanCases(memberNo);
        if (cancelled) return;
        const list: any[] | null = response?.success && Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : null;
        setLoanCases(list
          ? list.map((item: any) => item?.loanCaseNo).filter((v: any) => v !== null && v !== undefined).map((v: any) => v.toString())
          : []);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching loan cases:', error);
        setLoanCases([]);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [memberNo]);

  const fetchLedgerData = async () => {
    if (!memberNo) {
      await showDialog('warning', 'Validation', 'Please enter member number');
      return;
    }
    if (!loanCaseNo) {
      await showDialog('warning', 'Select Loan Case', 'Select a loan case to view reducing-balance principal. The all-cases view mixes consolidated loans and is not a principal ledger.');
      return;
    }

    if (fromDate && toDate && isFromAfterTo(fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'))) {
      await showDialog('warning', 'Validation', 'From date cannot be after To date');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getMemberLoanLedger(
        memberNo,
        loanCaseNo || undefined,
        fromDate?.format('YYYY-MM-DD'),
        toDate?.format('YYYY-MM-DD')
      );

      if (response.success && response.data) {
        const { memberNo: respMemberNo, memberName, loanCaseNo: respLoanCaseNo, transactions, openingBalance: respOpeningBalance } = response.data;

        setMemberInfo({
          memberNo: respMemberNo,
          memberName: memberName,
          loanCaseNo: respLoanCaseNo
        });
        setOpeningBalance(respOpeningBalance || 0);

        if (Array.isArray(transactions)) {
          const formattedData = transactions.map((item: any, index: number) => ({
            key: index.toString(),
            date: item.date,
            type: item.type,
            amount: item.amount,
            narration: item.narration,
            voucherNo: item.voucherNo,
            balance: item.balance
          }));
          setData(formattedData);
        } else {
          setData([]);
        }
      } else {
        setData([]);
        await showDialog('warning', 'No Data', 'No loan ledger data found');
      }
    } catch (error) {
      console.error('Error fetching loan ledger data:', error);
      await showDialog('error', 'Fetch Error', 'Failed to load loan ledger data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoized calculations for performance
  const { totalDebits, totalCredits, closingBalance } = useMemo(() => {
    const totalDebits = data.reduce((sum, item) => sum + (item.type === 'DR' || item.type === 'D' ? item.amount : 0), 0);
    const totalCredits = data.reduce((sum, item) => sum + (item.type === 'CR' || item.type === 'C' ? item.amount : 0), 0);
    // BUG FIX: used to hardcode 0 when there were no transactions in range —
    // wrong whenever the member has a real non-zero opening balance carried
    // in (e.g. a period with no activity but an existing loan balance).
    const closingBalance = data.length > 0 ? data[data.length - 1]!.balance : openingBalance;
    return { totalDebits, totalCredits, closingBalance };
  }, [data, openingBalance]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  // window.print() used to be used here with almost no print-specific CSS —
  // no background/color reset, same class of bug already confirmed on New
  // Loan Disbursed this session (would print a solid near-black page in
  // dark mode). Switched to the same hidden-iframe + monospace lines[]
  // technique used everywhere else.
  const handlePrint = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'No Data', 'No data available for printing');
      return;
    }
    const lines = buildMemberLoanLedgerLines(
      data, memberInfo, loanCaseNo,
      fromDate?.format('DD-MMM-YYYY') || '', toDate?.format('DD-MMM-YYYY') || '',
      openingBalance, totalDebits, totalCredits, closingBalance,
    );
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Member Loan Ledger</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; white-space: pre; width: fit-content; margin: 0 auto; }
</style></head><body><pre>${lines.join('\n')}</pre></body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const exportToCSV = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'No Data', 'No data available for export');
      return;
    }

    const headers = ['Date', 'Voucher', 'Narration', 'Debit', 'Credit', 'Balance'];
    const csvData = data.map(item => [
      dayjs(item.date).format('DD-MM-YYYY'),
      item.voucherNo,
      item.narration,
      item.type === 'DR' || item.type === 'D' ? item.amount : '',
      item.type === 'CR' || item.type === 'C' ? item.amount : '',
      item.balance
    ]);

    const csvContent = [
      [`Opening Balance:`, '', '', '', '', openingBalance],
      headers,
      ...csvData,
      [`Total`, '', '', totalDebits, totalCredits, closingBalance],
    ]
      .map(row => row.map(cell => csvCell(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `member_loan_ledger_${memberNo}_${fromDate?.format('YYYY-MM-DD')}_to_${toDate?.format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  const spec = useLoanLedgerSpec(data, `${memberNo} ${memberName}`.trim(), openingBalance, closingBalance, totalDebits, totalCredits);

  return (
    <ReportShell
      className="mll-page aw-calm"
      title="Member Loan Ledger"
      desc="Loan ledger of one member and loan case"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setMemberNo(''); setMemberName(''); setLoanCaseNo(''); setLoanCases([]); setData([]); setMemberInfo(null); setOpeningBalance(0); setFromDate(dayjs().startOf('month')); setToDate(dayjs()); }}><RefreshCw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={exportToCSV} disabled={!(data.length > 0)}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!(data.length > 0)}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Settings size={14} />}>
            <div>
              <label className="aw-label" htmlFor="mll-member">Member no</label>
              <MemberField id="mll-member" value={memberNo} onChange={v => { setMemberNo(v); setMemberName(''); }} onSelect={(m: any) => { setMemberNo(String(m.memberNo)); setMemberName(m.memberName || m.name || ''); }} />
              {memberName && <span className="aw-meta">{memberName}</span>}
            </div>
            <div>
              <label className="aw-label" htmlFor="mll-case">Loan case no</label>
              <Select id="mll-case" {...(loanCaseNo ? { value: loanCaseNo } : {})} onChange={(v?: string) => setLoanCaseNo(v ?? '')} className="aw-select" popupClassName="aw-select-popup" placeholder="Select a loan case" allowClear
                options={loanCases.map(c => ({ value: c, label: `Case: ${c}` }))} />
            </div>
            <div>
              <label className="aw-label" htmlFor="mll-from">From date</label>
              <DatePicker id="mll-from" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={fromDate} onChange={setFromDate} format="DD-MMM-YYYY" allowClear={false} />
            </div>
            <div>
              <label className="aw-label" htmlFor="mll-to">To date</label>
              <DatePicker id="mll-to" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={toDate} onChange={setToDate} format="DD-MMM-YYYY" allowClear={false} />
            </div>
            <button type="button" className="aw-btn aw-btn-primary" onClick={fetchLedgerData} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load Report'}
            </button>
          </ParamCard>
          {data.length > 0 && <StatCards items={[{ label: 'Closing balance', value: formatCurrency(closingBalance), tone: 'info' }, { label: 'Total debits', value: formatCurrency(totalDebits), tone: 'danger' }, { label: 'Total credits', value: formatCurrency(totalCredits), tone: 'success' }]} />}
        </>
      }
      footerLeft="Member Loan Ledger"
      footerRight={memberInfo ? `${memberInfo.memberNo} · Case ${memberInfo.loanCaseNo}` : 'Select member'}
    >
      {data.length > 0 && view === 'bento' && <ProBento spec={spec} />}
      {data.length > 0 && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><ProTerm spec={spec} /></div>}
      {data.length > 0 && view === 'editorial' && <ProEd spec={spec} subtitle={`${memberNo} · Case ${loanCaseNo} · ${fromDate?.format('DD-MMM-YYYY')} to ${toDate?.format('DD-MMM-YYYY')}`} />}

      {view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Loan Ledger</span>
            <span className="aw-meta">{memberInfo ? `${memberInfo.memberName} · Case ${memberInfo.loanCaseNo}` : 'Select member and loan case'}</span>
          </div>
          <div className="mll-page-preview-body" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
              {data.length > 0 ? (
                <div>
                  <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
                    <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited</div>
                    <div className="aw-meta">Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                    <div className="aw-meta" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Reg No: A.R/DRG/1796</span><span>Tel No: 0788-2298736</span></div>
                    <div className="aw-strong" style={{ marginTop: 8, letterSpacing: '.08em' }}>MEMBER LOAN LEDGER</div>
                  </div>
                  <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', marginBottom: 6 }}>
                    <span><b>Period:</b> {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}</span>
                    <span><b>Generated:</b> {dayjs().format('DD-MMM-YYYY h:mmA')}</span>
                    {memberInfo && <span><b>Member:</b> {memberInfo.memberName} ({memberInfo.memberNo}){loanCaseNo && ` | Loan case: ${loanCaseNo}`}</span>}
                    <span><b>Opening balance:</b> {formatCurrency(openingBalance)}</span>
                  </p>
                  <p className="aw-meta" style={{ fontStyle: 'italic', marginBottom: 10 }}>Balance = outstanding principal; credit amount includes principal + interest + penalty.</p>
                  <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                    <table className="aw-table">
                      <thead>
                        <tr><th>Date</th><th>Voucher</th><th>Narration</th><th className="is-right">Debit</th><th className="is-right">Credit</th><th className="is-right">Balance</th></tr>
                      </thead>
                      <tbody>
                        {data.map((item) => (
                          <tr key={item.key}>
                            <td>{dayjs(item.date).format('DD-MM-YYYY')}</td>
                            <td className="is-accent">{item.voucherNo}</td>
                            <td>{item.narration}</td>
                            <td className="is-right" style={{ color: 'var(--aw-danger)' }}>{(item.type === 'DR' || item.type === 'D') && (<><CrDrIndicator type="debit" className="mr-1" />{formatCurrency(item.amount)}</>)}</td>
                            <td className="is-right is-success">{(item.type === 'CR' || item.type === 'C') && (<><CrDrIndicator type="credit" className="mr-1" />{formatCurrency(item.amount)}</>)}</td>
                            <td className="is-right">{formatCurrency(item.balance)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} className="is-right"><b>Total</b></td>
                          <td className="is-right"><b>{totalDebits > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalDebits)}</b></td>
                          <td className="is-right"><b>{totalCredits > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalCredits)}</b></td>
                          <td className="is-right"><b>{formatCurrency(closingBalance)}</b></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="aw-meta" style={{ textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>* Report generated as per available data in the system</p>
                </div>
              ) : (
                <ReportEmpty icon={<FileText size={34} />} title="No Data" hint="No transactions found for the selected member and period" />
              )}
          </div>
        </section>
      )}
      {view !== 'legacy' && !(data.length > 0) && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="No transactions found for the selected member and period" />
      )}
    </ReportShell>
  );
};

export default MemberLoanLedger;
