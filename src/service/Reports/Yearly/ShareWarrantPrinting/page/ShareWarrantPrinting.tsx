import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, Input, Button, DatePicker, Modal, ConfigProvider, Tooltip, theme as antdTheme } from 'antd';
import {
  Printer,
  Search,
  User,
  FileText,
  Calendar,
  Share2,
  RotateCcw,
  ShieldCheck,
  Settings,
  RefreshCw,
  IndianRupee
} from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';


interface ShareWarrantItem {
  key: string;
  srno: string;
  mbno: string;
  memberName: string;
  shareAmount: string;
  officeno: string;
  pfno: string;
  warrantDate: string;
}

const ShareWarrantPrinting: React.FC = () => {
  // State
  const [memberFrom, setMemberFrom] = useState<string>('');
  const [memberTo, setMemberTo] = useState<string>('');
  const [warrantDate, setWarrantDate] = useState(dayjs());
  const [tableData, setTableData] = useState<ShareWarrantItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLookup, setShowLookup] = useState<boolean>(false);
  const [lookupTarget, setLookupTarget] = useState<'from' | 'to'>('from');

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleSearch = useCallback(async (): Promise<ShareWarrantItem[]> => {
    if (!memberFrom || !memberTo) return [];
    setLoading(true);
    try {
      const response = await apiService.getShareWarrant(memberFrom, memberTo, warrantDate.format('YYYY-MM-DD'));
      if (response?.success) {
        const data: ShareWarrantItem[] = Array.isArray(response.data)
          ? response.data
          : (response.data?.data ?? response.data?.reportData ?? []);
        setTableData(data);
        return data;
      }
    } catch (error) {
      console.error('ShareWarrant fetch error:', error);
    } finally {
      setLoading(false);
    }
    setTableData([]);
    return [];
  }, [memberFrom, memberTo, warrantDate]);

  const handleReset = useCallback(() => {
    setMemberFrom('');
    setMemberTo('');
    setWarrantDate(dayjs());
    setTableData([]);
  }, []);

  const openLookup = useCallback((target: 'from' | 'to') => {
    setLookupTarget(target);
    setShowLookup(true);
  }, []);

  const handleMemberSelect = useCallback((member: any) => {
    const mNo = member.mbno || member.memberNo;
    if (lookupTarget === 'from') {
      setMemberFrom(mNo);
    } else {
      setMemberTo(mNo);
    }
    setShowLookup(false);
  }, [lookupTarget]);

  const totalShares = useMemo(() => {
    return tableData.reduce((sum, item) => {
      const amount = parseFloat(item.shareAmount.replace(/,/g, '')) || 0;
      return sum + amount;
    }, 0);
  }, [tableData]);

  const formatCurrency = useCallback((amount: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount), []);

  const buildPrintHtml = (rows: ShareWarrantItem[]) => {
    const tRows = rows.map(r => `<tr>
      <td style="text-align:center">${r.srno}</td>
      <td>${r.mbno}</td>
      <td>${r.memberName || ''}</td>
      <td>${r.pfno || ''}</td>
      <td>${r.officeno || ''}</td>
      <td style="text-align:right">₹ ${r.shareAmount}</td>
      <td style="text-align:center">${r.warrantDate || ''}</td>
    </tr>`).join('');
    return `<!DOCTYPE html><html><head><title>Share Warrant Printing</title>
<style>
  body{font-family:'Courier New',monospace;font-size:10px;margin:10px;}
  h2{text-align:center;font-size:13px;margin-bottom:2px;}
  p.sub{text-align:center;font-size:9px;color:#555;margin:0 0 6px;}
  table{width:100%;border-collapse:collapse;}
  th,td{border:1px solid #94a3b8;padding:3px 6px;}
  th{background:#e2e8f0;color:#1d4ed8;font-weight:bold;text-align:left;}
  tfoot td{font-weight:bold;background:#f1f5f9;}
  @page{size:portrait;margin:10mm;}
</style></head><body>
<h2>Espat Karmchari Co-Operative Credit Society Limited.</h2>
<p class="sub">Share Warrant Register — Member: ${memberFrom} to ${memberTo} | Date: ${warrantDate.format('DD-MMM-YYYY')}</p>
<table>
  <thead><tr><th>SR.</th><th>Member Code</th><th>Member Name</th><th>PF No.</th><th>Office</th><th>Share Capital</th><th>Warrant Date</th></tr></thead>
  <tbody>${tRows}</tbody>
  <tfoot><tr>
    <td colspan="5" style="text-align:right">TOTAL (${rows.length} warrants):</td>
    <td style="text-align:right">₹ ${formatCurrency(rows.reduce((s, r) => s + (parseFloat(r.shareAmount?.replace(/,/g,'') || '0')), 0))}</td>
    <td></td>
  </tr></tfoot>
</table></body></html>`;
  };

  const printWithData = (rows: ShareWarrantItem[]) => {
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
        <div className={`px-4 py-2.5 flex items-center justify-between z-10 shadow-sm shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/80 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-2 rounded-lg text-white shadow-md">
              <Share2 size={18} />
            </div>
            <div>
              <h1 className={`fz-body font-extrabold tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Share Warrant Printing</h1>
              <div className="flex items-center gap-1.5 mt-0.5 fz-caption font-semibold text-slate-400 uppercase tracking-wide leading-none">
                <ShieldCheck size={10} className="text-indigo-500" /> Capital Management
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
                  <Button type="text" size="small" icon={<RefreshCw size={11} />} onClick={handleSearch} className="h-6 w-6" />
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
                    <Calendar size={10} className="text-amber-500" />
                    Warrant Date
                  </label>
                  <DatePicker
                    className="w-full h-8 fz-label"
                    format="DD-MMM-YYYY"
                    value={warrantDate}
                    onChange={date => date && setWarrantDate(date)}
                  />
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
                    onClick={handleSearch}
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
                    <div className={`fz-caption font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Warrants</div>
                    <FileText size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className={`fz-heading font-black font-mono ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{tableData.length}</div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                  <IndianRupee size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                  <div className="fz-caption font-bold uppercase tracking-wide opacity-90 mb-0.5">Total Shares</div>
                  <div className="fz-body font-black font-mono relative z-10">₹{formatCurrency(totalShares)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Compact Report Panel with Scroll */}
          <div className={`flex-1 rounded-xl shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
            <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-indigo-50/50 border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-100'}`}>
                  <Share2 size={14} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className={`fz-label font-extrabold uppercase tracking-wide leading-none ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Warrant Register</h3>
                  <p className="fz-caption font-semibold text-slate-400 uppercase mt-0.5 tracking-tight">
                    {memberFrom && memberTo ? `${memberFrom} to ${memberTo}` : 'All Members'} • {warrantDate.format('DD-MMM-YYYY')}
                  </p>
                </div>
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-3 custom-scrollbar-compact ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              {tableData.length > 0 ? (
                <div className="legacy-warrant-report">
                  <div className="overflow-x-auto">
                    <table className={`w-full border-collapse fz-caption font-mono min-w-[900px] border-2 ${isDark ? 'border-slate-600' : 'border-slate-400'}`}>
                      <thead>
                        <tr className={`border-b-2 ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-400 bg-slate-100'}`}>
                          {['SR.','Member Code','Member Name','PF No.','Office','Share Capital','Warrant Date'].map((h, i) => (
                            <th key={h} className={`border px-2 py-1.5 font-black ${i === 0 || i === 5 || i === 6 ? 'text-center' : 'text-left'} ${isDark ? 'border-slate-600 text-blue-300' : 'border-slate-300 text-blue-700'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((item, idx) => (
                          <tr key={item.key || idx} className={`border-b transition-colors ${isDark ? 'border-slate-600 hover:bg-slate-700/50' : 'border-slate-300 hover:bg-blue-50'}`}>
                            <td className={`border px-2 py-1 text-center ${isDark ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-600'}`}>{item.srno}</td>
                            <td className={`border px-2 py-1 font-semibold ${isDark ? 'border-slate-600 text-blue-400' : 'border-slate-300 text-blue-600'}`}>{item.mbno}</td>
                            <td className={`border px-2 py-1 font-semibold uppercase ${isDark ? 'border-slate-600 text-blue-400' : 'border-slate-300 text-blue-600'}`}>{item.memberName}</td>
                            <td className={`border px-2 py-1 ${isDark ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-700'}`}>{item.pfno}</td>
                            <td className={`border px-2 py-1 ${isDark ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-700'}`}>{item.officeno}</td>
                            <td className={`border px-2 py-1 text-right font-bold ${isDark ? 'border-slate-600 text-indigo-300' : 'border-slate-300 text-indigo-700'}`}>₹ {item.shareAmount}</td>
                            <td className={`border px-2 py-1 text-center ${isDark ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-700'}`}>{item.warrantDate}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className={`border-t-2 font-bold ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-400 bg-slate-100'}`}>
                          <td colSpan={5} className={`border px-2 py-1.5 text-right ${isDark ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-700'}`}>
                            TOTAL ({tableData.length} warrants):
                          </td>
                          <td className={`border px-2 py-1.5 text-right font-black ${isDark ? 'border-slate-600 text-indigo-300' : 'border-slate-300 text-indigo-700'}`}>
                            ₹ {formatCurrency(totalShares)}
                          </td>
                          <td className={`border ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <Share2 size={60} className="text-slate-300 mb-4" />
                  <h3 className="fz-label font-bold text-slate-400 uppercase tracking-wide">No Warrant Data</h3>
                  <p className="fz-caption font-medium text-slate-300 uppercase mt-1.5 text-center max-w-[200px]">
                    Configure member range to view share warrants
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
              <span className="fz-caption font-bold text-slate-400 uppercase tracking-wide">Share Registry v2</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="fz-caption font-semibold text-slate-300 uppercase tracking-tight">
              Date: {warrantDate.format('DD-MMM-YYYY')}
            </span>
            <div className="w-px h-2.5 bg-slate-200" />
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-2 py-0.5 rounded fz-caption font-bold text-indigo-600 uppercase tabular-nums tracking-wide">
              v5.6.0
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
        styles={{
          body: { padding: 0 }
        }}
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
      `}</style>
    </ConfigProvider>
  );
};

export default ShareWarrantPrinting;
