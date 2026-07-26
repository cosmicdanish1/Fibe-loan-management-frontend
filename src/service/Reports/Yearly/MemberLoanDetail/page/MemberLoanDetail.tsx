import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, Input, Button, Radio, Modal, ConfigProvider, Tooltip, Pagination, theme as antdTheme } from 'antd';
import {
  Landmark,
  Search,
  Printer,
  RotateCcw,
  User,
  FileSearch,
  Filter,
  IndianRupee,
  Briefcase,
  ShieldCheck,
  Settings,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';

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
  const [showLookup, setShowLookup] = useState<boolean>(false);
  const [lookupTarget, setLookupTarget] = useState<'from' | 'to'>('from');
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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

  const openLookup = useCallback((target: 'from' | 'to') => {
    setLookupTarget(target);
    setShowLookup(true);
  }, []);

  const handleMemberSelect = useCallback((member: any) => {
    const no = member.memberNo || member.mbno || '';
    if (lookupTarget === 'from') setMemberFrom(no);
    else setMemberTo(no);
    setShowLookup(false);
  }, [lookupTarget]);

  const fmt = useCallback((n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0), []);

  const fmtDate = (d: string) => d ? dayjs(d).format('DD-MMM-YYYY') : '-';

  const surety = (mbno: string, name: string) => {
    if (!mbno && !name) return '';
    if (mbno && name) return `${mbno}-${name}`;
    return mbno || name;
  };

  const rowBg = (item: LoanDetailItem) => {
    if (item.loanAmount > 0 && item.balance > 0)
      return isDark ? 'bg-orange-900/30' : 'bg-orange-100';
    if (!item.loanAmount || item.loanAmount === 0)
      return isDark ? 'bg-purple-900/20' : 'bg-blue-100/60';
    return '';
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

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 8,
          fontSize: 13,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <div className={`h-screen flex flex-col font-sans selection:bg-indigo-100 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50'}`}>
        {/* Compact Header */}
        <div className={`px-4 py-2.5 flex items-center justify-between z-10 shadow-sm shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-2 rounded-lg text-white shadow-md">
              <FileSearch size={18} />
            </div>
            <div>
              <h1 className={`fz-body font-extrabold tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Member Loan Detail</h1>
              <div className="flex items-center gap-1.5 mt-0.5 fz-caption font-semibold text-slate-400 uppercase tracking-wide leading-none">
                <ShieldCheck size={10} className="text-indigo-500" /> Loan Performance Analytics
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<Printer size={13} />}
              size="small"
              className="h-8 px-3 rounded-lg fz-caption font-bold uppercase tracking-wide border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all"
              onClick={handlePrint}
              disabled={tableData.length === 0}
            >
              Print
            </Button>
          </div>
        </div>

        {/* Compact Main Content */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Compact Left Panel: Controls & Stats */}
          <div className="w-[280px] flex flex-col gap-3 shrink-0">

            {/* Parameters Card */}
            <div className={`rounded-xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
              <div className={`border-b px-3 py-2 flex items-center justify-between ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-indigo-50/50 border-slate-100'}`}>
                <h3 className={`fz-caption font-extrabold tracking-wide uppercase flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Settings size={12} className="text-indigo-600" />
                  Parameters
                </h3>
                <Tooltip title="Reload">
                  <Button type="text" size="small" icon={<RefreshCw size={11} />} onClick={handleLoad} className="h-6 w-6" />
                </Tooltip>
              </div>

              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <label className="fz-caption font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                    <User size={10} className="text-blue-500" />
                    Member From
                  </label>
                  <Input.Search
                    placeholder="Starting member"
                    value={memberFrom}
                    onChange={e => setMemberFrom(e.target.value)}
                    onSearch={() => openLookup('from')}
                    className="h-8 fz-label font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="fz-caption font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                    <User size={10} className="text-indigo-500" />
                    Member To
                  </label>
                  <Input.Search
                    placeholder="Ending member"
                    value={memberTo}
                    onChange={e => setMemberTo(e.target.value)}
                    onSearch={() => openLookup('to')}
                    className="h-8 fz-label font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="fz-caption font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                    <Filter size={10} className="text-amber-500" />
                    Loan Type
                  </label>
                  <Select
                    className="w-full h-8"
                    showSearch
                    placeholder="Select type"
                    value={selectedLoanType}
                    onChange={setSelectedLoanType}
                    options={[
                      { value: 'ALL', label: 'All Types' },
                      ...loanTypes.map(t => ({ value: t.code, label: t.name }))
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="fz-caption font-bold text-slate-500 uppercase tracking-tight">Output</label>
                  <Radio.Group
                    size="small"
                    value={outputType}
                    onChange={e => setOutputType(e.target.value)}
                    className="w-full loan-radio-compact"
                  >
                    <Radio.Button value="screen" className="w-1/2 text-center">Screen</Radio.Button>
                    <Radio.Button value="printer" className="w-1/2 text-center">Print</Radio.Button>
                  </Radio.Group>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="small"
                    icon={<RotateCcw size={13} />}
                    onClick={handleReset}
                    className="flex-1 h-8 fz-caption font-bold uppercase tracking-wide"
                  >
                    Reset
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<Search size={13} />}
                    onClick={handleLoad}
                    loading={loading}
                    className="flex-1 h-9 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 font-bold uppercase tracking-wide fz-caption shadow-md"
                  >
                    Load
                  </Button>
                </div>
              </div>
            </div>

            {/* Compact Stats Grid */}
            {tableData.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                <div className={`rounded-lg p-3 shadow-sm hover:shadow-md transition-all group border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`fz-caption font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Accounts</div>
                    <FileSearch size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className={`fz-heading font-black font-mono ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{tableData.length}</div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                  <IndianRupee size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                  <div className="fz-caption font-bold uppercase tracking-wide opacity-90 mb-0.5">Sanctioned</div>
                  <div className="fz-body font-black font-mono relative z-10">₹{fmt(totalSanctioned)}</div>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                  <IndianRupee size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                  <div className="fz-caption font-bold uppercase tracking-wide opacity-90 mb-0.5">Outstanding</div>
                  <div className="fz-body font-black font-mono relative z-10">₹{fmt(totalOutstanding)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Compact Report Panel with Scroll */}
          <div className={`flex-1 rounded-xl shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
            <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-indigo-50/50 border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-100'}`}>
                  <Briefcase size={14} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className={`fz-label font-extrabold uppercase tracking-wide leading-none ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Loan Register</h3>
                  <p className="fz-caption font-semibold text-slate-400 uppercase mt-0.5 tracking-tight">
                    {memberFrom && memberTo ? `${memberFrom} to ${memberTo}` : 'All Members'} • {selectedLoanType}
                  </p>
                </div>
              </div>
              {/* Legend */}
              {tableData.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-sm border border-orange-400" style={{ background: '#fed7aa' }} />
                    <span className="fz-caption font-semibold text-slate-400">Loan Sanc. But Not Paid</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-sm border border-blue-300" style={{ background: '#dbeafe' }} />
                    <span className="fz-caption font-semibold text-slate-400">Loan Not Sanc. &amp; Not Paid</span>
                  </div>
                </div>
              )}
            </div>

            <div className={`flex-1 overflow-auto p-3 custom-scrollbar-compact ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3" />
                  <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading loan data...</span>
                </div>
              ) : tableData.length > 0 ? (
                <div className="legacy-loan-report">
                  {/* Horizontal Scroll Container */}
                  <div className="overflow-x-auto">
                    {/*
                      IMPORTANT: border-separate (NOT collapse) is required for position:sticky to work.
                      With border-collapse, shared borders bleed through sticky cell backgrounds.
                      Widths: MBNO=90 Name=220 LoanCase=100 → sticky left: 0, 91, 313
                    */}
                    <table
                      className="fz-caption font-mono"
                      style={{
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        tableLayout: 'fixed',
                        width: 'max-content',
                        minWidth: 1300,
                        border: `2px solid ${isDark ? '#475569' : '#94a3b8'}`,
                      }}
                    >
                      <colgroup>
                        <col style={{ width: 90 }} />
                        <col style={{ width: 220 }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 115 }} />
                        <col style={{ width: 125 }} />
                        <col style={{ width: 185 }} />
                        <col style={{ width: 185 }} />
                        <col style={{ width: 125 }} />
                        <col style={{ width: 115 }} />
                        <col style={{ width: 60 }} />
                        <col style={{ width: 105 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {/* Sticky header cells */}
                          {[
                            { label: 'MBNO',         left: 0,   shadow: false },
                            { label: 'Name',         left: 91,  shadow: false },
                            { label: 'LoanCase No.', left: 313, shadow: true  },
                          ].map(({ label, left, shadow }) => (
                            <th key={label} style={{
                              position: 'sticky', left, zIndex: 2,
                              background: isDark ? '#334155' : '#f1f5f9',
                              borderRight: `1px solid ${isDark ? '#475569' : '#94a3b8'}`,
                              borderBottom: `2px solid ${isDark ? '#475569' : '#94a3b8'}`,
                              ...(shadow ? { boxShadow: '4px 0 6px -2px rgba(0,0,0,0.25)' } : {}),
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }} className={`px-2 py-1.5 text-left font-black ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                              {label}
                            </th>
                          ))}
                          {/* Scrollable header cells */}
                          {['Sanc. Date','Sanc. Amount','Surety 1','Surety 2','Applied Amount','Applied Date','Rate','Install Amt'].map(h => (
                            <th key={h} style={{
                              background: isDark ? '#334155' : '#f1f5f9',
                              borderRight: `1px solid ${isDark ? '#475569' : '#94a3b8'}`,
                              borderBottom: `2px solid ${isDark ? '#475569' : '#94a3b8'}`,
                            }} className={`px-2 py-1.5 text-left font-black ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((item, idx) => {
                          const stickyBg = item.loanAmount > 0 && item.balance > 0
                            ? (isDark ? '#4a1a05' : '#fed7aa')
                            : (!item.loanAmount || item.loanAmount === 0)
                              ? (isDark ? '#1e1245' : '#dbeafe')
                              : (isDark ? '#1e293b' : '#ffffff');
                          const cellBdr = `1px solid ${isDark ? '#334155' : '#cbd5e1'}`;
                          const stickyStyle = (left: number, shadow = false) => ({
                            position: 'sticky' as const, left, zIndex: 1,
                            background: stickyBg,
                            borderRight: cellBdr, borderBottom: cellBdr,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                            ...(shadow ? { boxShadow: '4px 0 6px -2px rgba(0,0,0,0.25)' } : {}),
                          });
                          const scrollStyle = { borderRight: cellBdr, borderBottom: cellBdr };
                          return (
                            <tr key={item.key || idx} className={`transition-colors ${rowBg(item)}`}>
                              <td style={stickyStyle(0)}   className={`px-2 py-1 font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{item.memberNo}</td>
                              <td style={stickyStyle(91)}  className={`px-2 py-1 font-semibold uppercase ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{item.memberName}</td>
                              <td style={stickyStyle(313, true)} className={`px-2 py-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.loanCaseNo}</td>
                              <td style={scrollStyle} className={`px-2 py-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{fmtDate(item.disbursementDate)}</td>
                              <td style={scrollStyle} className={`px-2 py-1 text-right font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{fmt(item.loanAmount)}</td>
                              <td style={{ ...scrollStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className={`px-2 py-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{surety(item.surety1Mbno, item.surety1Name)}</td>
                              <td style={{ ...scrollStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className={`px-2 py-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{surety(item.surety2Mbno, item.surety2Name)}</td>
                              <td style={scrollStyle} className={`px-2 py-1 text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{fmt(item.appliedAmount)}</td>
                              <td style={scrollStyle} className={`px-2 py-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{fmtDate(item.appliedDate || item.disbursementDate)}</td>
                              <td style={scrollStyle} className={`px-2 py-1 text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.interestRate}%</td>
                              <td style={scrollStyle} className={`px-2 py-1 text-right font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{fmt(item.installmentAmount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        {(() => {
                          const ftBg = isDark ? '#334155' : '#f1f5f9';
                          const ftBdr = `2px solid ${isDark ? '#475569' : '#94a3b8'}`;
                          const cellBdr = `1px solid ${isDark ? '#475569' : '#94a3b8'}`;
                          return (
                            <tr>
                              <td style={{ position: 'sticky', left: 0,   zIndex: 1, background: ftBg, borderTop: ftBdr, borderRight: cellBdr }} className="px-2 py-1.5" />
                              <td style={{ position: 'sticky', left: 91,  zIndex: 1, background: ftBg, borderTop: ftBdr, borderRight: cellBdr }} className={`px-2 py-1.5 text-right font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>TOTAL ({tableData.length}):</td>
                              <td style={{ position: 'sticky', left: 313, zIndex: 1, background: ftBg, borderTop: ftBdr, borderRight: cellBdr, boxShadow: '4px 0 6px -2px rgba(0,0,0,0.25)' }} className="px-2 py-1.5" />
                              <td style={{ background: ftBg, borderTop: ftBdr, borderRight: cellBdr }} className="px-2 py-1.5" />
                              <td style={{ background: ftBg, borderTop: ftBdr, borderRight: cellBdr }} className={`px-2 py-1.5 text-right font-black ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{fmt(totalSanctioned)}</td>
                              {[...Array(6)].map((_, i) => (
                                <td key={i} style={{ background: ftBg, borderTop: ftBdr, borderRight: i < 5 ? cellBdr : 'none' }} className="px-2 py-1.5" />
                              ))}
                            </tr>
                          );
                        })()}
                      </tfoot>
                    </table>
                  </div>

                  {/* Pagination */}
                  {outputType === 'screen' && tableData.length > 0 && (
                    <div className="mt-4 flex justify-center">
                      <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={tableData.length}
                        onChange={handlePageChange}
                        onShowSizeChange={handlePageChange}
                        showSizeChanger
                        showQuickJumper
                        pageSizeOptions={['20', '50', '100', '200']}
                        showTotal={(total, range) => (
                          <span className="fz-caption text-slate-600 font-semibold">
                            {range[0]}-{range[1]} of {total} records
                          </span>
                        )}
                        size="small"
                        className="fz-label"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <Landmark size={60} className="text-slate-300 mb-4" />
                  <h3 className="fz-label font-bold text-slate-400 uppercase tracking-wide">No Loan Data</h3>
                  <p className="fz-caption font-medium text-slate-300 uppercase mt-1.5 text-center max-w-[200px]">
                    Configure member range and filters to view loan details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className={`px-4 py-2 flex items-center justify-between shrink-0 border-t ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <span className="fz-caption font-bold text-slate-400 uppercase tracking-wide">Loan Management v2</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="fz-caption font-semibold text-slate-300 uppercase tracking-tight">
              Type: {selectedLoanType}
            </span>
            <div className="w-px h-2.5 bg-slate-200" />
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-2 py-0.5 rounded fz-caption font-bold text-indigo-600 uppercase tabular-nums tracking-wide">
              v5.5.0
            </div>
          </div>
        </div>
      </div>

      {/* Member Lookup Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3 p-4 border-b border-slate-100">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="fz-heading font-bold text-slate-800">Member Search Directory</div>
              <div className="fz-label text-slate-500 font-normal">Selecting for: {lookupTarget === 'from' ? 'Range Start' : 'Range End'}</div>
            </div>
          </div>
        }
        open={showLookup}
        onCancel={() => setShowLookup(false)}
        footer={null}
        width={950}
        styles={{ body: { padding: 0 } }}
        className="premium-modal"
        centered
        destroyOnClose
      >
        <div className="p-2">
          <MemberLookup
            isModal={true}
            onSelect={handleMemberSelect}
            onClose={() => setShowLookup(false)}
          />
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar-compact::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-compact::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-compact::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #e0e7ff, #c7d2fe);
          border-radius: 10px;
        }
        .custom-scrollbar-compact::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #c7d2fe, #a5b4fc);
        }
        .loan-radio-compact .ant-radio-button-wrapper {
          font-size: 10px !important;
          font-weight: 700 !important;
          padding: 0 8px !important;
          height: 28px !important;
          line-height: 26px !important;
        }
        .legacy-loan-report { padding: 4px; }
      `}</style>
    </ConfigProvider>
  );
};

export default MemberLoanDetail;
