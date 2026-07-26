import React, { useState, useEffect } from 'react';
import { apiService } from '../../../../../../services/api';
import { Select, Button, ConfigProvider, Tooltip, theme as antdTheme } from 'antd';
import { Printer, Download, BookOpen, RefreshCw, Settings, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../store';
import dayjs from 'dayjs';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

interface VoucherEntry {
  trans_no: number;
  member_code: string;
  member_name: string;
  head_code: string;
  head_name: string;
  debit: number;
  credit: number;
}

interface JournalVoucherData {
  voucher_no: string;
  trans_date: string;
  narration: string;
  entries: VoucherEntry[];
}

const JournalTransferVoucher: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' || (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [selectVoucher, setSelectVoucher] = useState<string>('');
  const [voucherData, setVoucherData] = useState<JournalVoucherData | null>(null);
  const [voucherList, setVoucherList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchVoucherList();
  }, []);

  const fetchVoucherList = async () => {
    try {
      const response = await apiService.getAllJournalVoucherNos();
      if (response.success && Array.isArray(response.data)) {
        setVoucherList(response.data);
      }
    } catch (error) {
      console.error('Error fetching journal vouchers:', error);
    }
  };

  const handleVoucherSelect = async (value: string) => {
    setSelectVoucher(value);
    setIsLoading(true);

    try {
      const response = await apiService.getJournalVoucherByNo(value);
      if (response.success && response.data) {
        setVoucherData(response.data);
      } else {
        await showDialog('warning', 'Not Found', 'Voucher not found');
      }
    } catch (error) {
      await showDialog('error', 'Error', 'Error loading voucher');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!voucherData) return { totalDebit: 0, totalCredit: 0 };
    const totalDebit = voucherData.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredit = voucherData.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    return { totalDebit, totalCredit };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const { totalDebit, totalCredit } = calculateTotals();

  const exportToCSV = async () => {
    if (!voucherData) {
      await showDialog('warning', 'No Voucher', 'Please select a voucher first');
      return;
    }

    const headers = ['MBNO', 'Name', 'Code', 'Description', 'Debit', 'Credit'];
    const rows = voucherData.entries.map((entry) => [
      entry.member_code || '',
      entry.member_name || '',
      entry.head_code,
      entry.head_name,
      entry.debit > 0 ? formatCurrency(entry.debit) : '',
      entry.credit > 0 ? formatCurrency(entry.credit) : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_voucher_${voucherData.voucher_no}_${dayjs().format('YYYYMMDD')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    await showDialog('info', 'Exported', 'CSV exported successfully');
  };

  const handlePrint = async () => {
    if (!voucherData) {
      await showDialog('warning', 'No Voucher', 'Please select a voucher first');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Journal/Transfer Voucher - ${voucherData.voucher_no}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'JetBrains Mono', monospace; padding: 20px; background: white; color: #000; }
            .container { max-width: 900px; margin: 0 auto; }
            
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 5px; }
            .header p { font-size: 11px; color: #666; }
            
            .voucher-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; padding: 15px; background: #fef3c7; border: 1px dashed #f59e0b; }
            .info-item { }
            .info-label { font-size: 9px; color: #f59e0b; font-weight: 700; text-transform: uppercase; margin-bottom: 3px; }
            .info-value { font-size: 12px; font-weight: 700; color: #000; }
            
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f59e0b; color: #000; padding: 10px 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; border: 1px dashed #000; }
            td { padding: 8px; border: 1px dashed #ccc; font-size: 11px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .amount { font-weight: 700; }
            .debit-col { color: #059669; }
            .credit-col { color: #dc2626; }
            
            .total-row { background: #fef3c7; font-weight: 700; }
            .total-row td { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 12px 8px; }
            
            .narration { margin: 20px 0; padding: 15px; background: #fffbeb; border: 1px dashed #f59e0b; border-left: 4px solid #f59e0b; }
            .narration-label { font-size: 9px; color: #f59e0b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
            .narration-text { font-size: 11px; color: #000; font-style: italic; }
            
            .footer { margin-top: 60px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
            .signature { text-align: center; border-top: 1px solid #000; padding-top: 8px; }
            .signature-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #666; }
            
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>EMPLOYEE COOPERATIVE CREDIT SOCIETY</h1>
              <p>JOURNAL / TRANSFER VOUCHER</p>
            </div>
            
            <div class="voucher-info">
              <div class="info-item">
                <div class="info-label">Voucher No</div>
                <div class="info-value">${voucherData.voucher_no}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date</div>
                <div class="info-value">${dayjs(voucherData.trans_date).format('DD-MMM-YYYY')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Type</div>
                <div class="info-value">JOURNAL</div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 100px;">MBNO</th>
                  <th>Name</th>
                  <th style="width: 80px;">Code</th>
                  <th>Name</th>
                  <th style="width: 120px;" class="text-right">Debit</th>
                  <th style="width: 120px;" class="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                ${voucherData.entries.map((entry) => `
                  <tr>
                    <td>${entry.member_code || '-'}</td>
                    <td>${entry.member_name || '-'}</td>
                    <td style="color: #f59e0b; font-weight: 700;">${entry.head_code}</td>
                    <td style="color: #3b82f6;">${entry.head_name}</td>
                    <td class="text-right amount debit-col">${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                    <td class="text-right amount credit-col">${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="4" class="text-right" style="text-transform: uppercase; letter-spacing: 1px;">TOTAL</td>
                  <td class="text-right amount debit-col">${formatCurrency(totalDebit)}</td>
                  <td class="text-right amount credit-col">${formatCurrency(totalCredit)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="narration">
              <div class="narration-label">Narration</div>
              <div class="narration-text">${voucherData.narration || 'No narration provided'}</div>
            </div>
            
            <div class="footer">
              <div class="signature">
                <div class="signature-label">Prepared By</div>
              </div>
              <div class="signature">
                <div class="signature-label">Checked By</div>
              </div>
              <div class="signature">
                <div class="signature-label">Authorized By</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const bg      = isDark ? 'bg-[#0f172a]'                  : 'bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/40';
  const panel   = isDark ? 'bg-[#1e293b] border-[#334155]' : 'bg-white/95 border-amber-200/60';
  const panelHd = isDark ? 'bg-[#263148] border-[#334155]' : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-200/50';
  const text    = isDark ? 'text-slate-100'                : 'text-slate-900';
  const muted   = isDark ? 'text-slate-400'                : 'text-slate-600';
  const border  = isDark ? 'border-[#334155]'              : 'border-amber-200/60';
  const infoBox = isDark ? 'bg-[#1a2744] border-amber-900/50' : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-400';
  const tblHd   = isDark ? 'bg-[#263148]'                 : 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200';
  const tblBdr  = isDark ? 'border-slate-600'              : 'border-gray-300';
  const tblBdrH = isDark ? 'border-slate-500'              : 'border-gray-400';
  const tblRow  = isDark ? 'hover:bg-amber-900/10'         : 'hover:bg-amber-50/50';
  const totalRow = isDark ? 'bg-[#263148]'                 : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50';
  const narBox  = isDark ? 'bg-[#1a2744] border-amber-900/50 border-l-amber-600' : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-400 border-l-amber-600';

  return (
    <ConfigProvider theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { colorPrimary: '#f59e0b', borderRadius: 8 } }}>
      <div className={`h-screen flex flex-col ${bg}`}>
        
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-3 py-2 flex items-center justify-between shadow-xl shrink-0 border-b-2 border-amber-800/50">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg shadow-inner">
              <BookOpen size={16} className="text-white" />
            </div>
            <div>
              <h1 className="fz-body font-black text-white tracking-tight leading-none">Journal / Transfer Voucher</h1>
              <p className="fz-caption font-extrabold text-amber-100 uppercase tracking-wider mt-0.5 opacity-90">Employee Cooperative Credit Society</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="text"
              size="small"
              icon={<Printer size={12} className="text-white" />}
              onClick={handlePrint}
              disabled={!voucherData}
              className="text-white hover:bg-white/20 font-black fz-caption uppercase tracking-wider h-7 px-2 disabled:opacity-40"
            >
              Print
            </Button>
            <Button
              type="text"
              size="small"
              icon={<Download size={12} className="text-white" />}
              onClick={exportToCSV}
              disabled={!voucherData}
              className="text-white hover:bg-white/20 font-black fz-caption uppercase tracking-wider h-7 px-2 disabled:opacity-40"
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Compact Main Content */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Compact Left Panel: Controls & Stats */}
          <div className="w-[260px] flex flex-col gap-2 shrink-0">

            {/* Parameters Card */}
            <div className={`${panel} backdrop-blur-xl border rounded-2xl overflow-hidden shadow-lg`}>
              <div className={`${panelHd} border-b px-2.5 py-1.5 flex items-center justify-between`}>
                <h3 className={`fz-caption font-black ${text} tracking-wider uppercase flex items-center gap-1`}>
                  <Settings size={11} className="text-amber-600" />
                  Parameters
                </h3>
                <Tooltip title="Reload">
                  <Button type="text" size="small" icon={<RefreshCw size={10} />} onClick={fetchVoucherList} className="h-5 w-5" />
                </Tooltip>
              </div>

              <div className="p-2.5 space-y-2">
                <div className="space-y-1">
                  <label className={`fz-caption font-black ${muted} uppercase tracking-wider`}>Select Voucher</label>
                  <Select
                    value={selectVoucher}
                    onChange={handleVoucherSelect}
                    className="w-full compact-select"
                    placeholder="Choose voucher..."
                    showSearch
                    optionFilterProp="children"
                    loading={isLoading}
                    size="small"
                    style={{ fontWeight: 700 }}
                  >
                    {voucherList.map(v => (
                      <Option key={v} value={v}>
                        <span className="font-bold fz-label">{v}</span>
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* Compact Stats Grid */}
            {voucherData && (
              <div className="grid grid-cols-1 gap-1.5">
                <div className={`${panel} backdrop-blur-xl border rounded-xl p-2 shadow-md hover:shadow-lg transition-shadow group`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className={`fz-caption font-black uppercase tracking-wider ${muted}`}>Voucher No</div>
                    <Calculator size={10} className={`${isDark ? 'text-slate-600' : 'text-slate-300'} group-hover:text-amber-500 transition-colors`} />
                  </div>
                  <div className={`fz-body font-black ${text} font-mono`}>{voucherData.voucher_no}</div>
                </div>

                <div className={`${panel} backdrop-blur-xl border rounded-xl p-2 shadow-md hover:shadow-lg transition-shadow group`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className={`fz-caption font-black uppercase tracking-wider ${muted}`}>Date</div>
                    <Calculator size={10} className={`${isDark ? 'text-slate-600' : 'text-slate-300'} group-hover:text-amber-500 transition-colors`} />
                  </div>
                  <div className={`fz-label font-black ${text}`}>{dayjs(voucherData.trans_date).format('DD-MMM-YYYY')}</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-xl p-2 text-white shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden group">
                  <TrendingUp size={40} className="absolute -right-1 -bottom-1 opacity-10" />
                  <div className="fz-caption font-black uppercase tracking-wider opacity-95 mb-0.5">Total Debit</div>
                  <div className="fz-body font-black font-mono relative z-10">₹{formatCurrency(totalDebit)}</div>
                </div>

                <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 rounded-xl p-2 text-white shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden group">
                  <TrendingDown size={40} className="absolute -right-1 -bottom-1 opacity-10" />
                  <div className="fz-caption font-black uppercase tracking-wider opacity-95 mb-0.5">Total Credit</div>
                  <div className="fz-body font-black font-mono relative z-10">₹{formatCurrency(totalCredit)}</div>
                </div>

                <div className={`rounded-xl p-2 text-white shadow-lg hover:shadow-xl transition-shadow ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800' : 'bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800'}`}>
                  <div className="fz-caption font-black uppercase tracking-wider opacity-95 mb-0.5">Balance Status</div>
                  <div className="fz-body font-black">
                    {Math.abs(totalDebit - totalCredit) < 0.01 ? '✓ BALANCED' : '✗ UNBALANCED'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Report Display */}
          <div className={`flex-1 ${panel} backdrop-blur-xl border rounded-2xl shadow-xl overflow-hidden flex flex-col`}>

            <div className="flex-1 overflow-auto p-3 custom-scrollbar">
              {voucherData ? (
                <div>
                  {/* Company Header */}
                  <div className={`text-center border-b-2 border-dashed ${isDark ? 'border-slate-600' : 'border-gray-800'} pb-2 mb-3`}>
                    <h1 className={`fz-body font-black ${text} tracking-tight`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      EMPLOYEE COOPERATIVE CREDIT SOCIETY
                    </h1>
                    <p className={`fz-caption font-bold ${muted} mt-0.5 tracking-wider`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      JOURNAL / TRANSFER VOUCHER
                    </p>
                  </div>

                  {/* Voucher Info */}
                  <div className={`grid grid-cols-3 gap-2 mb-3 p-2 ${infoBox} border border-dashed rounded-lg shadow-sm`}>
                    {[
                      { label: 'Voucher No', value: voucherData.voucher_no },
                      { label: 'Date', value: dayjs(voucherData.trans_date).format('DD-MMM-YYYY') },
                      { label: 'Type', value: 'JOURNAL' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="fz-caption font-black text-amber-500 uppercase mb-0.5 tracking-wider">{item.label}</div>
                        <div className={`fz-label font-black ${text}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Legacy Table */}
                  <div className={`border ${tblBdrH} rounded-lg overflow-hidden mb-3 shadow-md`}>
                    <table className="w-full" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>
                      <thead>
                        <tr className={tblHd}>
                          <th className={`px-1.5 py-1.5 text-left font-black border ${tblBdrH} ${text} uppercase tracking-wider`} style={{ width: '90px' }}>MBNO</th>
                          <th className={`px-1.5 py-1.5 text-left font-black border ${tblBdrH} ${text} uppercase tracking-wider`}>Name</th>
                          <th className={`px-1.5 py-1.5 text-left font-black border ${tblBdrH} ${text} uppercase tracking-wider`} style={{ width: '70px' }}>Code</th>
                          <th className={`px-1.5 py-1.5 text-left font-black border ${tblBdrH} ${text} uppercase tracking-wider`}>Name</th>
                          <th className={`px-1.5 py-1.5 text-right font-black border ${tblBdrH} ${text} uppercase tracking-wider`} style={{ width: '110px' }}>Debit</th>
                          <th className={`px-1.5 py-1.5 text-right font-black border ${tblBdrH} ${text} uppercase tracking-wider`} style={{ width: '110px' }}>Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucherData.entries.map((entry, index) => (
                          <tr key={index} className={`${tblRow} transition-colors`}>
                            <td className={`px-1.5 py-1 border ${tblBdr} ${muted} font-semibold`}>{entry.member_code || ''}</td>
                            <td className={`px-1.5 py-1 border ${tblBdr} ${text} font-semibold`}>{entry.member_name || ''}</td>
                            <td className={`px-1.5 py-1 border ${tblBdr} font-black text-amber-500`}>{entry.head_code}</td>
                            <td className={`px-1.5 py-1 border ${tblBdr} font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{entry.head_name}</td>
                            <td className="px-1.5 py-1 border-gray-300 text-right font-black text-emerald-500">
                              {entry.debit > 0 ? formatCurrency(entry.debit) : ''}
                            </td>
                            <td className="px-1.5 py-1 text-right font-black text-rose-500">
                              {entry.credit > 0 ? formatCurrency(entry.credit) : ''}
                            </td>
                          </tr>
                        ))}
                        <tr className={`${totalRow} font-black`}>
                          <td colSpan={4} className={`px-1.5 py-1.5 text-right border-t-2 border-b-2 ${isDark ? 'border-slate-500' : 'border-gray-800'} uppercase fz-caption tracking-wider ${text}`}>
                            TOTAL
                          </td>
                          <td className={`px-1.5 py-1.5 text-right border-t-2 border-b-2 ${isDark ? 'border-slate-500' : 'border-gray-800'} text-emerald-500 font-black`}>
                            {formatCurrency(totalDebit)}
                          </td>
                          <td className={`px-1.5 py-1.5 text-right border-t-2 border-b-2 ${isDark ? 'border-slate-500' : 'border-gray-800'} text-rose-500 font-black`}>
                            {formatCurrency(totalCredit)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Narration */}
                  <div className={`p-2 ${narBox} border border-dashed border-l-4 rounded-lg shadow-sm`}>
                    <div className="fz-caption font-black text-amber-500 uppercase mb-1 tracking-wider">Narration</div>
                    <div className={`fz-caption ${isDark ? 'text-slate-300' : 'text-gray-700'} italic leading-relaxed font-semibold`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {voucherData.narration || 'No narration provided'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 select-none">
                  <div className={`w-20 h-20 ${isDark ? 'bg-amber-900/30' : 'bg-gradient-to-br from-amber-100 via-orange-100 to-amber-100'} rounded-full flex items-center justify-center mb-3 shadow-xl`}>
                    <BookOpen size={40} className="text-amber-500" />
                  </div>
                  <h3 className={`fz-body font-black ${muted} uppercase tracking-wider mb-1.5`}>No Voucher Selected</h3>
                  <p className={`fz-label font-bold ${muted} max-w-xs leading-relaxed`}>
                    Select a journal voucher from the sidebar to view its details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .compact-select .ant-select-selector {
          height: 28px !important;
          border-radius: 8px !important;
          border: 2px solid #fbbf24 !important;
          font-weight: 700 !important;
          font-size: 11px !important;
        }
        .compact-select .ant-select-selector:hover {
          border-color: #f59e0b !important;
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.1) !important;
        }
        .compact-select.ant-select-focused .ant-select-selector {
          border-color: #f59e0b !important;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.15) !important;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(251, 191, 36, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #f59e0b, #ea580c);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #ea580c, #dc2626);
        }
        
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </ConfigProvider>
  );
};

export default JournalTransferVoucher;
