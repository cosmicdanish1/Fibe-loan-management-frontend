import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { isFailure, notifyError } from '@/utils/dialog';
import { Landmark, Search, Printer, RotateCcw, FileSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { useLoanDetailSpec } from '../views/loanDetailPro';

interface LoanDetailItem {
  key: string;
  memberNo: string;
  memberName: string;
  officeName: string;
  loanType: string;
  loanCaseNo: string;
  loanAmount: number;
  balance: number;
  interestRate: number;
  totalInstallments: number;
  installmentAmount: number;
  disbursementDate: string;
  appliedDate?: string;
  appliedAmount: number;
  surety1Mbno: string;
  surety1Name: string;
  surety2Mbno: string;
  surety2Name: string;
}

const MemberLoanDetail: React.FC = () => {
  const [memberFrom, setMemberFrom] = useState<string>('');
  const [memberTo, setMemberTo] = useState<string>('');
  const [selectedLoanType, setSelectedLoanType] = useState<string>('ALL');
  const [loanTypes, setLoanTypes] = useState<{ code: string; name: string }[]>([]);
  const [tableData, setTableData] = useState<LoanDetailItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    apiService.getLoanTypes().then((res: any) => {
      if (res?.success && Array.isArray(res.data)) setLoanTypes(res.data);
    }).catch(() => {});
  }, []);

  const handleSearch = useCallback(async (): Promise<LoanDetailItem[]> => {
    if (!memberFrom || !memberTo) return [];
    setLoading(true);
    try {
      const res = await apiService.getMemberLoanDetail(memberFrom, memberTo, selectedLoanType);
      if (isFailure(res)) await notifyError(res, 'load the member loan detail');
      if (res?.success) {
        const rows: LoanDetailItem[] = Array.isArray(res.data)
          ? res.data
          : (res.data?.data ?? []);
        setTableData(rows);
        setCurrentPage(1);
        return rows;
      }
    } catch (e) {
      console.error('MemberLoanDetail fetch error:', e);
      await notifyError(null, 'load the member loan detail');
    } finally {
      setLoading(false);
    }
    setTableData([]);
    return [];
  }, [memberFrom, memberTo, selectedLoanType]);

  const handleLoad = async () => {
    const rows = await handleSearch();
    if (outputType === 'printer' && rows.length > 0) printWithData(rows);
  };

  const handleReset = useCallback(() => {
    setMemberFrom('');
    setMemberTo('');
    setSelectedLoanType('ALL');
    setTableData([]);
    setOutputType('screen');
    setCurrentPage(1);
    setPageSize(20);
  }, []);

  const fmt = useCallback((n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0), []);

  const fmtDate = (d: string) => d ? dayjs(d).format('DD-MMM-YYYY') : '-';

  const surety = (mbno: string, name: string) => {
    if (!mbno && !name) return '';
    if (mbno && name) return `${mbno}-${name}`;
    return mbno || name;
  };

  // Meaning, not decoration: amber = sanctioned but nothing repaid yet, blue = not sanctioned and not paid.
  const rowTint = (item: LoanDetailItem): React.CSSProperties | undefined => {
    if (item.loanAmount > 0 && item.balance > 0) return { background: 'color-mix(in srgb, var(--aw-warning) 14%, transparent)' };
    if (!item.loanAmount || item.loanAmount === 0) return { background: 'color-mix(in srgb, var(--aw-info) 12%, transparent)' };
    return undefined;
  };

  const totalSanctioned = useMemo(() => tableData.reduce((s, r) => s + (r.loanAmount || 0), 0), [tableData]);
  const totalOutstanding = useMemo(() => tableData.reduce((s, r) => s + (r.balance || 0), 0), [tableData]);

  const paginatedData = useMemo(() => {
    if (outputType === 'printer') return tableData;
    return tableData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [tableData, currentPage, pageSize, outputType]);

  const handlePageChange = useCallback((page: number, newPageSize?: number) => {
    setCurrentPage(page);
    if (newPageSize && newPageSize !== pageSize) { setPageSize(newPageSize); setCurrentPage(1); }
  }, [pageSize]);

  const buildPrintHtml = (rows: LoanDetailItem[]) => {
    const tRows = rows.map(r => {
      const bg = r.loanAmount > 0 && r.balance > 0
        ? '#fed7aa'
        : (!r.loanAmount || r.loanAmount === 0 ? '#dbeafe' : 'white');
      return `<tr style="background:${bg}">
        <td>${r.memberNo}</td>
        <td>${r.memberName || ''}</td>
        <td>${r.loanCaseNo || ''}</td>
        <td>${fmtDate(r.disbursementDate)}</td>
        <td style="text-align:right">${fmt(r.loanAmount)}</td>
        <td>${surety(r.surety1Mbno, r.surety1Name)}</td>
        <td>${surety(r.surety2Mbno, r.surety2Name)}</td>
        <td style="text-align:right">${fmt(r.appliedAmount)}</td>
        <td>${fmtDate(r.appliedDate || r.disbursementDate)}</td>
        <td style="text-align:right">${r.interestRate}%</td>
        <td style="text-align:right">${fmt(r.installmentAmount)}</td>
      </tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><title>Member Loan Detail</title>
<style>
  body{font-family:'Courier New',monospace;font-size:10px;margin:10px;}
  h2{text-align:center;font-size:12px;margin-bottom:4px;}
  p.sub{text-align:center;font-size:9px;color:#555;margin:0 0 6px;}
  table{width:100%;border-collapse:collapse;}
  th,td{border:1px solid #94a3b8;padding:3px 5px;white-space:nowrap;}
  th{background:#e2e8f0;color:#1d4ed8;font-weight:bold;text-align:left;}
  tfoot td{font-weight:bold;background:#f1f5f9;}
  @page{size:landscape;margin:10mm;}
</style></head><body>
<h2>Member Loan Detail</h2>
<p class="sub">Member From: ${memberFrom} To: ${memberTo} | Loan Type: ${selectedLoanType}</p>
<table>
  <thead><tr>
    <th>MBNO</th><th>Name</th><th>LoanCase No.</th><th>Sanc. Date</th>
    <th>Sanc. Amount</th><th>Surety 1</th><th>Surety 2</th>
    <th>Applied Amount</th><th>Applied Date</th><th>Rate</th><th>Install Amt</th>
  </tr></thead>
  <tbody>${tRows}</tbody>
  <tfoot><tr>
    <td colspan="4" style="text-align:right">TOTAL (${rows.length} records):</td>
    <td style="text-align:right">${fmt(rows.reduce((s, r) => s + (r.loanAmount || 0), 0))}</td>
    <td colspan="6"></td>
  </tr></tfoot>
</table></body></html>`;
  };

  const printWithData = (rows: LoanDetailItem[]) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(buildPrintHtml(rows)); doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus(); iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    }
  };

  const handlePrint = () => { if (tableData.length > 0) printWithData(tableData); };

  const { enabled, view, setView } = useReportViews('yearly.member-loan-detail');
  const spec = useLoanDetailSpec(tableData, selectedLoanType === 'ALL' ? 'all loan types' : selectedLoanType);

  const hasData = tableData.length > 0;
  const range = `${memberFrom || 'first'} to ${memberTo || 'last'}`;
  const lastPage = Math.max(1, Math.ceil(tableData.length / pageSize));

  return (
    <ReportShell
      className="member-loan-detail-page"
      title="Member Loan Detail"
      desc="Loan register by member range and loan type"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<FileSearch size={14} />}>
            <div>
              <label className="aw-label" htmlFor="mld-from">Member from</label>
              <MemberField id="mld-from" value={memberFrom} onChange={setMemberFrom} onSelect={(m: any) => setMemberFrom(m.memberNo || m.mbno || '')} onSubmit={() => handleLoad()} />
            </div>
            <div>
              <label className="aw-label" htmlFor="mld-to">Member to</label>
              <MemberField id="mld-to" value={memberTo} onChange={setMemberTo} onSelect={(m: any) => setMemberTo(m.memberNo || m.mbno || '')} onSubmit={() => handleLoad()} />
            </div>
            <div>
              <label className="aw-label" htmlFor="mld-type">Loan type</label>
              <select id="mld-type" className="aw-input" value={selectedLoanType} onChange={e => setSelectedLoanType(e.target.value)}>
                <option value="ALL">All Types</option>
                {loanTypes.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="mld-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={handleLoad} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load'}
            </button>
          </ParamCard>
          {hasData && (
            <StatCards items={[
              { label: 'Accounts', value: String(tableData.length), tone: 'muted' },
              { label: 'Sanctioned', value: `₹${fmt(totalSanctioned)}`, tone: 'info' },
              { label: 'Outstanding', value: `₹${fmt(totalOutstanding)}`, tone: 'danger' },
            ]} />
          )}
        </>
      }
      footerLeft="Member Loan Detail"
      footerRight={selectedLoanType === 'ALL' ? 'All loan types' : `Type: ${selectedLoanType}`}
    >
      {hasData && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="Member Loan Detail" subtitle={`${range} · ${selectedLoanType}`} />}

      {hasData && view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Loan Register · {range}</span>
            <span className="aw-meta">{tableData.length} records</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', marginBottom: 10 }}>
              <span style={{ color: 'var(--aw-warning)' }}>■ Loan sanctioned but not paid</span>
              <span style={{ color: 'var(--aw-info)' }}>■ Loan not sanctioned and not paid</span>
            </p>
            <div className="aw-table-wrap">
              <table className="aw-table">
                <thead>
                  <tr>
                    <th>MBNO</th><th>Name</th><th>Loan case no.</th><th>Sanc. date</th><th className="is-right">Sanc. amount</th>
                    <th>Surety 1</th><th>Surety 2</th><th className="is-right">Applied amount</th><th>Applied date</th>
                    <th className="is-right">Rate</th><th className="is-right">Install amt</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, idx) => (
                    <tr key={item.key || idx} style={rowTint(item)}>
                      <td className="is-accent">{item.memberNo}</td>
                      <td>{item.memberName}</td>
                      <td>{item.loanCaseNo}</td>
                      <td>{fmtDate(item.disbursementDate)}</td>
                      <td className="is-right">{fmt(item.loanAmount)}</td>
                      <td>{surety(item.surety1Mbno, item.surety1Name)}</td>
                      <td>{surety(item.surety2Mbno, item.surety2Name)}</td>
                      <td className="is-right">{fmt(item.appliedAmount)}</td>
                      <td>{fmtDate(item.appliedDate || item.disbursementDate)}</td>
                      <td className="is-right">{item.interestRate}%</td>
                      <td className="is-right">{fmt(item.installmentAmount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="is-right"><b>Total ({tableData.length})</b></td>
                    <td className="is-right"><b>{fmt(totalSanctioned)}</b></td>
                    <td colSpan={6}></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {outputType === 'screen' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
                <button type="button" className="aw-btn aw-btn-ghost" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
                <span className="aw-meta">Page {currentPage} of {lastPage} · {tableData.length} records</span>
                <button type="button" className="aw-btn aw-btn-ghost" disabled={currentPage >= lastPage} onClick={() => handlePageChange(currentPage + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
                <select className="aw-input" style={{ width: 'auto' }} value={pageSize} aria-label="Rows per page" onChange={e => handlePageChange(1, Number(e.target.value))}>
                  {[20, 50, 100, 200].map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>
            )}
          </div>
        </section>
      )}
      {!hasData && (
        <ReportEmpty icon={<Landmark size={34} />} title={loading ? 'Loading…' : 'No Loan Data'} hint="Configure member range and filters to view loan details" />
      )}
    </ReportShell>
  );
};

export default MemberLoanDetail;
