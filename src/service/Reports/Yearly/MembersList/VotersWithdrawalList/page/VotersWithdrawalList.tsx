import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Printer, FileDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../../services/api';
import MemberField from '../../../../../../components/shared/kit/MemberField';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../../../components/reports/views/GenericPro';
import { csvCell } from '@/utils/csv';
import { escapeHtml } from '@/utils/html';
import { useProRows } from '../../../../../../components/reports/views/ProIsland';
import { useReportViews } from '../../../../../../components/reports/views/reportViews';
import { useVotersSpec } from '../views/votersPro';
import { showDialog3 as showDialog } from '@/utils/dialog';

interface MemberData {
  memberNo: string;
  memberName: string;
  designation: string;
  officeName: string;
  officeNo: string;
  basicPay: number;
  membershipDate: string;
  isActive: boolean;
  shareBalance: number;
}

const VotersWithdrawalList: React.FC = () => {
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedMemberList, setSelectedMemberList] = useState<string>('ACTIVE');
  const [sortBy, setSortBy] = useState<string>('MBNO');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<MemberData[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');

  // Load initial data and filters on mount
  useEffect(() => {
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Division / Branch dropdowns come from the master list once, so filtering
  // the report never shrinks the options.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await apiService.getDivisionList();
        const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
        if (cancelled || !res?.success) return;
        setDivisions([...new Set(list.map((o: any) => o.name).filter(Boolean))].map(String).sort());
        setBranches([...new Set(list.map((o: any) => String(o.officeNo ?? '')).filter(Boolean))].sort());
      } catch (error) {
        console.error('Error loading division/branch masters:', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const extractRows = (response: any): MemberData[] => {
    if (Array.isArray(response?.data)) return response.data;
    if (response?.data && Array.isArray(response.data.data)) return response.data.data;
    if (response?.data) return [response.data];
    return [];
  };

  // Print / CSV must cover every matching record, not just the visible page:
  // the backend returns all rows when no limit is sent.
  const fetchAllRows = async (): Promise<MemberData[] | null> => {
    const response = await apiService.getVotersList(
      selectedDivision,
      selectedBranch,
      selectedMemberList,
      sortBy,
      undefined,
      undefined,
      searchText
    );
    if (!response || !response.success) return null;
    return extractRows(response);
  };

  const handleMemberSelect = (memberNo: string, memberData?: { memberName?: string }) => {
    setSearchText(memberNo);
    setSelectedMemberName(memberData?.memberName || '');
    setCurrentPage(1);
    fetchData(1, memberNo);
  };

  const fetchData = async (page: number = 1, searchValue?: string) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const search = searchValue !== undefined ? searchValue : searchText;

      const response = await apiService.getVotersList(
        selectedDivision,
        selectedBranch,
        selectedMemberList,
        sortBy,
        pageSize,
        offset,
        search
      );

      if (response && response.success) {
        let responseData: MemberData[] = [];

        // Handle different response structures
        if (Array.isArray(response.data)) {
          responseData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          responseData = response.data.data;
        } else if (response.data) {
          responseData = [response.data];
        }

        setData(responseData);
        setCurrentPage(page);

        // Get total count from metadata
        const totalCount = response.metadata?.totalCount || response.data?.metadata?.totalCount || responseData.length;
        setTotalRecords(totalCount);

        if (responseData.length === 0) {
          await showDialog('info', 'Info', 'No records found matching the criteria');
        }
      } else {
        setData([]);
        setTotalRecords(0);
        await showDialog('warning', 'Warning', 'No data found or API error');
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      await showDialog('error', 'Error', `Failed to load data: ${error.message || 'Unknown error'}`);
      setData([]);
      setTotalRecords(0);
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

  const handlePrint = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'Warning', 'No data available for printing');
      return;
    }
    setLoading(true);
    let rows: MemberData[] | null = null;
    try {
      rows = await fetchAllRows();
    } catch (error) {
      console.error('Error fetching all rows for print:', error);
    } finally {
      setLoading(false);
    }
    if (!rows) {
      await showDialog('error', 'Error', 'Unable to load all records for printing');
      return;
    }
    const body = rows.map((item, index) => `<tr>
      <td class="c">${index + 1}</td><td>${escapeHtml(item.memberNo)}</td><td>${escapeHtml(item.memberName)}</td>
      <td>${escapeHtml(item.designation || '-')}</td><td>${escapeHtml(item.officeName || '-')}</td>
      <td class="c">${item.membershipDate ? dayjs(item.membershipDate).format('DD-MM-YYYY') : '-'}</td>
      <td class="r">${formatCurrency(item.shareBalance)}</td><td class="c">${item.isActive ? 'ACTIVE' : 'INACTIVE'}</td>
    </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Voters/Withdrawal List</title>
<style>
  body { font-family: 'Courier New', monospace; color: #000; margin: 10mm; }
  h2 { text-align: center; font-size: 14px; margin: 0 0 4px; }
  p { text-align: center; font-size: 10px; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 2px 5px; font-size: 10px; }
  th { background: #ddd; text-transform: uppercase; }
  .r { text-align: right; } .c { text-align: center; }
  thead { display: table-header-group; } tr { page-break-inside: avoid; }
  @page { size: portrait; margin: 10mm; }
</style></head><body>
<h2>VOTERS / WITHDRAWAL LIST</h2>
<p>Records: ${rows.length}</p>
<table><thead><tr><th>SR</th><th>Member No</th><th>Member Name</th><th>Designation</th><th>Office</th><th>Join Date</th><th>Shares</th><th>Status</th></tr></thead>
<tbody>${body}</tbody></table></body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus(); iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    }
  };

  const handleExportCSV = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'Warning', 'No data available for export');
      return;
    }

    setLoading(true);
    let rows: MemberData[] | null = null;
    try {
      rows = await fetchAllRows();
    } catch (error) {
      console.error('Error fetching all rows for export:', error);
    } finally {
      setLoading(false);
    }
    if (!rows) {
      await showDialog('error', 'Error', 'Unable to load all records for export');
      return;
    }

    const headers = ['SR', 'MEMBER NO', 'MEMBER NAME', 'DESIGNATION', 'OFFICE', 'JOIN DATE', 'SHARES', 'STATUS'];
    const csvData = rows.map((item, index) => [
      index + 1,
      item.memberNo,
      item.memberName,
      item.designation || '-',
      item.officeName || '-',
      item.membershipDate ? dayjs(item.membershipDate).format('DD-MM-YYYY') : '-',
      formatCurrency(item.shareBalance),
      item.isActive ? 'ACTIVE' : 'INACTIVE'
    ]);

    const csvContent = '\uFEFF' + [headers, ...csvData]
      .map(row => row.map(cell => csvCell(cell)).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `voters_withdrawal_list_${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  const totals = useMemo(() => ({
    total: data.length,
    active: data.filter(d => d.isActive).length,
    inactive: data.filter(d => !d.isActive).length,
    totalShares: data.reduce((acc, curr) => acc + (curr.shareBalance || 0), 0)
  }), [data]);

  const { enabled, view, setView } = useReportViews('yearly.voters-list');
  const pro = useProRows<MemberData>(view !== 'legacy', `${selectedDivision}|${selectedBranch}|${selectedMemberList}|${sortBy}|${searchText}|${totalRecords}`, fetchAllRows);
  const spec = useVotersSpec(pro.rows, selectedMemberList.toLowerCase());

  const hasData = data.length > 0;
  const lastPage = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Same reload the page-size pager always did: a new size starts again at the first page.
  const changePageSize = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setLoading(true);
    apiService.getVotersList(
      selectedDivision, selectedBranch, selectedMemberList, sortBy, newPageSize, 0, searchText
    ).then(async response => {
      if (response.success && response.data) {
        const responseData = Array.isArray(response.data) ? response.data : response.data.data || [];
        setData(responseData);
        if (response.metadata && response.metadata.totalCount) {
          setTotalRecords(response.metadata.totalCount);
        }
        await showDialog('info', 'Success', `Loaded ${responseData.length} records`);
      }
      setLoading(false);
    }).catch(async error => {
      console.error('Error:', error);
      await showDialog('error', 'Error', 'Failed to load data');
      setLoading(false);
    });
  };

  return (
    <ReportShell
      className="voters-withdrawal-page"
      title="Voters / Withdrawal List"
      desc="Member registry: active and withdrawn members"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!hasData}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Users size={14} />}>
            <div>
              <label className="aw-label" htmlFor="vwl-member">Member search</label>
              <MemberField id="vwl-member" value={searchText} onChange={setSearchText} onSelect={(m: any) => handleMemberSelect(String(m.memberNo || m.mbno || ''), { memberName: m.memberName || m.name })} onSubmit={v => { setCurrentPage(1); fetchData(1, v); }} placeholder="Type name or number" />
              {selectedMemberName && <span className="aw-meta">{selectedMemberName}</span>}
              {searchText && (
                <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={() => { setSearchText(''); setSelectedMemberName(''); setCurrentPage(1); fetchData(1, ''); }}>Clear filter</button>
              )}
            </div>
            <div>
              <label className="aw-label" htmlFor="vwl-status">Member status</label>
              <select id="vwl-status" className="aw-input" value={selectedMemberList} onChange={e => setSelectedMemberList(e.target.value)}>
                <option value="ACTIVE">Active members</option>
                <option value="INACTIVE">Withdrawn members</option>
                <option value="ALL">All members</option>
              </select>
            </div>
            <div>
              <label className="aw-label" htmlFor="vwl-div">Division</label>
              <select id="vwl-div" className="aw-input" value={selectedDivision} onChange={e => setSelectedDivision(e.target.value)}>
                <option value="">All divisions</option>
                {divisions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="aw-label" htmlFor="vwl-branch">Branch</label>
              <select id="vwl-branch" className="aw-input" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                <option value="">All branches</option>
                {branches.map(b => <option key={b} value={b}>Office {b}</option>)}
              </select>
            </div>
            <div>
              <label className="aw-label" htmlFor="vwl-sort">Sort by</label>
              <select id="vwl-sort" className="aw-input" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="MBNO">Member number</option>
                <option value="NAME">Name (A-Z)</option>
                <option value="DOJ">Join date</option>
              </select>
            </div>
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => { setCurrentPage(1); fetchData(1); }} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load data'}
            </button>
          </ParamCard>
          <StatCards items={[
            { label: 'Active', value: String(totals.active), tone: 'success' },
            { label: 'Withdrawn', value: String(totals.inactive), tone: 'danger' },
            { label: 'Total records', value: String(totals.total), tone: 'muted' },
          ]} />
        </>
      }
      footerLeft="Voters / Withdrawal List"
      footerRight={`${selectedMemberList.toLowerCase()} members`}
    >
      {hasData && view !== 'legacy' && !pro.ready && <p className="aw-meta" style={{ padding: 12 }}>{pro.loading ? 'Loading every member…' : 'No members to show'}</p>}
      {hasData && pro.ready && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && pro.ready && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && pro.ready && view === 'editorial' && <GenericEditorial spec={spec} title="Voters / Withdrawal List" subtitle={`${selectedMemberList.toLowerCase()} members`} />}

      {hasData && view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Member Registry Report</span>
            <span className="aw-meta">Showing {data.length} records • {selectedMemberList.toLowerCase()} members</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
              <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
              <div className="aw-meta">Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
              <div className="aw-strong" style={{ marginTop: 6, letterSpacing: '.08em' }}>VOTERS/WITHDRAWAL LIST</div>
              <div className="aw-meta">Status: {selectedMemberList} • Generated on {dayjs().format('DD MMMM YYYY')}</div>
            </div>
            <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
              <table className="aw-table">
                <thead>
                  <tr>
                    <th>SR</th><th>Member no</th><th>Member name</th><th>Designation</th><th>Office</th><th>Join date</th>
                    <th className="is-right">Shares</th><th className="is-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={`${item.memberNo}-${index}-${currentPage}`}>
                      <td className="is-muted">{index + 1}</td>
                      <td className="is-accent">{item.memberNo}</td>
                      <td>{item.memberName}</td>
                      <td className="is-muted">{item.designation || '-'}</td>
                      <td className="is-muted">{item.officeName || '-'}</td>
                      <td className="is-muted">{item.membershipDate ? dayjs(item.membershipDate).format('DD-MM-YYYY') : '-'}</td>
                      <td className="is-right">₹{formatCurrency(item.shareBalance)}</td>
                      <td className="is-center"><span className={`aw-pill tone-${item.isActive ? 'success' : 'danger'}`}>{item.isActive ? 'Active' : 'Withdrawn'}</span></td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={6}><b>PAGE: {data.length} RECORDS | TOTAL: {totalRecords} | ACTIVE: {totals.active} | WITHDRAWN: {totals.inactive}</b></td>
                    <td className="is-right"><b>₹{formatCurrency(totals.totalShares)}</b></td>
                    <td className="is-center"><b>PAGE {currentPage}</b></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {totalRecords > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
                <button type="button" className="aw-btn aw-btn-ghost" disabled={currentPage <= 1 || loading} onClick={() => fetchData(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
                <span className="aw-meta">Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records</span>
                <button type="button" className="aw-btn aw-btn-ghost" disabled={currentPage >= lastPage || loading} onClick={() => fetchData(currentPage + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
                <select className="aw-input" style={{ width: 'auto' }} value={pageSize} aria-label="Rows per page" onChange={e => changePageSize(Number(e.target.value))}>
                  {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>
            )}
          </div>
        </section>
      )}
      {!hasData && (
        <ReportEmpty icon={<Users size={34} />} title={loading ? 'Loading…' : 'No Member Data'} hint="Select filters and click Load data to view records" />
      )}
    </ReportShell>
  );
};

export default VotersWithdrawalList;
