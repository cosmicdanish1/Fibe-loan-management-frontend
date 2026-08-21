import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Radio, Button, ConfigProvider, Spin, Tooltip, Pagination, theme as antdTheme } from 'antd';
import {
  Printer,
  FileDown,
  ShieldAlert,
  Settings,
  RefreshCw,
  Database,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  Search,
  AlertTriangle,
  Users
} from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};


interface DefaulterRecord {
  key: string;
  memberNo: string;
  memberName: string;
  officeName: string;
  loanType: string;
  loanCaseNo: string;
  loanAmount: number;
  balance: number;
  installments: number;
  lastPaymentDate: string;
  monthsOverdue: number;
  penalDue: number;
}

interface DefaulterResponse {
  metadata: {
    totalCount: number;
    limit: number;
    offset: number;
  };
  data: DefaulterRecord[];
}

const DefaulterList: React.FC = () => {
  const [data, setData] = useState<DefaulterRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [minBalance, setMinBalance] = useState<number>(10000); // Higher default to reduce data
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50); // Smaller page size
  const [totalCount, setTotalCount] = useState<number>(0);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // useRef avoids stale-closure bug: state-based timeout ref would capture stale value in useCallback
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDefaulterList();
  }, [currentPage, pageSize]);

  // Debounced search when minBalance changes
  const debouncedSearch = useCallback((balance: number) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchDefaulterList(balance);
    }, 500);
  }, []);

  const fetchDefaulterList = async (balance?: number) => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const response = await apiService.getDefaulterList(balance || minBalance, pageSize, offset);
      console.log('Defaulter List Response:', response);

      if (response.success && response.data) {
        const responseData = response.data as DefaulterResponse;
        setData(responseData.data || []);
        setTotalCount(responseData.metadata?.totalCount || 0);
      } else {
        setData([]);
        setTotalCount(0);
        await showDialog('warning', 'No Data', 'No defaulter data found');
      }
    } catch (error) {
      console.error('Error fetching defaulter list:', error);
      await showDialog('error', 'Fetch Error', 'Failed to load defaulter list');
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Memoized calculations for performance
  const { totalLoanAmount, totalOutstanding, totalPenalDue } = useMemo(() => {
    const totalLoanAmount = data.reduce((sum, item) => sum + (Number(item.loanAmount) || 0), 0);
    const totalOutstanding = data.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
    const totalPenalDue = data.reduce((sum, item) => sum + (Number(item.penalDue) || 0), 0);
    return { totalLoanAmount, totalOutstanding, totalPenalDue };
  }, [data]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const handleMinBalanceChange = useCallback((value: number) => {
    setMinBalance(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handlePageChange = useCallback((page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
  }, [pageSize]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExportCSV = useCallback(async () => {
    if (data.length === 0) {
      await showDialog('warning', 'No Data', 'No data to export');
      return;
    }

    try {
      let csvContent = '';
      
      csvContent += 'Espat Karmchari Co-Operative Credit Society Limited\n';
      csvContent += 'Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006\n';
      csvContent += 'Reg No : A.R/DRG/1796, Tel No : 0788-2298736\n\n';
      csvContent += 'DEFAULTER LIST REPORT\n';
      csvContent += `Minimum Balance: ₹${formatCurrency(minBalance)}\n`;
      csvContent += `Page: ${currentPage} of ${Math.ceil(totalCount / pageSize)}\n\n`;
      
      csvContent += 'Member No,Member Name,Office,Loan Type,Case No,Loan Amount,Outstanding Balance,Installments,Months Overdue,Penal Due\n';

      data.forEach(item => {
        csvContent += `${item.memberNo},"${item.memberName}","${item.officeName || ''}",${item.loanType},${item.loanCaseNo},${item.loanAmount},${item.balance},${item.installments},${item.monthsOverdue || 0},${item.penalDue || 0}\n`;
      });

      csvContent += `\nPage Total,,,,${totalLoanAmount},${totalOutstanding},,,${totalPenalDue}\n`;
      csvContent += `Total Records: ${totalCount}\n`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `DefaulterList_Page${currentPage}_${minBalance}_${dayjs().format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      await showDialog('info', 'Export Done', 'CSV exported successfully');
    } catch (error) {
      await showDialog('error', 'Export Error', 'Failed to export CSV');
      console.error('Export error:', error);
    }
  }, [data, formatCurrency, minBalance, currentPage, totalCount, pageSize, totalLoanAmount, totalOutstanding, totalPenalDue]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#dc2626',
          borderRadius: 8,
          fontSize: 13,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <div className={`h-screen flex flex-col font-sans selection:bg-red-200/60 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-red-50/40 to-rose-50/30'}`}>
        {/* Enhanced Header with Better Typography */}
        <div className={`px-5 py-3 flex items-center justify-between z-10 shadow-lg shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 backdrop-blur-md border-red-200/60 shadow-red-100/20'}`}>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-rose-700 p-2.5 rounded-xl text-white shadow-lg shadow-red-600/30">
              <ShieldAlert size={20} className="drop-shadow-sm" />
            </div>
            <div>
              <h1 className={`fz-heading font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Defaulter List</h1>
              <div className="flex items-center gap-2 mt-1 fz-caption font-black text-red-700 uppercase tracking-wider leading-none">
                <AlertTriangle size={11} className="text-red-600" /> 
                <span>Risk Management System</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              icon={<Printer size={14} />}
              size="middle"
              className="h-9 px-4 rounded-xl fz-caption font-black uppercase tracking-wide border-red-200 hover:border-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
              onClick={handlePrint}
              disabled={data.length === 0}
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<FileDown size={14} />}
              size="middle"
              className="h-9 px-5 bg-gradient-to-r from-red-600 via-red-700 to-rose-700 hover:from-red-700 hover:via-red-800 hover:to-rose-800 rounded-xl fz-caption font-black uppercase tracking-wide shadow-lg shadow-red-600/30 transition-all duration-200"
              onClick={handleExportCSV}
              disabled={data.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Enhanced Main Content with Better Layout */}
        <div className="flex-1 overflow-hidden p-4 flex gap-4">

          {/* Enhanced Left Panel: Controls & Stats */}
          <div className="w-[300px] flex flex-col gap-4 shrink-0">

            {/* Enhanced Parameters Card */}
            <div className={`backdrop-blur-md border rounded-2xl overflow-hidden shadow-lg shadow-red-100/20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-red-200/60'}`}>
              <div className={`border-b px-4 py-3 flex items-center justify-between ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-red-50 via-rose-50/50 to-red-50 border-red-100'}`}>
                <h3 className="fz-caption font-black text-red-800 tracking-wider uppercase flex items-center gap-2">
                  <Settings size={13} className="text-red-700" />
                  Filter Parameters
                </h3>
                <Tooltip title="Refresh Data">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<RefreshCw size={12} />} 
                    onClick={fetchDefaulterList} 
                    className="h-7 w-7 hover:bg-red-100 rounded-lg transition-colors" 
                  />
                </Tooltip>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="fz-caption font-black text-slate-600 uppercase tracking-wider">Minimum Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-600 font-black fz-label">₹</span>
                    <input
                      type="number"
                      value={minBalance}
                      onChange={(e) => handleMinBalanceChange(Number(e.target.value) || 0)}
                      className={`w-full h-9 pl-8 pr-3 fz-label font-semibold border rounded-lg focus:outline-none focus:ring-2 transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-white focus:border-red-500 focus:ring-red-500/20' : 'bg-white border-red-200 text-slate-800 focus:border-red-500 focus:ring-red-200'}`}
                      placeholder="Enter minimum balance"
                    />
                  </div>
                  <div className="fz-caption text-slate-500 font-medium">
                    Higher values load faster
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="fz-caption font-black text-slate-600 uppercase tracking-wider">Output Format</label>
                  <Radio.Group
                    size="middle"
                    value={outputType}
                    onChange={e => setOutputType(e.target.value)}
                    className="w-full enhanced-radio"
                  >
                    <Radio.Button value="screen" className="w-1/2 text-center font-semibold">Screen</Radio.Button>
                    <Radio.Button value="printer" className="w-1/2 text-center font-semibold">Print</Radio.Button>
                  </Radio.Group>
                </div>

                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<Search size={14} />}
                  onClick={() => fetchDefaulterList()}
                  loading={loading}
                  className="h-11 bg-gradient-to-r from-red-600 via-red-700 to-rose-700 hover:from-red-700 hover:via-red-800 hover:to-rose-800 font-black uppercase tracking-wider fz-caption mt-2 shadow-lg shadow-red-600/30 rounded-xl"
                >
                  Generate Report
                </Button>
              </div>
            </div>

            {/* Performance Stats */}
            <div className={`backdrop-blur-md border rounded-2xl overflow-hidden shadow-lg shadow-red-100/20 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-red-200/60'}`}>
              <div className={`border-b px-4 py-3 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-red-50 via-rose-50/50 to-red-50 border-red-100'}`}>
                <h3 className="fz-caption font-black text-red-800 tracking-wider uppercase flex items-center gap-2">
                  <Database size={13} className="text-red-700" />
                  Data Overview
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="fz-caption font-black text-slate-600 uppercase">Total Records:</span>
                  <span className="fz-caption font-black text-red-700">{totalCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="fz-caption font-black text-slate-600 uppercase">Current Page:</span>
                  <span className="fz-caption font-black text-slate-700">{currentPage} of {Math.ceil(totalCount / pageSize)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="fz-caption font-black text-slate-600 uppercase">Page Size:</span>
                  <span className="fz-caption font-black text-slate-700">{pageSize} records</span>
                </div>
              </div>
            </div>

            {/* Enhanced Stats Grid with Better Visual Hierarchy */}
            {data.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                <div className={`rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 group border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-md border-red-200/60 shadow-red-100/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="fz-caption font-black uppercase tracking-wider text-red-700">Total Defaulters</div>
                    <Users size={14} className="text-red-400 group-hover:text-red-600 transition-colors" />
                  </div>
                  <div className={`text-2xl font-black font-mono tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{data.length}</div>
                  <div className="fz-caption font-black text-red-600 uppercase mt-1 tracking-wider">MEMBERS</div>
                </div>

                <div className="bg-gradient-to-br from-slate-500 via-slate-600 to-gray-600 rounded-xl p-4 text-white shadow-lg shadow-slate-500/30 hover:shadow-xl hover:shadow-slate-500/40 transition-all duration-300 relative overflow-hidden group">
                  <TrendingUp size={60} className="absolute -right-3 -bottom-3 opacity-10 group-hover:scale-110 transition-transform duration-300" />
                  <div className="fz-caption font-black uppercase tracking-wider opacity-90 mb-1">Total Loan Amount</div>
                  <div className="fz-heading font-black font-mono relative z-10 tracking-tight">₹{formatCurrency(totalLoanAmount)}</div>
                </div>

                <div className="bg-gradient-to-br from-red-500 via-red-600 to-rose-600 rounded-xl p-4 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300 relative overflow-hidden group">
                  <TrendingDown size={60} className="absolute -right-3 -bottom-3 opacity-10 group-hover:scale-110 transition-transform duration-300" />
                  <div className="fz-caption font-black uppercase tracking-wider opacity-90 mb-1">Outstanding Amount</div>
                  <div className="fz-heading font-black font-mono relative z-10 tracking-tight">₹{formatCurrency(totalOutstanding)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Report Panel with Better Layout */}
          <div className={`flex-1 rounded-2xl shadow-lg flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-md border-red-200/60 shadow-red-100/20'}`}>
            <div className={`border-b px-5 py-3 flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-red-50 via-rose-50/50 to-red-50 border-red-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-red-100'}`}>
                  <Database size={16} className="text-red-700" />
                </div>
                <div>
                  <h3 className="fz-body font-black text-red-800 uppercase tracking-wider leading-none">Defaulter Report</h3>
                  <p className="fz-caption font-black text-red-600 uppercase mt-1 tracking-wider">
                    Min Balance: ₹{formatCurrency(minBalance)} | Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                  </p>
                </div>
              </div>
              {data.length === 0 && !loading && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle size={14} />
                  <span className="fz-caption font-black uppercase tracking-wider">No Data</span>
                </div>
              )}
            </div>

            <div className={`flex-1 overflow-auto p-4 enhanced-scrollbar ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} tip="Loading defaulter data..." size="large">
                {data.length > 0 ? (
                  <div className="legacy-report-enhanced fz-label">
                    {/* Enhanced Company Header */}
                    <div className="text-center mb-6 pb-4 border-b-2 border-red-200">
                      <div className="fz-body font-black text-blue-800 mb-1">Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className="fz-label text-slate-700 font-medium">Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                      <div className="fz-caption text-slate-600 font-medium mt-1">Reg No: A.R/DRG/1796, Tel No: 0788-2298736</div>
                    </div>

                    {/* Enhanced Report Title */}
                    <div className="text-center mb-5">
                      <div className="fz-body font-black text-red-800 mb-2">
                        DEFAULTER LIST REPORT
                      </div>
                      <div className="fz-label text-slate-700 font-semibold">
                        Minimum Balance: ₹{formatCurrency(minBalance)} | Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                      </div>
                      <div className="fz-caption text-slate-600 font-medium mt-1">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
                      </div>
                    </div>

                    {/* Enhanced Legacy Table */}
                    <table className="w-full fz-label border-collapse shadow-sm" style={{ border: '2px solid #dc2626' }}>
                      <thead>
                        <tr style={{ backgroundColor: isDark ? '#1f2937' : '#fef2f2' }}>
                          <th className="text-left py-3 px-4 font-black text-red-900" style={{ border: '1px solid #dc2626', width: '80px' }}>SR NO</th>
                          <th className="text-left py-3 px-4 font-black text-red-900" style={{ border: '1px solid #dc2626', width: '100px' }}>MEMBER NO</th>
                          <th className="text-left py-3 px-4 font-black text-red-900" style={{ border: '1px solid #dc2626' }}>MEMBER NAME</th>
                          <th className="text-left py-3 px-4 font-black text-red-900" style={{ border: '1px solid #dc2626', width: '100px' }}>LOAN TYPE</th>
                          <th className="text-left py-3 px-4 font-black text-red-900" style={{ border: '1px solid #dc2626', width: '100px' }}>CASE NO</th>
                          <th className="text-right py-3 px-4 font-black text-red-900" style={{ border: '1px solid #dc2626', width: '130px' }}>LOAN AMOUNT</th>
                          <th className="text-right py-3 px-4 font-black text-red-900" style={{ border: '1px solid #dc2626', width: '130px' }}>OUTSTANDING</th>
                          <th className="text-center py-3 px-4 font-black text-red-900" style={{ border: '1px solid #dc2626', width: '90px' }}>OVERDUE</th>
                          <th className="text-right py-3 px-4 font-black text-red-900" style={{ border: '1px solid #dc2626', width: '110px' }}>PENAL DUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, idx) => (
                           <tr key={`${item.memberNo}-${item.loanCaseNo}`} style={{ backgroundColor: isDark ? (idx % 2 === 0 ? '#1e293b' : '#0f172a') : (idx % 2 === 0 ? '#fff' : '#fefbfb') }} className="hover:bg-red-50/50 transition-colors">
                            <td className="py-2.5 px-4 text-slate-800 font-bold text-center" style={{ border: '1px solid #e5e7eb' }}>
                              {((currentPage - 1) * pageSize) + idx + 1}
                            </td>
                            <td className="py-2.5 px-4 text-blue-700 font-bold" style={{ border: '1px solid #e5e7eb' }}>
                              {item.memberNo}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 font-medium" style={{ border: '1px solid #e5e7eb' }}>
                              {item.memberName}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 font-bold" style={{ border: '1px solid #e5e7eb' }}>
                              {item.loanType}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 font-bold" style={{ border: '1px solid #e5e7eb' }}>
                              {item.loanCaseNo}
                            </td>
                            <td className="text-right py-2.5 px-4 font-bold text-slate-700" style={{ border: '1px solid #e5e7eb' }}>
                              {formatCurrency(item.loanAmount)}
                            </td>
                            <td className="text-right py-2.5 px-4 font-bold text-red-700" style={{ border: '1px solid #e5e7eb' }}>
                              {formatCurrency(item.balance)}
                            </td>
                            <td className="text-center py-2.5 px-4 font-bold text-orange-700" style={{ border: '1px solid #e5e7eb' }}>
                              {item.monthsOverdue > 0 ? `${item.monthsOverdue}mo` : '—'}
                            </td>
                            <td className="text-right py-2.5 px-4 font-bold text-red-700" style={{ border: '1px solid #e5e7eb' }}>
                              {item.penalDue > 0 ? formatCurrency(item.penalDue) : '—'}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: isDark ? '#1e293b' : '#fef2f2' }}>
                          <td colSpan={5} className="py-3 px-4 text-right font-black text-red-900 fz-heading" style={{ border: '2px solid #dc2626' }}>
                            PAGE TOTAL:
                          </td>
                          <td className="text-right py-3 px-4 font-black text-slate-800 fz-heading" style={{ border: '2px solid #dc2626' }}>
                            {formatCurrency(totalLoanAmount)}
                          </td>
                          <td className="text-right py-3 px-4 font-black text-red-800 fz-heading" style={{ border: '2px solid #dc2626' }}>
                            {formatCurrency(totalOutstanding)}
                          </td>
                          <td className="py-3 px-4" style={{ border: '2px solid #dc2626' }}></td>
                          <td className="text-right py-3 px-4 font-black text-red-800 fz-heading" style={{ border: '2px solid #dc2626' }}>
                            {formatCurrency(totalPenalDue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Enhanced Summary */}
                    <div className="mt-6">
                      <table className="fz-label ml-auto bg-red-50/50 rounded-lg overflow-hidden" style={{ width: 'auto' }}>
                        <tbody>
                          <tr>
                            <td className="text-right py-2 px-5 font-black text-red-800">Page Records:</td>
                            <td className="text-right py-2 px-5 font-black text-slate-900" style={{ minWidth: '160px' }}>
                              {data.length} of {totalCount} Total
                            </td>
                          </tr>
                          <tr>
                            <td className="text-right py-2 px-5 font-black text-red-800">Page Loan Amount:</td>
                            <td className="text-right py-2 px-5 font-black text-slate-800">
                              ₹{formatCurrency(totalLoanAmount)}
                            </td>
                          </tr>
                          <tr style={{ borderTop: '2px solid #dc2626' }}>
                            <td className="text-right py-2 px-5 font-black text-red-800">Page Outstanding:</td>
                            <td className="text-right py-2 px-5 font-black text-red-800">
                              ₹{formatCurrency(totalOutstanding)}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-right py-2 px-5 font-black text-red-800">Page Penal Due:</td>
                            <td className="text-right py-2 px-5 font-black text-red-800">
                              ₹{formatCurrency(totalPenalDue)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="mt-6 flex justify-center">
                      <Pagination
                        current={currentPage}
                        total={totalCount}
                        pageSize={pageSize}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total, range) => 
                          `${range[0]}-${range[1]} of ${total} defaulters`
                        }
                        onChange={handlePageChange}
                        onShowSizeChange={handlePageChange}
                        pageSizeOptions={['25', '50', '100', '200']}
                        className="enhanced-pagination"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-50">
                    <FileText size={80} className="text-red-300 mb-6" />
                    <h3 className="fz-body font-black text-red-600 uppercase tracking-wider mb-2">No Defaulters Found</h3>
                    <p className="fz-caption font-semibold text-red-500 uppercase text-center max-w-[220px] leading-relaxed">
                      Adjust minimum balance filter to view defaulter data
                    </p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className={`px-5 py-3 flex items-center justify-between shrink-0 shadow-lg border-t ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-md border-red-200/60 shadow-red-100/20'}`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="fz-caption font-black text-red-700 uppercase tracking-wider">Risk Management System v2.0</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="fz-caption font-black text-red-600 uppercase tracking-wider">Filter: ₹{formatCurrency(minBalance)}</span>
            <div className="w-px h-3 bg-red-200" />
            <div className="bg-gradient-to-r from-red-100 to-rose-100 px-3 py-1 rounded-lg fz-caption font-black text-red-800 uppercase tabular-nums tracking-wider">
              v5.2.1
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .enhanced-scrollbar::-webkit-scrollbar { width: 8px; }
        .enhanced-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .enhanced-scrollbar::-webkit-scrollbar-thumb { 
          background: linear-gradient(to bottom, #dc2626, #b91c1c); 
          border-radius: 12px; 
          border: 1px solid #f87171;
        }
        .enhanced-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: linear-gradient(to bottom, #b91c1c, #991b1b); 
        }
        
        .legacy-report-enhanced {
          max-width: 100%;
          margin: 0 auto;
        }
        
        .enhanced-radio .ant-radio-button-wrapper {
          font-size: 11px !important;
          font-weight: 700 !important;
          padding: 0 12px !important;
          height: 36px !important;
          line-height: 34px !important;
          border-color: #dc2626 !important;
        }

        .enhanced-radio .ant-radio-button-wrapper-checked {
          background: linear-gradient(to right, #dc2626, #b91c1c) !important;
          border-color: #b91c1c !important;
          color: white !important;
        }

        .enhanced-pagination .ant-pagination-item-active {
          border-color: #dc2626 !important;
          background: #dc2626 !important;
        }
        
        .enhanced-pagination .ant-pagination-item-active a {
          color: white !important;
        }
        
        .enhanced-pagination .ant-pagination-item {
          border-radius: 8px !important;
          font-weight: 700 !important;
          font-size: 11px !important;
        }
        
        .enhanced-pagination .ant-pagination-jump-prev .ant-pagination-item-container .ant-pagination-item-link-icon,
        .enhanced-pagination .ant-pagination-jump-next .ant-pagination-item-container .ant-pagination-item-link-icon {
          color: #dc2626 !important;
        }
        
        .enhanced-pagination .ant-pagination-prev .ant-pagination-item-link,
        .enhanced-pagination .ant-pagination-next .ant-pagination-item-link {
          border-color: #dc2626 !important;
          color: #dc2626 !important;
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
           
           .legacy-report-enhanced, .legacy-report-enhanced * { 
             visibility: visible; 
           }
           
           .legacy-report-enhanced { 
             position: absolute;
             left: 50% !important;
             top: 0 !important;
             transform: translateX(-50%) !important;
             width: 8in !important;
             max-width: 8in !important; 
             margin: 0 auto !important;
             padding: 0.5in !important;
             font-size: 11pt !important;
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

export default DefaulterList;