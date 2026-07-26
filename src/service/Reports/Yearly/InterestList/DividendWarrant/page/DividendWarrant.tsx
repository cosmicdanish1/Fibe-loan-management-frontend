import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, Button, Input, ConfigProvider, DatePicker, Pagination, Modal, Radio, theme as antdTheme } from 'antd';
import { ScrollText, Printer, Search, Download, FileCheck, Monitor } from 'lucide-react';
import { apiService } from '../../../../../../services/api';
import MemberLookup from '../../../../../../components/shared/MemberLookup/MemberLookup';
import dayjs, { Dayjs } from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../store';

const { Option } = Select;

interface WarrantData {
  memberNo: string;
  memberName: string;
  address: string;
  officeName: string;
  shareBalance: number;
  dividendAmount: number;
  dividendRate: number;
  chequeNo: string;
  paymentDate: string;
  year: number;
}

const DividendWarrant: React.FC = () => {
  const [selectedWing, setSelectedWing]     = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [sortBy, setSortBy]                 = useState<string>('MBNO');
  const [outputMode, setOutputMode]         = useState<'screen' | 'printer'>('screen');
  const [fromDate, setFromDate]             = useState<Dayjs | null>(dayjs().startOf('year'));
  const [uptoDate, setUptoDate]             = useState<Dayjs | null>(dayjs());
  const [memberNo, setMemberNo]             = useState<string>('');
  const [memberName, setMemberName]         = useState<string>('');
  const [showLookupModal, setShowLookupModal] = useState<boolean>(false);
  const [loading, setLoading]               = useState<boolean>(false);
  const [data, setData]                     = useState<WarrantData[]>([]);
  const [wings, setWings]                   = useState<any[]>([]);
  const [offices, setOffices]               = useState<any[]>([]);
  const [searchTerm, setSearchTerm]         = useState<string>('');
  const [currentPage, setCurrentPage]       = useState<number>(1);
  const [pageSize, setPageSize]             = useState<number>(100);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const bg      = isDark ? 'bg-slate-900'              : 'bg-slate-50';
  const side    = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-teal-100';
  const main    = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-teal-100';
  const divider = isDark ? 'border-slate-700'          : 'border-teal-100';
  const text    = isDark ? 'text-slate-100'             : 'text-slate-800';
  const muted   = isDark ? 'text-slate-400'             : 'text-slate-500';
  const lbl     = isDark ? 'text-slate-400'             : 'text-slate-500';
  const tblHd   = isDark ? 'bg-slate-700/60 text-teal-300' : 'bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700';
  const tblBdr  = isDark ? 'border-slate-600'          : 'border-dashed border-teal-100';
  const tblTxt  = isDark ? 'text-slate-300'             : 'text-slate-700';
  const rowHov  = isDark ? 'hover:bg-slate-700/50'     : 'hover:bg-teal-50/50';

  useEffect(() => { loadWings(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedWing) { loadOffices(selectedWing); }
    else { setOffices([]); setSelectedOffice(''); }
  }, [selectedWing]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWings = async () => {
    try {
      const res = await apiService.getReportWings();
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setWings(list);
      }
    } catch (e) { console.error('Wings load error:', e); }
  };

  const loadOffices = async (wingNo: string) => {
    try {
      const res = await apiService.getReportOffices(wingNo);
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setOffices(list);
      }
    } catch (e) { console.error('Offices load error:', e); }
  };

  const loadData = useCallback(async (): Promise<WarrantData[]> => {
    setLoading(true);
    try {
      const res = await apiService.getDividendWarrant(
        selectedWing || undefined,
        selectedOffice || undefined,
        fromDate?.format('YYYY-MM-DD'),
        uptoDate?.format('YYYY-MM-DD'),
        memberNo || undefined,
        sortBy
      );
      const rows: WarrantData[] = res.success && res.data?.data ? res.data.data : [];
      setData(rows);
      setCurrentPage(1);
      return rows;
    } catch (e) {
      console.error('DividendWarrant load error:', e);
      setData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedWing, selectedOffice, fromDate, uptoDate, memberNo, sortBy]);

  const handleLoad = async () => {
    const rows = await loadData();
    if (outputMode === 'printer' && rows.length > 0) {
      printWithData(rows);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(r =>
      r.memberNo?.toLowerCase().includes(q) ||
      r.memberName?.toLowerCase().includes(q) ||
      r.chequeNo?.toLowerCase().includes(q)
    );
  }, [data, searchTerm]);

  const paginatedData = useMemo(() =>
    filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredData, currentPage, pageSize]
  );

  const totals = useMemo(() => ({
    shareBalance:   filteredData.reduce((a, r) => a + (r.shareBalance   || 0), 0),
    dividendAmount: filteredData.reduce((a, r) => a + (r.dividendAmount || 0), 0),
  }), [filteredData]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredData.length / pageSize)), [filteredData.length, pageSize]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  const buildPrintHtml = (rows: WarrantData[]) => {
    const pages = rows.map(w => `
      <div class="page">
        <div class="warrant-header">
          <div class="society-name">
            Espat Karmchari Co-Operative Credit Society Limited.<br>
            <span style="font-size:10px;font-weight:400;">Avenue A, Sahakari Sadan, Sector-6, Bhilai Nagar, Dist: DURG-490006</span>
          </div>
          <div class="warrant-title">DIVIDEND WARRANT ${w.year || ''}</div>
        </div>
        <div class="row">
          <div class="col"><div class="label">Warrant No</div><div class="val">${w.chequeNo || '__________'}</div></div>
          <div class="col" style="text-align:right"><div class="label">Date</div><div class="val">${w.paymentDate ? dayjs(w.paymentDate).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')}</div></div>
        </div>
        <div class="row" style="margin-top:20px">
          <div class="col" style="flex:2">
            <div class="label">Pay To</div>
            <div class="val" style="font-size:14px">${w.memberName} (M.No: ${w.memberNo})</div>
            <div class="val" style="font-size:10px;margin-top:5px">${w.address || 'Address on record'}</div>
          </div>
          <div class="col"><div class="label">Office</div><div class="val">${w.officeName || '-'}</div></div>
        </div>
        <div class="row" style="margin-top:15px">
          <div class="col"><div class="label">Share Balance</div><div class="val">₹${fmt(w.shareBalance)}</div></div>
          <div class="col"><div class="label">Dividend Rate</div><div class="val">${w.dividendRate}%</div></div>
        </div>
        <div class="cheque-box">
          <div><div class="label">Sum of Rupees</div><div class="val">** Rupees ${fmt(w.dividendAmount)} Only **</div></div>
          <div class="amount-box">₹${fmt(w.dividendAmount)}</div>
        </div>
        <div class="signature">Authorized Signatory</div>
      </div>`).join('');

    return `<!DOCTYPE html><html><head><title>Dividend Warrants</title>
<style>
  body { margin:0; padding:0; background:white; font-family:'Courier New',monospace; }
  .page { width:210mm; min-height:99mm; background:white; padding:20px; margin:20px auto; border:1px dashed #cbd5e1; page-break-after:always; box-sizing:border-box; }
  @media print { body{background:white;} .page{border:none;margin:0;} @page{margin:10mm;} }
  .warrant-header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px;}
  .society-name{font-weight:700;font-size:14px;text-transform:uppercase;}
  .warrant-title{font-size:13px;font-weight:700;border:1px solid #000;padding:5px 10px;align-self:flex-start;}
  .row{display:flex;margin-bottom:10px;} .col{flex:1;}
  .label{font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;}
  .val{font-size:12px;font-weight:700;color:#000;}
  .cheque-box{border:2px solid #000;padding:15px;margin-top:20px;display:flex;justify-content:space-between;align-items:center;}
  .amount-box{font-size:18px;font-weight:700;}
  .signature{border-top:1px solid #000;width:200px;text-align:center;font-size:9px;margin-top:30px;margin-left:auto;padding-top:4px;}
</style></head><body>${pages}</body></html>`;
  };

  const printWithData = (rows: WarrantData[]) => {
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

  const handlePrint = () => { if (filteredData.length > 0) printWithData(filteredData); };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['SR','Member No','Member Name','Address','Office','Share Balance','Dividend Amount','Rate','Cheque No','Payment Date'];
    const rows = filteredData.map((r, i) => [
      i+1, r.memberNo, r.memberName, r.address||'', r.officeName||'',
      fmt(r.shareBalance), fmt(r.dividendAmount), `${r.dividendRate}%`,
      r.chequeNo||'', r.paymentDate ? dayjs(r.paymentDate).format('DD/MM/YYYY') : ''
    ]);
    const csv = [headers,...rows].map(row=>row.map(c=>`"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `dividend-warrants-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: { colorPrimary: '#14b8a6', borderRadius: 6 },
    }}>
      <div className={`h-screen flex font-sans overflow-hidden ${bg}`}>
        <div className="flex gap-4 p-4 w-full h-full">

          {/* Sidebar */}
          <div className={`w-[300px] shrink-0 rounded-2xl shadow-lg border flex flex-col ${side}`}>

            {/* Header */}
            <div className={`flex items-center gap-3 p-4 border-b ${divider}`}>
              <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-md">
                <ScrollText size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={`fz-body font-black uppercase tracking-tight truncate ${text}`}>Dividend Warrant</h1>
                <div className="fz-caption font-bold text-teal-500 uppercase tracking-wider flex items-center gap-1">
                  <FileCheck size={9} /> 5.3.4
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

              {/* Wing Name */}
              <div>
                <label className={`fz-caption font-bold uppercase tracking-wider block mb-1 ${lbl}`}>Wing Name</label>
                <Select
                  className="w-full"
                  size="small"
                  value={selectedWing || undefined}
                  onChange={v => setSelectedWing(v ?? '')}
                  allowClear
                  placeholder="All Wings"
                  showSearch
                  optionFilterProp="children"
                >
                  {wings.map((w: any) => (
                    <Option key={w.wingNo} value={w.wingNo}>{w.name}</Option>
                  ))}
                </Select>
              </div>

              {/* Office Name */}
              <div>
                <label className={`fz-caption font-bold uppercase tracking-wider block mb-1 ${lbl}`}>Office Name</label>
                <Select
                  className="w-full"
                  size="small"
                  value={selectedOffice || undefined}
                  onChange={v => setSelectedOffice(v ?? '')}
                  allowClear
                  placeholder={selectedWing ? 'All Offices' : 'Select Wing first'}
                  disabled={!selectedWing}
                  showSearch
                  optionFilterProp="children"
                >
                  {offices.map((o: any) => (
                    <Option key={o.officeNo} value={String(o.officeNo)}>
                      {o.officeNo}-{o.name}
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <label className={`fz-caption font-bold uppercase tracking-wider block mb-1 ${lbl}`}>Sort By</label>
                <Select
                  className="w-full"
                  size="small"
                  value={sortBy}
                  onChange={setSortBy}
                >
                  <Option value="MBNO">MBNO</Option>
                  <Option value="MEMBER_NAME">Member Name</Option>
                </Select>
              </div>

              {/* Screen / Printer */}
              <div>
                <label className={`fz-caption font-bold uppercase tracking-wider block mb-1 ${lbl}`}>Output</label>
                <div className="flex items-center gap-4">
                  <Radio.Group value={outputMode} onChange={e => setOutputMode(e.target.value)}>
                    <Radio value="screen">
                      <span className={`fz-caption font-semibold flex items-center gap-1 ${text}`}>
                        <Monitor size={11} /> Screen
                      </span>
                    </Radio>
                    <Radio value="printer">
                      <span className={`fz-caption font-semibold flex items-center gap-1 ${text}`}>
                        <Printer size={11} /> Printer
                      </span>
                    </Radio>
                  </Radio.Group>
                </div>
              </div>

              {/* From Date */}
              <div>
                <label className={`fz-caption font-bold uppercase tracking-wider block mb-1 ${lbl}`}>From Date</label>
                <DatePicker
                  className="w-full"
                  size="small"
                  value={fromDate}
                  onChange={setFromDate}
                  format="DD-MMM-YYYY"
                />
              </div>

              {/* Upto Date */}
              <div>
                <label className={`fz-caption font-bold uppercase tracking-wider block mb-1 ${lbl}`}>Upto Date</label>
                <DatePicker
                  className="w-full"
                  size="small"
                  value={uptoDate}
                  onChange={setUptoDate}
                  format="DD-MMM-YYYY"
                />
              </div>

              {/* Member ID */}
              <div>
                <label className={`fz-caption font-bold uppercase tracking-wider block mb-1 ${lbl}`}>Member No</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={memberNo}
                    onChange={e => { setMemberNo(e.target.value); if (!e.target.value) setMemberName(''); }}
                    placeholder="Member No."
                    className={`flex-1 min-w-0 px-2 py-1 border-2 rounded fz-caption font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      isDark
                        ? 'bg-slate-700 border-slate-500 text-slate-200 placeholder-slate-500 focus:border-blue-500'
                        : 'bg-white border-blue-400 text-slate-800 placeholder-slate-400 focus:border-blue-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLookupModal(true)}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded fz-caption font-black flex items-center gap-1 transition-all shadow-md whitespace-nowrap"
                  >
                    <Search size={11} /><span>Search</span>
                  </button>
                </div>
                {memberName && (
                  <div className={`mt-1 px-2 py-1 rounded border flex items-center justify-between gap-2 ${isDark ? 'bg-teal-900/20 border-teal-700' : 'bg-teal-50 border-teal-200'}`}>
                    <div className={`fz-caption font-bold truncate ${isDark ? 'text-teal-300' : 'text-teal-800'}`}>{memberName}</div>
                    <button onClick={() => { setMemberNo(''); setMemberName(''); }} className={`text-xs shrink-0 ${isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>✕</button>
                  </div>
                )}
              </div>

              {/* Search */}
              <div>
                <label className={`fz-caption font-bold uppercase tracking-wider block mb-1 ${lbl}`}>
                  <Search size={10} className="inline mr-1" />Quick Search
                </label>
                <Input
                  size="small"
                  placeholder="Name, Member No, Cheque..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  allowClear
                />
              </div>
            </div>

            {/* Buttons + Total Pages */}
            <div className={`p-4 border-t ${divider} space-y-2`}>

              {/* Total Pages indicator */}
              {filteredData.length > 0 && (
                <div className={`flex items-center justify-between fz-caption font-bold px-1 ${muted}`}>
                  <span>Total Pages: {totalPages}</span>
                  <span>{filteredData.length} records</span>
                </div>
              )}

              <Button
                block
                type="primary"
                size="small"
                onClick={handleLoad}
                loading={loading}
                icon={outputMode === 'printer' ? <Printer size={12} /> : <Search size={12} />}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 border-none font-bold fz-caption uppercase tracking-wider h-8"
              >
                {loading ? 'Loading...' : outputMode === 'printer' ? 'Print' : 'Load Warrants'}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="small"
                  onClick={handlePrint}
                  disabled={filteredData.length === 0}
                  icon={<Printer size={12} />}
                  className="font-bold fz-caption uppercase"
                >
                  Print
                </Button>
                <Button
                  size="small"
                  onClick={handleExportCSV}
                  disabled={filteredData.length === 0}
                  icon={<Download size={12} />}
                  className="font-bold fz-caption uppercase"
                >
                  CSV
                </Button>
              </div>

              {/* Summary */}
              {filteredData.length > 0 && (
                <div className={`p-2 rounded-lg border text-center ${isDark ? 'bg-teal-900/20 border-teal-800' : 'bg-teal-50 border-teal-200'}`}>
                  <div className={`fz-label font-black ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>₹{fmt(totals.dividendAmount)}</div>
                  <div className={`fz-caption ${muted}`}>Total Dividend</div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className={`flex-1 rounded-2xl shadow-lg border flex flex-col overflow-hidden ${main}`}>

            {/* Report Header */}
            <div className={`px-6 py-4 border-b ${divider} text-center`} style={{ fontFamily: 'Courier New, monospace' }}>
              <div className={`fz-heading font-black uppercase tracking-tight ${text}`}>
                ESPAT KARMCHARI CO-OPERATIVE CREDIT SOCIETY LIMITED.
              </div>
              <div className="fz-label font-bold text-teal-500 uppercase tracking-wider mt-1">
                Dividend Warrant Register
              </div>
              <div className={`fz-caption mt-1 ${muted}`}>
                {fromDate?.format('DD-MMM-YYYY')} to {uptoDate?.format('DD-MMM-YYYY')}
                {selectedWing && ` • Wing: ${wings.find(w => w.wingNo === selectedWing)?.name || selectedWing}`}
                {filteredData.length > 0 && ` • ${filteredData.length} records`}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mr-3" />
                  <span className={`font-bold ${muted}`}>Loading warrants...</span>
                </div>
              ) : (
                <table className="w-full fz-label" style={{ fontFamily: 'Courier New, monospace' }}>
                  <thead className="sticky top-0 z-10">
                    <tr className={`border-b-2 border-teal-300 ${tblHd}`}>
                      <th className="text-left p-2 font-black uppercase tracking-wider">SR</th>
                      <th className="text-left p-2 font-black uppercase tracking-wider">Member No</th>
                      <th className="text-left p-2 font-black uppercase tracking-wider">Name</th>
                      <th className="text-left p-2 font-black uppercase tracking-wider">Address</th>
                      <th className="text-left p-2 font-black uppercase tracking-wider">Office</th>
                      <th className="text-right p-2 font-black uppercase tracking-wider">Share Bal</th>
                      <th className="text-right p-2 font-black uppercase tracking-wider">Div Amt</th>
                      <th className="text-center p-2 font-black uppercase tracking-wider">Rate</th>
                      <th className="text-left p-2 font-black uppercase tracking-wider">Cheque No</th>
                      <th className="text-center p-2 font-black uppercase tracking-wider">Pay Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={10} className={`text-center py-20 font-bold uppercase tracking-wider ${muted}`}>
                          {data.length === 0 ? 'Select filters and click Load Warrants' : 'No results match filter'}
                        </td>
                      </tr>
                    ) : paginatedData.map((r, i) => (
                      <tr key={i} className={`border-b ${tblBdr} ${rowHov} transition-colors`}>
                        <td className={`p-2 font-bold ${muted}`}>{(currentPage - 1) * pageSize + i + 1}</td>
                        <td className="p-2 text-teal-500 font-black">{r.memberNo}</td>
                        <td className={`p-2 font-bold ${tblTxt}`}>{r.memberName}</td>
                        <td className={`p-2 fz-caption ${muted}`}>{r.address || '-'}</td>
                        <td className={`p-2 ${tblTxt}`}>{r.officeName || '-'}</td>
                        <td className={`p-2 text-right font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>₹{fmt(r.shareBalance)}</td>
                        <td className={`p-2 text-right font-black ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>₹{fmt(r.dividendAmount)}</td>
                        <td className={`p-2 text-center font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{r.dividendRate}%</td>
                        <td className={`p-2 font-bold ${tblTxt}`}>{r.chequeNo || '-'}</td>
                        <td className={`p-2 text-center ${tblTxt}`}>{r.paymentDate ? dayjs(r.paymentDate).format('DD/MM/YY') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  {filteredData.length > 0 && (
                    <tfoot>
                      <tr className={`font-bold border-t-2 border-teal-300 ${tblHd}`}>
                        <td colSpan={5} className="p-2 font-black uppercase">Total: {filteredData.length} records</td>
                        <td className="p-2 text-right font-black">₹{fmt(totals.shareBalance)}</td>
                        <td className="p-2 text-right font-black">₹{fmt(totals.dividendAmount)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>

            {/* Pagination */}
            {filteredData.length > pageSize && (
              <div className={`px-4 py-3 border-t ${divider} flex items-center justify-between`}>
                <div className={`fz-label font-bold ${muted}`}>
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
                </div>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredData.length}
                  onChange={(p, s) => { setCurrentPage(p); if (s !== pageSize) setPageSize(s); }}
                  showSizeChanger showQuickJumper
                  pageSizeOptions={['50','100','200','500']}
                  size="small"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Member Lookup Modal */}
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
          onSelect={m => { setMemberNo(m.memberNo); setMemberName(m.memberName || m.name); setShowLookupModal(false); }}
          onClose={() => setShowLookupModal(false)}
        />
      </Modal>
    </ConfigProvider>
  );
};

export default DividendWarrant;
