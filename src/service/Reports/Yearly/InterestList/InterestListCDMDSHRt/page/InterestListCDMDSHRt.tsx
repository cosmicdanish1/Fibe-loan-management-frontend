import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Printer, FileDown, PiggyBank, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../../services/api';
import MemberField from '../../../../../../components/shared/kit/MemberField';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { csvCell } from '@/utils/csv';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../../../components/reports/views/reportViews';
import { useInterestSpec } from '../views/interestPro';

interface InterestData {
  memberNo: string;
  memberName: string;
  officeName: string;
  depositType: string;
  principalAmount: number;
  interestAmount: number;
  fromDate: string;
  toDate: string;
}

const InterestListCDMDSHRt: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedMemberNo, setSelectedMemberNo] = useState<string>('');
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [selectedWing, setSelectedWing] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>(`${currentYear - 2}-${currentYear - 1}`);
  const [loading, setLoading] = useState<boolean>(false);
  const [rawData, setRawData] = useState<InterestData[]>([]);
  const [wings, setWings] = useState<{ wingNo: string; name: string }[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);

  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const start = currentYear - 3 + i;
    return `${start}-${start + 1}`;
  }).reverse(), [currentYear]);

  useEffect(() => {
    apiService.getWingList().then((res: any) => {
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        setWings(list.map((w: any) => ({ wingNo: String(w.wingNo ?? ''), name: w.name ?? '' })));
      }
    }).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getInterestList(
        selectedWing || undefined,
        financialYear,
        undefined,
        undefined
      );

      if (response?.success) {
        const rows: InterestData[] = Array.isArray(response.data)
          ? response.data
          : (response.data?.data ?? []);
        setRawData(rows);
        setCurrentPage(1);
      } else {
        setRawData([]);
      }
    } catch (e: any) {
      console.error('InterestList fetch error:', e);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering (member, search, accountType)
  const filteredData = useMemo(() => {
    let d = rawData;
    if (selectedMemberNo) {
      d = d.filter(r => r.memberNo === selectedMemberNo);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      d = d.filter(r =>
        r.memberNo?.toLowerCase().includes(q) ||
        r.memberName?.toLowerCase().includes(q)
      );
    }
    if (accountType) {
      d = d.filter(r => (r.depositType || '').toLowerCase() === accountType.toLowerCase());
    }
    return d;
  }, [rawData, selectedMemberNo, searchText, accountType]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totals = useMemo(() => ({
    totalPrincipal: filteredData.reduce((a, r) => a + (r.principalAmount || 0), 0),
    totalInterest: filteredData.reduce((a, r) => a + (r.interestAmount || 0), 0),
  }), [filteredData]);

  const formatCurrency = useCallback((amount: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0),
  []);

  const handleMemberLookup = (memberNo: string, memberName: string) => {
    setSelectedMemberNo(memberNo);
    setSelectedMemberName(memberName);
    setCurrentPage(1);
  };

  const buildPrintHtml = () => {
    const rows = filteredData.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.memberNo || ''}</td>
        <td>${r.memberName || ''}</td>
        <td>${r.officeName || '-'}</td>
        <td>${r.depositType || 'DEPOSIT'}</td>
        <td style="text-align:right">₹${formatCurrency(r.principalAmount)}</td>
        <td style="text-align:right">₹${formatCurrency(r.interestAmount)}</td>
        <td>${dayjs(r.fromDate).format('DD/MM/YYYY')}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html><head><title>Interest List</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 10px; margin: 15px; color: #000; background: #fff; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #555; padding: 3px 5px; }
  th { background: #e5e7eb; font-weight: bold; text-align: left; }
  tfoot td { background: #f3f4f6; font-weight: bold; }
  .header { text-align: center; margin-bottom: 8px; }
  .header h2 { font-size: 12px; margin: 2px 0; }
  .header p { font-size: 10px; margin: 1px 0; color: #444; }
  @page { margin: 10mm; }
</style></head><body>
<div class="header">
  <h2>Espat Karmchari Co-Operative Credit Society Limited.</h2>
  <p>Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</p>
  <h2>INTEREST DISTRIBUTION LIST - FY ${financialYear}</h2>
  <p>Generated: ${dayjs().format('DD-MMM-YYYY hh:mm A')} | Records: ${filteredData.length}</p>
</div>
<table>
  <thead><tr>
    <th>SR</th><th>Mbr No</th><th>Member Name</th><th>Office</th>
    <th>Type</th><th>Principal</th><th>Interest</th><th>Date</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr>
    <td colspan="5">TOTAL: ${filteredData.length} records</td>
    <td style="text-align:right">₹${formatCurrency(totals.totalPrincipal)}</td>
    <td style="text-align:right">₹${formatCurrency(totals.totalInterest)}</td>
    <td></td>
  </tr></tfoot>
</table>
</body></html>`;
  };

  const handlePrint = () => {
    if (filteredData.length === 0) return;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(buildPrintHtml()); doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    }
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['SR', 'MEMBER NO', 'MEMBER NAME', 'OFFICE', 'TYPE', 'PRINCIPAL', 'INTEREST', 'DATE'];
    const rows = filteredData.map((r, i) => [
      i + 1, r.memberNo, r.memberName, r.officeName || '-',
      r.depositType || 'DEPOSIT',
      formatCurrency(r.principalAmount),
      formatCurrency(r.interestAmount),
      dayjs(r.fromDate).format('DD/MM/YYYY')
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => csvCell(c)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `interest_list_${financialYear}_${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  const { enabled, view, setView } = useReportViews('yearly.interest-list');
  const spec = useInterestSpec(filteredData, financialYear);

  const hasData = filteredData.length > 0;
  const lastPage = Math.max(1, Math.ceil(filteredData.length / pageSize));

  return (
    <ReportShell
      className="interest-cdmdshr-page"
      title="Interest List"
      desc="CD / MD / Share interest distribution register"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!hasData}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<PiggyBank size={14} />}>
            <div>
              <label className="aw-label" htmlFor="il-member">Member ID</label>
              <MemberField id="il-member" value={selectedMemberNo} onChange={v => { setSelectedMemberNo(v); if (!v) setSelectedMemberName(''); setCurrentPage(1); }} onSelect={(m: any) => handleMemberLookup(m.memberNo, m.memberName || m.name)} />
              {selectedMemberName && (
                <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>{selectedMemberName} · No: {selectedMemberNo}</span>
                  <button type="button" className="aw-icon-btn" aria-label="Clear member" onClick={() => { setSelectedMemberNo(''); setSelectedMemberName(''); setCurrentPage(1); }}>✕</button>
                </p>
              )}
            </div>
            <div>
              <label className="aw-label" htmlFor="il-search">Search by name / number</label>
              <input id="il-search" className="aw-input" placeholder="Quick search…" value={searchText} onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }} />
            </div>
            <div>
              <label className="aw-label" htmlFor="il-fy">Financial year</label>
              <select id="il-fy" className="aw-input" value={financialYear} onChange={e => setFinancialYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="aw-label" htmlFor="il-type">Account type</label>
              <select id="il-type" className="aw-input" value={accountType} onChange={e => { setAccountType(e.target.value); setCurrentPage(1); }}>
                <option value="">All types</option>
                <option value="CD">Cumulative Deposit</option>
                <option value="MD">Monthly Deposit</option>
                <option value="SHARE">Share Capital</option>
                <option value="DEPOSIT">Deposit</option>
              </select>
            </div>
            <div>
              <label className="aw-label" htmlFor="il-wing">Wing</label>
              <select id="il-wing" className="aw-input" value={selectedWing} onChange={e => setSelectedWing(e.target.value)}>
                <option value="">All wings</option>
                {wings.map(w => <option key={w.wingNo} value={w.wingNo}>{w.name}</option>)}
              </select>
            </div>
            <button type="button" className="aw-btn aw-btn-primary" onClick={fetchData} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load interest data'}
            </button>
          </ParamCard>
          <StatCards items={[
            { label: 'Records', value: String(filteredData.length), tone: 'muted' },
            { label: 'Total interest', value: `₹${formatCurrency(totals.totalInterest)}`, tone: 'warning' },
          ]} />
        </>
      }
      footerLeft="Interest List"
      footerRight={`FY ${financialYear}`}
    >
      {hasData && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="Interest Distribution List" subtitle={`FY ${financialYear}`} />}

      {paginatedData.length > 0 && view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Interest Distribution Register</span>
            <span className="aw-meta">FY {financialYear} • {filteredData.length} records</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
              <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
              <div className="aw-meta">Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
              <div className="aw-strong" style={{ marginTop: 6, letterSpacing: '.08em' }}>INTEREST DISTRIBUTION LIST — FY {financialYear}</div>
              <div className="aw-meta">Generated: {dayjs().format('DD MMM YYYY hh:mm A')}</div>
            </div>
            <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
              <table className="aw-table">
                <thead>
                  <tr>
                    <th>SR</th><th>Member no</th><th>Member name</th><th>Office</th><th>Type</th>
                    <th className="is-right">Principal</th><th className="is-right">Interest</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((r, i) => (
                    <tr key={`${r.memberNo}-${r.fromDate}-${i}`}>
                      <td className="is-muted">{(currentPage - 1) * pageSize + i + 1}</td>
                      <td className="is-accent">{r.memberNo}</td>
                      <td>{r.memberName}</td>
                      <td className="is-muted">{r.officeName || '-'}</td>
                      <td>{r.depositType || 'DEPOSIT'}</td>
                      <td className="is-right">₹{formatCurrency(r.principalAmount)}</td>
                      <td className="is-right is-success">{r.interestAmount > 0 && <CrDrIndicator type="credit" className="mr-1" />}₹{formatCurrency(r.interestAmount)}</td>
                      <td>{dayjs(r.fromDate).format('DD/MM/YYYY')}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5}><b>Page: {paginatedData.length} records | Total: {filteredData.length} entries</b></td>
                    <td className="is-right"><b>₹{formatCurrency(totals.totalPrincipal)}</b></td>
                    <td className="is-right"><b>{totals.totalInterest > 0 && <CrDrIndicator type="credit" className="mr-1" />}₹{formatCurrency(totals.totalInterest)}</b></td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            {filteredData.length > pageSize && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
                <button type="button" className="aw-btn aw-btn-ghost" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
                <span className="aw-meta">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}</span>
                <button type="button" className="aw-btn aw-btn-ghost" disabled={currentPage >= lastPage} onClick={() => setCurrentPage(currentPage + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
                <select className="aw-input" style={{ width: 'auto' }} value={pageSize} aria-label="Rows per page" onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                  {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>
            )}
          </div>
        </section>
      )}
      {!hasData && (
        <ReportEmpty icon={<PiggyBank size={34} />} title={loading ? 'Loading…' : 'No Interest Data'} hint="Select the financial year and click Load interest data" />
      )}
    </ReportShell>
  );
};

export default InterestListCDMDSHRt;
