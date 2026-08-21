import React, { useState, useEffect } from 'react';
import { Radio, DatePicker, ConfigProvider, Button, Spin, Tooltip, theme as antdTheme } from 'antd';
import {
  Printer,
  FileDown,
  BookOpen,
  ShieldCheck,
  Settings,
  RefreshCw,
  Database,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

interface CashBookData {
  key: string;
  code: string;
  headName: string;
  receipt: number;
  payment: number;
}

const CashBookMonthly: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(dayjs());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [data, setData] = useState<CashBookData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    fetchCashBookData();
  }, [selectedMonth]);

  const fetchCashBookData = async () => {
    if (!selectedMonth) return;
    setLoading(true);

    const month = selectedMonth.format('MMM');
    const year = selectedMonth.year();

    try {
      const response = await apiService.getCashBookMonthly(month, year);
      if (response.success && response.data && Array.isArray(response.data.data)) {
        setData(response.data.data);
        setOpeningBalance(parseFloat(response.data.openingBalance) || 0);
        setClosingBalance(parseFloat(response.data.closingBalance) || 0);
      } else {
        setData([]);
        setOpeningBalance(0);
        setClosingBalance(0);
      }
    } catch (error) {
      console.error('Error fetching cash book data:', error);
      await showDialog('error', 'Fetch Error', 'Failed to fetch data from server');
      setData([]);
      setOpeningBalance(0);
      setClosingBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalReceipt = data.reduce((sum, item) => sum + (Number(item.receipt) || 0), 0);
    const totalPayment = data.reduce((sum, item) => sum + (Number(item.payment) || 0), 0);
    return { totalReceipt, totalPayment };
  };

  const { totalReceipt, totalPayment } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'No Data', 'No data to export');
      return;
    }

    try {
      let csvContent = '';
      
      csvContent += 'Espat Karmchari Co-Operative Credit Society Limited\n';
      csvContent += 'Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006\n';
      csvContent += 'Reg No : A.R/DRG/1796, Tel No : 0788-2298736\n\n';
      csvContent += 'CASH BOOK MONTHLY REPORT\n';
      csvContent += `Period: ${selectedMonth?.format('MMMM YYYY') || '-'}\n\n`;
      
      csvContent += 'Code,Head Name,Receipt,Payment\n';
      
      data.forEach(item => {
        csvContent += `${item.code},"${item.headName}",${item.receipt},${item.payment}\n`;
      });
      
      csvContent += `\nTotal,,${totalReceipt},${totalPayment}\n`;
      csvContent += `\nOpening Balance,,${openingBalance},\n`;
      csvContent += `Total (Opening + Receipts),,${openingBalance + totalReceipt},\n`;
      csvContent += `Closing Balance (Total - Payments),,${closingBalance},\n`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `CashBookMonthly_${selectedMonth?.format('YYYY-MM')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      await showDialog('info', 'Export Done', 'CSV exported successfully');
    } catch (error) {
      await showDialog('error', 'Export Error', 'Failed to export CSV');
      console.error('Export error:', error);
    }
  };

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
              <BookOpen size={18} />
            </div>
            <div>
              <h1 className={`fz-body font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Cash Book Monthly</h1>
              <div className={`flex items-center gap-1.5 mt-0.5 fz-caption font-bold uppercase tracking-wide leading-none ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                <ShieldCheck size={10} className="text-indigo-500" /> Monthly Summary
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<Printer size={13} />}
              size="small"
              className="h-8 px-3 rounded-lg fz-caption font-black uppercase tracking-wide border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all"
              onClick={handlePrint}
              disabled={data.length === 0}
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<FileDown size={13} />}
              size="small"
              className="h-8 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg fz-caption font-black uppercase tracking-wide shadow-md transition-all"
              onClick={handleExportCSV}
              disabled={data.length === 0}
            >
              CSV
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
                <h3 className={`fz-caption font-black tracking-wide uppercase flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Settings size={12} className="text-indigo-600" />
                  Parameters
                </h3>
                <Tooltip title="Reload">
                  <Button type="text" size="small" icon={<RefreshCw size={11} />} onClick={fetchCashBookData} className="h-6 w-6" />
                </Tooltip>
              </div>

              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <label className={`fz-caption font-black uppercase tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Month</label>
                  <DatePicker
                    picker="month"
                    className="w-full h-8 fz-label font-bold"
                    value={selectedMonth}
                    onChange={v => v && setSelectedMonth(v)}
                    format="MMMM YYYY"
                    allowClear={false}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`fz-caption font-black uppercase tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Output</label>
                  <Radio.Group
                    size="small"
                    value={outputType}
                    onChange={e => setOutputType(e.target.value)}
                    className="w-full cashbook-radio-compact"
                  >
                    <Radio.Button value="screen" className="w-1/2 text-center">Screen</Radio.Button>
                    <Radio.Button value="printer" className="w-1/2 text-center">Print</Radio.Button>
                  </Radio.Group>
                </div>
              </div>
            </div>

            {/* Compact Stats Grid */}
            {data.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                <div className={`rounded-lg p-3 shadow-sm hover:shadow-md transition-all group border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`fz-caption font-black uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Net Balance</div>
                    <Calculator size={12} className={`group-hover:text-indigo-400 transition-colors ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  </div>
                  <div className={`fz-heading font-black font-mono ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>₹{formatCurrency(totalReceipt - totalPayment)}</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                  <TrendingUp size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                  <div className="fz-caption font-black uppercase tracking-wide opacity-90 mb-0.5">Receipts</div>
                  <div className="fz-heading font-black font-mono relative z-10">₹{formatCurrency(totalReceipt)}</div>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                  <TrendingDown size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                  <div className="fz-caption font-black uppercase tracking-wide opacity-90 mb-0.5">Payments</div>
                  <div className="fz-heading font-black font-mono relative z-10">₹{formatCurrency(totalPayment)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Compact Report Panel with Scroll */}
          <div className={`flex-1 rounded-xl shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
            <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-indigo-50/50 border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-100'}`}>
                  <Database size={14} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className={`fz-label font-black uppercase tracking-wide leading-none ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Monthly Ledger</h3>
                  <p className={`fz-caption font-bold uppercase mt-0.5 tracking-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{selectedMonth?.format('MMMM YYYY')}</p>
                </div>
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-3 custom-scrollbar-compact ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} tip="Loading..." size="small">
                {data.length > 0 ? (
                  <div className="legacy-report-compact fz-caption">
                    {/* Company Header - Legacy Style */}
                    <div className="text-center mb-4 pb-3" style={{ borderBottom: `2px solid ${isDark ? '#4b5563' : '#999'}` }}>
                      <div className={`fz-body font-bold ${isDark ? 'text-indigo-400' : 'text-blue-700'}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className={`fz-caption ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                    </div>

                    {/* Report Title */}
                    <div className="text-center mb-3">
                      <div className={`fz-caption font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Select For the Month: <span className={isDark ? 'text-indigo-400' : 'text-blue-700'}>{selectedMonth?.format('MMM-YYYY')}</span>
                      </div>
                    </div>

                    {/* Legacy Table - Matching MSSQL Format */}
                    <table className="w-full fz-caption border-collapse" style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                      <thead>
                        <tr style={{ backgroundColor: isDark ? '#1f2937' : '#e8e8e8' }}>
                          <th className={`text-left py-2 px-3 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}`, width: '100px' }}>CODE</th>
                          <th className={`text-left py-2 px-3 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}>HEAD NAME</th>
                          <th className={`text-right py-2 px-3 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}`, width: '150px' }}>RECEIPT</th>
                          <th className={`text-right py-2 px-3 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}`, width: '150px' }}>PAYMENT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, idx) => (
                          <tr key={idx} style={{ backgroundColor: isDark ? (idx % 2 === 0 ? '#1e293b' : '#0f172a') : (idx % 2 === 0 ? '#fff' : '#f9f9f9') }}>
                            <td className={`py-1.5 px-3 font-semibold ${isDark ? 'text-indigo-400' : 'text-blue-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#ccc'}` }}>{item.code}</td>
                            <td className={`py-1.5 px-3 font-semibold ${isDark ? 'text-indigo-400' : 'text-blue-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#ccc'}` }}>{item.headName}</td>
                            <td className={`text-right py-1.5 px-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#ccc'}` }}>
                              {item.receipt > 0 ? formatCurrency(item.receipt) : '0.00'}
                            </td>
                            <td className={`text-right py-1.5 px-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#ccc'}` }}>
                              {item.payment > 0 ? formatCurrency(item.payment) : '0.00'}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: isDark ? '#1e293b' : '#fff' }}>
                          <td colSpan={2} className="py-2 px-3" style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}></td>
                          <td className={`text-right py-2 px-3 font-black fz-body ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                            {formatCurrency(totalReceipt)}
                          </td>
                          <td className={`text-right py-2 px-3 font-black fz-body ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                            {formatCurrency(totalPayment)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Summary - Legacy Style */}
                    <div className="mt-4">
                      <table className="fz-caption ml-auto" style={{ width: 'auto' }}>
                        <tbody>
                          <tr>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Opening Balance :</td>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`} style={{ minWidth: '150px' }}>
                              {formatCurrency(openingBalance)}
                            </td>
                          </tr>
                          <tr>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Total Credit :</td>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`}>
                              {formatCurrency(totalReceipt)}
                            </td>
                          </tr>
                          <tr style={{ borderTop: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Total :</td>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {formatCurrency(openingBalance + totalReceipt)}
                            </td>
                          </tr>
                          <tr>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Total Debit :</td>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`}>
                              {formatCurrency(totalPayment)}
                            </td>
                          </tr>
                          <tr style={{ borderTop: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                            <td className={`text-right py-1 px-4 font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Closing Balance :</td>
                            <td className={`text-right py-1 px-4 font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                              {formatCurrency(closingBalance)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <FileText size={60} className={`mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                    <h3 className={`fz-label font-black uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No Transactions</h3>
                    <p className={`fz-caption font-bold uppercase mt-1.5 text-center max-w-[180px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>No data for {selectedMonth?.format('MMMM YYYY')}</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className={`px-4 py-2 flex items-center justify-between shrink-0 border-t ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <span className={`fz-caption font-black uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Financial Ledger v2</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`fz-caption font-bold uppercase tracking-tight ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>Index: {selectedMonth?.format('YYYYMM')}</span>
            <div className={`w-px h-2.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className={`px-2 py-0.5 rounded fz-caption font-black uppercase tabular-nums tracking-wide ${isDark ? 'bg-slate-700 text-indigo-400' : 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-600'}`}>
              v5.2.0
            </div>
          </div>
        </div>
      </div>

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
        
        .legacy-report-compact {
          max-width: 100%;
          margin: 0 auto;
        }
        
        .cashbook-radio-compact .ant-radio-button-wrapper {
          font-size: 10px !important;
          font-weight: 900 !important;
          padding: 0 8px !important;
          height: 28px !important;
          line-height: 26px !important;
        }

        @media print {
           * { 
             margin: 0;
             padding: 0;
             box-sizing: border-box;
           }
           
           body {
             margin: 0;
             padding: 0;
           }
           
           body * { 
             visibility: hidden; 
           }
           
           .legacy-report-compact, .legacy-report-compact * { 
             visibility: visible; 
           }
           
           .legacy-report-compact { 
             position: absolute;
             left: 50% !important;
             top: 0 !important;
             transform: translateX(-50%) !important;
             width: 7.5in !important;
             max-width: 7.5in !important; 
             margin: 0 auto !important;
             padding: 0.5in !important;
             font-size: 10pt !important;
             background: white !important;
           }
           
           .h-screen { 
             height: auto !important; 
             overflow: visible !important; 
           }
           
           button, .ant-btn, .ant-spin { 
             display: none !important; 
           }
           
           @page {
             margin: 0.5in;
             size: A4 portrait;
           }
           
           table { 
             page-break-inside: auto;
             width: 100%;
           }
           
           tr { 
             page-break-inside: avoid; 
             page-break-after: auto; 
           }
        }
      `}</style>
    </ConfigProvider>
  );
};

export default CashBookMonthly;
