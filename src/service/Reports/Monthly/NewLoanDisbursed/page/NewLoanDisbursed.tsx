import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DatePicker, Select, Button, ConfigProvider, theme as antdTheme } from 'antd';
import {
  Printer,
  FileDown,
  TrendingUp,
  Calendar,
  FileCheck,
  Activity,
  Briefcase,
  Search,
  User
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { MemberLookupInput, MemberLookupData } from '../../../../../components/shared/MemberLookup';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

interface LoanRecord {
  key: string;
  mbno: string;
  memberNo: string;
  memberName: string;
  officeName: string;
  loanType: string;
  loanCaseNo: string;
  loanAmount: number;
  disbursementDate: string;
  installments: number;
  interestRate: number;
}

interface LoanType {
  code: string;
  name: string;
}

const NewLoanDisbursed: React.FC = () => {
  const [data, setData] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs('2026-01-01'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [selectedLoanType, setSelectedLoanType] = useState<string>('');
  const [memberNo, setMemberNo] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    fetchLoanTypes();
    fetchLoanData();
  }, []);

  const fetchLoanTypes = async () => {
    try {
      const response = await apiService.getLoanTypes();
      if (response.success && Array.isArray(response.data)) {
        setLoanTypes(response.data);
      } else if (Array.isArray(response)) {
        // Handle direct array response
        setLoanTypes(response);
      }
    } catch (error) {
      console.error('Error fetching loan types:', error);
    }
  };

  const fetchLoanData = async () => {
    if (!fromDate || !toDate) {
      await showDialog('warning', 'Validation', 'Please select date range');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.getNewLoanDisbursed(
        fromDate.format('YYYY-MM-DD'),
        toDate.format('YYYY-MM-DD'),
        selectedLoanType || undefined,
        memberNo || undefined
      );

      if (response.success && response.data && Array.isArray(response.data.data)) {
        const formattedData = response.data.data.map((item: any, index: number) => ({
          key: index.toString(),
          mbno: item.memberNo,
          memberNo: item.memberNo,
          memberName: item.memberName,
          officeName: item.officeName || '',
          loanType: item.loanType,
          loanCaseNo: item.loanCaseNo,
          loanAmount: item.loanAmount,
          disbursementDate: item.disbursementDate,
          installments: item.installments,
          interestRate: item.interestRate
        }));
        setData(formattedData);
      } else {
        setData([]);
        await showDialog('warning', 'No Data', 'No loan disbursement data found');
      }
    } catch (error) {
      console.error('Error fetching loan data:', error);
      await showDialog('error', 'Fetch Error', 'Failed to load loan disbursement data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoized calculations for performance
  const { totalAmount, totalLoans } = useMemo(() => {
    const totalAmount = data.reduce((sum, item) => sum + (Number(item.loanAmount) || 0), 0);
    const totalLoans = data.length;
    return { totalAmount, totalLoans };
  }, [data]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const handlePrint = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'No Data', 'No data available for printing');
      return;
    }
    window.print();
  };

  const exportToCSV = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'No Data', 'No data available for export');
      return;
    }

    const headers = ['Member No', 'Member Name', 'Office', 'Loan Type', 'Case No', 'Amount', 'Date', 'Installments', 'Rate'];
    const csvData = data.map(item => [
      item.memberNo,
      item.memberName,
      item.officeName,
      item.loanType,
      item.loanCaseNo,
      item.loanAmount,
      dayjs(item.disbursementDate).format('DD-MM-YYYY'),
      item.installments,
      item.interestRate
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `new_loan_disbursed_${fromDate?.format('YYYY-MM-DD')}_to_${toDate?.format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#10b981',
          borderRadius: 8,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-900 px-3 py-1.5 flex items-center shrink-0 shadow-lg border-b border-white/5">
          <h1 className="fz-caption font-black text-white tracking-tight uppercase">New Loan Disbursed</h1>
        </div>

        <div className="flex-1 flex overflow-hidden">
        {/* Compact Sidebar - 280px */}
        <div className={`w-[280px] border-r flex flex-col shrink-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {/* Header */}
          <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-lg">
                <TrendingUp size={20} />
              </div>
              <div>
                <h1 className={`fz-heading font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>New Loan Disbursed</h1>
                <div className="flex items-center gap-2 mt-1 fz-label font-bold text-slate-400 uppercase tracking-wider">
                  <FileCheck size={10} className="text-emerald-500" />
                  Monthly Report
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Date Range */}
            <div className={`rounded-xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
              <div className={`border-b px-3 py-2 flex items-center gap-2 ${isDark ? 'bg-slate-600/50 border-slate-600' : 'bg-gradient-to-r from-slate-50 to-emerald-50/50 border-slate-100'}`}>
                <Calendar size={12} className="text-emerald-600" />
                <span className={`fz-label font-black uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Date Range</span>
              </div>
              
              <div className="p-3 space-y-3">
                <div>
                  <label className="block fz-label font-bold text-slate-500 uppercase tracking-wider mb-1">From Date</label>
                  <DatePicker
                    value={fromDate}
                    onChange={setFromDate}
                    className="w-full h-9 fz-label"
                    format="DD-MMM-YYYY"
                    placeholder="Select from date"
                  />
                </div>
                
                <div>
                  <label className="block fz-label font-bold text-slate-500 uppercase tracking-wider mb-1">To Date</label>
                  <DatePicker
                    value={toDate}
                    onChange={setToDate}
                    className="w-full h-9 fz-label"
                    format="DD-MMM-YYYY"
                    placeholder="Select to date"
                  />
                </div>
              </div>
            </div>

            {/* Member Filter */}
            <div className={`rounded-xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
              <div className={`border-b px-3 py-2 flex items-center gap-2 ${isDark ? 'bg-slate-600/50 border-slate-600' : 'bg-gradient-to-r from-slate-50 to-emerald-50/50 border-slate-100'}`}>
                <User size={12} className="text-emerald-600" />
                <span className={`fz-label font-black uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Member</span>
              </div>

              <div className="p-3">
                <label className="block fz-label font-bold text-slate-500 uppercase tracking-wider mb-1">Member No (optional)</label>
                <MemberLookupInput
                  value={memberNo}
                  onChange={(no: string, data?: MemberLookupData) => {
                    setMemberNo(no);
                    setMemberName(data?.memberName || '');
                  }}
                  placeholder="Type to search member..."
                />
                {memberName && (
                  <div className={`mt-1 fz-label font-semibold truncate ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {memberName}
                  </div>
                )}
              </div>
            </div>

            {/* Loan Type Filter */}
            <div className={`rounded-xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
              <div className={`border-b px-3 py-2 flex items-center gap-2 ${isDark ? 'bg-slate-600/50 border-slate-600' : 'bg-gradient-to-r from-slate-50 to-emerald-50/50 border-slate-100'}`}>
                <Briefcase size={12} className="text-emerald-600" />
                <span className={`fz-label font-black uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Loan Type</span>
              </div>
              
              <div className="p-3">
                <Select
                  value={selectedLoanType}
                  onChange={setSelectedLoanType}
                  className="w-full"
                  placeholder="All Loan Types"
                  allowClear
                  showSearch
                  size="middle"
                >
                  {loanTypes.map(type => (
                    <Option key={type.code} value={type.code}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 fz-label">{type.name}</span>
                        <span className="fz-label font-bold text-emerald-500 font-mono">{type.code}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Action Button */}
            <Button
              type="primary"
              icon={<Activity size={16} />}
              loading={loading}
              className="w-full h-12 rounded-xl fz-label font-black uppercase tracking-wider shadow-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
              onClick={fetchLoanData}
            >
              Load Report
            </Button>

            {/* Export Actions */}
            <div className={`space-y-2 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <Button
                icon={<Printer size={14} />}
                className="w-full h-10 rounded-xl fz-label font-bold"
                onClick={handlePrint}
                disabled={data.length === 0}
              >
                Print Report
              </Button>
              
              <Button
                icon={<FileDown size={14} />}
                className="w-full h-10 rounded-xl fz-label font-bold"
                onClick={exportToCSV}
                disabled={data.length === 0}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className={`p-4 border-t space-y-3 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-3 text-white shadow-md">
              <div className="fz-label font-bold uppercase tracking-wide opacity-90 mb-1">Total Amount</div>
              <div className="fz-heading font-black font-mono">₹{formatCurrency(totalAmount)}</div>
            </div>
            
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className={`fz-label font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Total Loans</div>
              <div className={`fz-heading font-black ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>{totalLoans}</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Report Panel with Legacy Format */}
          <div className={`flex-1 rounded-xl shadow-sm flex flex-col overflow-hidden m-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
            <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-emerald-50/50 border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-100'}`}>
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className={`fz-label font-extrabold uppercase tracking-wide leading-none ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Loan Disbursement Register</h3>
                  <p className="fz-label font-semibold text-slate-400 uppercase mt-0.5 tracking-tight">{fromDate?.format('DD MMM YYYY')} - {toDate?.format('DD MMM YYYY')}</p>
                </div>
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    <span className={`font-bold fz-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading loan data...</span>
                  </div>
                </div>
              ) : data.length > 0 ? (
                <div className="legacy-report-compact font-mono fz-label">
                  {/* Company Header */}
                  <div className={`text-center mb-4 border-b border-dashed pb-3 ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                    <div className={`fz-body font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Espat Karmchari Co-Operative Credit Society Limited</div>
                    <div className={`fz-label ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                    <div className={`flex justify-between fz-label mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>Reg No: A.R/DRG/1796</span>
                      <span>Tel No: 0788-2298736</span>
                    </div>
                  </div>

                  {/* Report Header */}
                  <div className={`flex justify-between fz-label mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <div>Period: {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}</div>
                    <div>Generated: {dayjs().format('DD-MMM-YYYY h:mmA')}</div>
                  </div>

                  <div className={`border-t border-b border-dashed py-2 text-center mb-4 ${isDark ? 'border-slate-600' : 'border-slate-400'}`}>
                    <div className={`fz-body font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>NEW LOAN DISBURSED REGISTER</div>
                    {selectedLoanType && (
                      <div className={`fz-label mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Loan Type: {loanTypes.find(t => t.code === selectedLoanType)?.name || selectedLoanType}</div>
                    )}
                    {memberNo && (
                      <div className={`fz-label mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Member: {memberNo}{memberName ? ` - ${memberName}` : ''}</div>
                    )}
                  </div>

                  {/* Legacy Table */}
                  <div className={`border border-dashed ${isDark ? 'border-slate-600' : 'border-slate-400'}`}>
                    <table className="w-full fz-label">
                      <thead>
                        <tr className={`border-b border-dashed ${isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-400 bg-slate-50'}`}>
                          <th className={`text-left py-2 px-2 font-bold border-r border-dashed ${isDark ? 'text-slate-300 border-slate-600' : 'text-slate-700 border-slate-300'}`}>SR</th>
                          <th className={`text-left py-2 px-2 font-bold border-r border-dashed ${isDark ? 'text-slate-300 border-slate-600' : 'text-slate-700 border-slate-300'}`}>MEMBER NO</th>
                          <th className={`text-left py-2 px-2 font-bold border-r border-dashed ${isDark ? 'text-slate-300 border-slate-600' : 'text-slate-700 border-slate-300'}`}>MEMBER NAME</th>
                          <th className={`text-left py-2 px-2 font-bold border-r border-dashed ${isDark ? 'text-slate-300 border-slate-600' : 'text-slate-700 border-slate-300'}`}>LOAN TYPE</th>
                          <th className={`text-left py-2 px-2 font-bold border-r border-dashed ${isDark ? 'text-slate-300 border-slate-600' : 'text-slate-700 border-slate-300'}`}>CASE NO</th>
                          <th className={`text-right py-2 px-2 font-bold border-r border-dashed ${isDark ? 'text-slate-300 border-slate-600' : 'text-slate-700 border-slate-300'}`}>AMOUNT</th>
                          <th className={`text-left py-2 px-2 font-bold border-r border-dashed ${isDark ? 'text-slate-300 border-slate-600' : 'text-slate-700 border-slate-300'}`}>DATE</th>
                          <th className={`text-right py-2 px-2 font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>RATE %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, index) => (
                          <tr key={item.key} className={`border-b border-dashed ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-emerald-50/30'}`}>
                            <td className={`py-2 px-2 border-r border-dashed font-medium ${isDark ? 'text-slate-400 border-slate-700' : 'text-slate-600 border-slate-200'}`}>{index + 1}</td>
                            <td className={`py-2 px-2 border-r border-dashed font-bold ${isDark ? 'text-slate-200 border-slate-700' : 'text-slate-800 border-slate-200'}`}>{item.memberNo}</td>
                            <td className={`py-2 px-2 border-r border-dashed font-medium uppercase ${isDark ? 'text-slate-200 border-slate-700' : 'text-slate-800 border-slate-200'}`}>{item.memberName}</td>
                            <td className={`py-2 px-2 border-r border-dashed ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                              <span className="inline-flex items-center px-2 py-0.5 rounded fz-label font-bold bg-emerald-100 text-emerald-700">
                                {item.loanType}
                              </span>
                            </td>
                            <td className={`py-2 px-2 border-r border-dashed font-bold ${isDark ? 'text-slate-300 border-slate-700' : 'text-slate-700 border-slate-200'}`}>{item.loanCaseNo}</td>
                            <td className={`py-2 px-2 text-right border-r border-dashed ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                              <span className="text-emerald-500 font-black">{formatCurrency(item.loanAmount)}</span>
                            </td>
                            <td className={`py-2 px-2 font-medium border-r border-dashed ${isDark ? 'text-slate-300 border-slate-700' : 'text-slate-700 border-slate-200'}`}>
                              {dayjs(item.disbursementDate).format('DD-MM-YYYY')}
                            </td>
                            <td className={`py-2 px-2 text-right font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.interestRate}%</td>
                          </tr>
                        ))}
                        
                        {/* Total Row */}
                        <tr className={`border-t-2 border-dashed border-slate-400 font-bold ${isDark ? 'bg-slate-800' : 'bg-emerald-50'}`}>
                          <td colSpan={5} className={`py-2 px-2 text-right uppercase tracking-wider border-r border-dashed ${isDark ? 'text-slate-300 border-slate-600' : 'text-slate-700 border-slate-300'}`}>
                            TOTAL ({totalLoans} LOANS)
                          </td>
                          <td className={`py-2 px-2 text-right border-r border-dashed ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                            <span className="text-emerald-600 font-black">{formatCurrency(totalAmount)}</span>
                          </td>
                          <td colSpan={2} className="py-2 px-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Note */}
                  <div className="mt-4 fz-label text-slate-400 italic text-center">
                    * Report generated as per available data in the system
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <Search size={60} className="text-slate-300 mb-4" />
                  <h3 className="fz-body font-bold text-slate-400 uppercase tracking-wide">No Loan Disbursements</h3>
                  <p className="fz-label font-medium text-slate-300 uppercase mt-2 text-center max-w-[200px]">
                    No disbursements found for the selected period
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .ant-btn, .ant-select, .ant-picker { display: none !important; }
          .w-\\[280px\\] { display: none !important; }
          .flex-1 { width: 100% !important; }
          body { margin: 0; padding: 20px; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
        
        .ant-select-selector {
          border-radius: 8px !important;
          border-color: #e2e8f0 !important;
          height: 36px !important;
          display: flex !important;
          align-items: center !important;
        }
        
        .ant-picker {
          border-radius: 8px !important;
          border-color: #e2e8f0 !important;
        }
        
        .legacy-report-compact table {
          border-collapse: collapse;
        }
        
        .legacy-report-compact th,
        .legacy-report-compact td {
          border-color: #cbd5e1;
        }
      `}</style>
    </ConfigProvider>
  );
};

export default NewLoanDisbursed;