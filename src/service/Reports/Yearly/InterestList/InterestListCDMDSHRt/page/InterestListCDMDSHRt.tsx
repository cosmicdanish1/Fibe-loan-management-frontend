import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Select, Button, ConfigProvider, Input, Pagination, Modal, theme as antdTheme } from 'antd';
import {
  Printer,
  FileDown,
  PiggyBank,
  Building2,
  Users,
  Search,
} from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../../services/api';
import MemberLookup from '../../../../../../components/shared/MemberLookup/MemberLookup';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../store';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';

const { Option } = Select;

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
  const [showLookupModal, setShowLookupModal] = useState<boolean>(false);
  const [selectedWing, setSelectedWing] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>(`${currentYear - 2}-${currentYear - 1}`);
  const [loading, setLoading] = useState<boolean>(false);
  const [rawData, setRawData] = useState<InterestData[]>([]);
  const [wings, setWings] = useState<{ wingNo: string; name: string }[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark';

  // Theme variables
  const bg      = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const side    = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const divider = isDark ? 'border-slate-700' : 'border-slate-200';
  const text    = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted   = isDark ? 'text-slate-400' : 'text-slate-500';
  const lbl     = isDark ? 'text-slate-300' : 'text-slate-700';
  const tblHd   = isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800';
  const tblBdr  = isDark ? 'border-slate-600' : 'border-slate-400';
  const tblCBdr = isDark ? 'border-slate-600' : 'border-slate-300';
  const tblTxt  = isDark ? 'text-slate-300' : 'text-slate-700';
  const tblEmp  = isDark ? 'text-slate-200' : 'text-slate-800';
  const rowHov  = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50';
  const tfoot   = isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800';
  const pagerBg = isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200';

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
    setShowLookupModal(false);
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
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `interest_list_${financialYear}_${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: { colorPrimary: '#f59e0b', borderRadius: 8 },
    }}>
      <div className={`interest-cdmdshr-page h-screen flex flex-col font-sans overflow-hidden ${bg}`}>
        <div className="interest-cdmdshr-topbar bg-gradient-to-r from-slate-900 to-slate-900 px-3 py-1.5 flex items-center shrink-0 shadow-lg border-b border-white/5">
          <h1 className="fz-caption font-black text-white tracking-tight uppercase">5.3.3 Interest List</h1>
        </div>
        <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <div className={`interest-cdmdshr-sidebar w-80 flex flex-col shrink-0 border-r ${side}`}>

          {/* Header */}
          <div className={`p-4 border-b ${divider}`}>
            <div className="flex items-center gap-3">
              <div className="bg-amber-600 p-2 rounded-lg text-white shadow-lg">
                <PiggyBank size={18} />
              </div>
              <div>
                <h1 className={`fz-heading font-black tracking-tight ${text}`}>5.3.3 Interest List</h1>
                <div className={`flex items-center gap-1 mt-0.5 fz-label font-bold uppercase tracking-wider ${muted}`}>
                  <Building2 size={10} className="text-amber-500" />
                  CD / MD / SHR
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">

            <div>
              <label className={`block fz-label font-bold mb-1 ${lbl}`}>Member ID</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={selectedMemberNo}
                  onChange={e => {
                    setSelectedMemberNo(e.target.value);
                    if (!e.target.value) setSelectedMemberName('');
                    setCurrentPage(1);
                  }}
                  placeholder="Member No."
                  className={`flex-1 min-w-0 px-2 py-1.5 border-2 rounded fz-label font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    isDark
                      ? 'bg-slate-700 border-slate-500 text-slate-200 placeholder-slate-500 focus:border-blue-500'
                      : 'bg-white border-blue-400 text-slate-800 placeholder-slate-400 focus:border-blue-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowLookupModal(true)}
                  className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded fz-label font-black flex items-center gap-1 transition-all shadow-md whitespace-nowrap"
                >
                  <Search size={12} />
                  <span>Search</span>
                </button>
              </div>
              {selectedMemberName && (
                <div className={`mt-1.5 px-2 py-1.5 rounded border flex items-center justify-between gap-2 ${isDark ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="min-w-0">
                    <div className={`fz-label font-bold truncate ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>{selectedMemberName}</div>
                    <div className={`fz-label ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>No: {selectedMemberNo}</div>
                  </div>
                  <button
                    onClick={() => { setSelectedMemberNo(''); setSelectedMemberName(''); setCurrentPage(1); }}
                    className={`text-xs shrink-0 ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
                  >✕</button>
                </div>
              )}
            </div>

            <div>
              <label className={`block fz-label font-bold mb-1 ${lbl}`}>Search by Name / Number</label>
              <Input
                placeholder="Quick search..."
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
                prefix={<Search size={14} className={muted} />}
                className="h-9"
                allowClear
              />
            </div>

            <div>
              <label className={`block fz-label font-bold mb-1 ${lbl}`}>Financial Year</label>
              <Select value={financialYear} onChange={setFinancialYear} className="w-full h-9">
                {years.map(y => <Option key={y} value={y}>{y}</Option>)}
              </Select>
            </div>

            <div>
              <label className={`block fz-label font-bold mb-1 ${lbl}`}>Account Type</label>
              <Select
                value={accountType || undefined}
                onChange={v => { setAccountType(v ?? ''); setCurrentPage(1); }}
                className="w-full h-9"
                placeholder="All Types"
                allowClear
              >
                <Option value="CD">Cumulative Deposit</Option>
                <Option value="MD">Monthly Deposit</Option>
                <Option value="SHARE">Share Capital</Option>
                <Option value="DEPOSIT">Deposit</Option>
              </Select>
            </div>

            <div>
              <label className={`block fz-label font-bold mb-1 ${lbl}`}>Wing</label>
              <Select
                value={selectedWing || undefined}
                onChange={v => setSelectedWing(v ?? '')}
                className="w-full h-9"
                placeholder="All Wings"
                allowClear
              >
                {wings.map(w => <Option key={w.wingNo} value={w.wingNo}>{w.name}</Option>)}
              </Select>
            </div>

            <Button
              type="primary"
              onClick={fetchData}
              loading={loading}
              className="w-full h-10 bg-amber-600 hover:bg-amber-700 font-bold fz-body"
              icon={<Search size={16} />}
            >
              {loading ? 'Loading...' : 'Load Interest Data'}
            </Button>
          </div>

          {/* Summary */}
          <div className={`p-4 border-t space-y-2 ${divider}`}>
            <div className={`p-3 rounded-lg border flex items-center justify-between ${isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
              <div>
                <div className={`fz-heading font-black ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>{filteredData.length}</div>
                <div className={`fz-label font-bold uppercase ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Records</div>
              </div>
              <Users size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            </div>
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`fz-label font-bold uppercase ${muted}`}>Total Interest</div>
              <div className={`fz-heading font-black flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                {totals.totalInterest > 0 && <CrDrIndicator type="credit" />}
                ₹{formatCurrency(totals.totalInterest)}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className={`interest-cdmdshr-topbar2 px-4 py-3 shrink-0 border-b flex items-center justify-between ${side}`}>
            <div>
              <h2 className={`fz-heading font-black ${text}`}>Interest Distribution Register</h2>
              <p className={`fz-label mt-0.5 ${muted}`}>
                FY {financialYear} • {filteredData.length} records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                icon={<FileDown size={16} />}
                onClick={handleExportCSV}
                disabled={filteredData.length === 0}
                className="h-9 px-4 fz-body font-bold"
              >
                CSV
              </Button>
              <Button
                icon={<Printer size={16} />}
                onClick={handlePrint}
                disabled={filteredData.length === 0}
                className="h-9 px-4 fz-body font-bold"
              >
                Print
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 p-4 overflow-auto">
            <div className={`interest-cdmdshr-card rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mr-3" />
                  <span className={`font-bold ${muted}`}>Loading interest data...</span>
                </div>
              ) : paginatedData.length > 0 ? (
                <>
                  {/* Company Header */}
                  <div className={`text-center px-4 pt-4 pb-3 border-b border-dashed font-mono fz-label ${isDark ? 'bg-slate-900/30 border-slate-600' : 'bg-slate-50 border-slate-300'}`}>
                    <div className={`fz-body font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      Espat Karmchari Co-Operative Credit Society Limited.
                    </div>
                    <div className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006
                    </div>
                    <div className={`fz-body font-bold mt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      INTEREST DISTRIBUTION LIST — FY {financialYear}
                    </div>
                    <div className={`${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      Generated: {dayjs().format('DD MMM YYYY hh:mm A')}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className={`w-full border-collapse border font-mono fz-label ${tblBdr}`}>
                      <thead>
                        <tr className={tblHd}>
                          <th className={`border px-2 py-2 text-left font-bold uppercase ${tblBdr}`}>SR</th>
                          <th className={`border px-2 py-2 text-left font-bold uppercase ${tblBdr}`}>Member No</th>
                          <th className={`border px-2 py-2 text-left font-bold uppercase ${tblBdr}`}>Member Name</th>
                          <th className={`border px-2 py-2 text-left font-bold uppercase ${tblBdr}`}>Office</th>
                          <th className={`border px-2 py-2 text-left font-bold uppercase ${tblBdr}`}>Type</th>
                          <th className={`border px-2 py-2 text-right font-bold uppercase ${tblBdr}`}>Principal</th>
                          <th className={`border px-2 py-2 text-right font-bold uppercase ${tblBdr}`}>Interest</th>
                          <th className={`border px-2 py-2 text-left font-bold uppercase ${tblBdr}`}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((r, i) => (
                          <tr key={`${r.memberNo}-${r.fromDate}-${i}`} className={rowHov}>
                            <td className={`border px-2 py-1 ${tblCBdr} ${tblTxt}`}>{(currentPage - 1) * pageSize + i + 1}</td>
                            <td className={`border px-2 py-1 font-bold ${tblCBdr} ${tblEmp}`}>{r.memberNo}</td>
                            <td className={`border px-2 py-1 font-bold ${tblCBdr} ${tblEmp}`}>{r.memberName}</td>
                            <td className={`border px-2 py-1 ${tblCBdr} ${tblTxt}`}>{r.officeName || '-'}</td>
                            <td className={`border px-2 py-1 font-bold uppercase ${tblCBdr} ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{r.depositType || 'DEPOSIT'}</td>
                            <td className={`border px-2 py-1 text-right font-bold ${tblCBdr} ${tblEmp}`}>₹{formatCurrency(r.principalAmount)}</td>
                            <td className={`border px-2 py-1 text-right font-bold ${tblCBdr} ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                              {r.interestAmount > 0 && <CrDrIndicator type="credit" className="mr-1" />}
                              ₹{formatCurrency(r.interestAmount)}
                            </td>
                            <td className={`border px-2 py-1 ${tblCBdr} ${tblTxt}`}>{dayjs(r.fromDate).format('DD/MM/YYYY')}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className={`font-bold ${tfoot}`}>
                          <td colSpan={5} className={`border px-2 py-2 font-black uppercase ${tblBdr}`}>
                            Page: {paginatedData.length} records | Total: {filteredData.length} entries
                          </td>
                          <td className={`border px-2 py-2 text-right font-black ${tblBdr}`}>
                            ₹{formatCurrency(totals.totalPrincipal)}
                          </td>
                          <td className={`border px-2 py-2 text-right font-black ${tblBdr} ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                            {totals.totalInterest > 0 && <CrDrIndicator type="credit" className="mr-1" />}
                            ₹{formatCurrency(totals.totalInterest)}
                          </td>
                          <td className={`border px-2 py-2 ${tblBdr}`} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Pagination */}
                  {filteredData.length > pageSize && (
                    <div className={`flex items-center justify-between px-4 py-3 border-t ${pagerBg}`}>
                      <div className={`fz-label font-bold ${muted}`}>
                        {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
                      </div>
                      <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={filteredData.length}
                        onChange={(p, ps) => { setCurrentPage(p); if (ps !== pageSize) setPageSize(ps); }}
                        showSizeChanger
                        showQuickJumper
                        pageSizeOptions={['50', '100', '200', '500']}
                        size="small"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <PiggyBank size={48} className="text-slate-300 mx-auto mb-3" />
                  <h3 className={`fz-body font-bold uppercase ${muted}`}>No Interest Data</h3>
                  <p className={`fz-label mt-1 ${muted}`}>Select Financial Year and click Load Interest Data</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Member Lookup Modal — same as Member Master */}
      <Modal
        open={showLookupModal}
        onCancel={() => setShowLookupModal(false)}
        footer={null}
        width={800}
        styles={{ body: { padding: 0 } }}
        closable={false}
        destroyOnClose
      >
        <MemberLookup
          isModal={true}
          onSelect={(member) => handleMemberLookup(member.memberNo, member.memberName || member.name)}
          onClose={() => setShowLookupModal(false)}
        />
      </Modal>

      <style>{`
        /* ── Interest List CD/MD/SHR — dark mode (reinforces the page's own isDark styling) ── */
        html.dark .interest-cdmdshr-page { background-color: #000000 !important; }
        html.dark .interest-cdmdshr-topbar { background-image: none !important; background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .interest-cdmdshr-sidebar,
        html.dark .interest-cdmdshr-topbar2,
        html.dark .interest-cdmdshr-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .interest-cdmdshr-page label { color: #8e8e93 !important; }
        html.dark .interest-cdmdshr-page .ant-select-selector,
        html.dark .interest-cdmdshr-page .ant-input { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .interest-cdmdshr-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default InterestListCDMDSHRt;
