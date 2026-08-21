import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DatePicker, Select, Button, ConfigProvider, theme as antdTheme } from 'antd';
import { MemberLookupInput, MemberLookupData } from '../../../../../components/shared/MemberLookup';
import {
  Printer,
  FileDown,
  User,
  Calendar,
  FileCheck,
  Activity,
  Search,
  CreditCard
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

interface LedgerTransaction {
  key: string;
  date: string;
  type: string;
  amount: number;
  narration: string;
  voucherNo: string;
  balance: number;
}

interface MemberInfo {
  memberNo: string;
  memberName: string;
  loanCaseNo: string;
}

const MemberLoanLedger: React.FC = () => {
  const [data, setData] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [memberNo, setMemberNo] = useState<string>('');
  const [loanCaseNo, setLoanCaseNo] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [loanCases, setLoanCases] = useState<string[]>([]);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (memberNo) {
      fetchLoanCases();
    }
  }, [memberNo]);

  const fetchLoanCases = async () => {
    if (!memberNo) return;
    
    try {
      const response = await apiService.getMemberLoanCases(memberNo);
      
      if (response.success && Array.isArray(response.data)) {
        const cases = response.data.map((item: any) => item.loanCaseNo.toString());
        setLoanCases(cases);
      } else if (Array.isArray(response)) {
        // Handle direct array response
        const cases = response.map((item: any) => item.loanCaseNo.toString());
        setLoanCases(cases);
      } else {
        setLoanCases([]);
      }
    } catch (error) {
      console.error('Error fetching loan cases:', error);
      setLoanCases([]);
    }
  };

  const fetchLedgerData = async () => {
    if (!memberNo) {
      await showDialog('warning', 'Validation', 'Please enter member number');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.getMemberLoanLedger(
        memberNo,
        loanCaseNo || undefined,
        fromDate?.format('YYYY-MM-DD'),
        toDate?.format('YYYY-MM-DD')
      );

      if (response.success && response.data) {
        const { memberNo: respMemberNo, memberName, loanCaseNo: respLoanCaseNo, transactions } = response.data;
        
        setMemberInfo({
          memberNo: respMemberNo,
          memberName: memberName,
          loanCaseNo: respLoanCaseNo
        });

        if (Array.isArray(transactions)) {
          const formattedData = transactions.map((item: any, index: number) => ({
            key: index.toString(),
            date: item.date,
            type: item.type,
            amount: item.amount,
            narration: item.narration,
            voucherNo: item.voucherNo,
            balance: item.balance
          }));
          setData(formattedData);
        } else {
          setData([]);
        }
      } else {
        setData([]);
        await showDialog('warning', 'No Data', 'No loan ledger data found');
      }
    } catch (error) {
      console.error('Error fetching loan ledger data:', error);
      await showDialog('error', 'Fetch Error', 'Failed to load loan ledger data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoized calculations for performance
  const { totalDebits, totalCredits, closingBalance } = useMemo(() => {
    const totalDebits = data.reduce((sum, item) => sum + (item.type === 'DR' || item.type === 'D' ? item.amount : 0), 0);
    const totalCredits = data.reduce((sum, item) => sum + (item.type === 'CR' || item.type === 'C' ? item.amount : 0), 0);
    const closingBalance = data.length > 0 ? data[data.length - 1].balance : 0;
    return { totalDebits, totalCredits, closingBalance };
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

    const headers = ['Date', 'Voucher', 'Narration', 'Debit', 'Credit', 'Balance'];
    const csvData = data.map(item => [
      dayjs(item.date).format('DD-MM-YYYY'),
      item.voucherNo,
      item.narration,
      item.type === 'DR' || item.type === 'D' ? item.amount : '',
      item.type === 'CR' || item.type === 'C' ? item.amount : '',
      item.balance
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `member_loan_ledger_${memberNo}_${fromDate?.format('YYYY-MM-DD')}_to_${toDate?.format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 8,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-900 px-3 py-1.5 flex items-center shrink-0 shadow-lg border-b border-white/5">
          <h1 className="fz-caption font-black text-white tracking-tight uppercase">Member Loan Ledger</h1>
        </div>

        <div className="flex-1 flex overflow-hidden">
        {/* Compact Sidebar - 280px */}
        <div className={`w-[280px] border-r flex flex-col shrink-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {/* Header */}
          <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg">
                <User size={20} />
              </div>
              <div>
                <h1 className={`fz-heading font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Member Loan Ledger</h1>
                <div className="flex items-center gap-2 mt-1 fz-label font-bold text-slate-400 uppercase tracking-wider">
                  <FileCheck size={10} className="text-blue-500" />
                  Monthly Report
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Member Selection */}
            <div className={`rounded-xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
              <div className={`border-b px-3 py-2 flex items-center gap-2 ${isDark ? 'bg-slate-600/50 border-slate-600' : 'bg-gradient-to-r from-slate-50 to-blue-50/50 border-slate-100'}`}>
                <User size={12} className="text-blue-600" />
                <span className={`fz-label font-black uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Member Details</span>
              </div>
              
              <div className="p-3 space-y-3">
                <div>
                  <label className="block fz-label font-bold text-slate-500 uppercase tracking-wider mb-1">Member No</label>
                  <MemberLookupInput
                    value={memberNo}
                    onChange={(no: string, data?: MemberLookupData) => {
                      setMemberNo(no);
                      if (data) setMemberName(data.memberName);
                    }}
                    placeholder="Type to search member..."
                  />
                  {memberName && (
                    <div className={`mt-1 fz-label font-semibold truncate ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {memberName}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block fz-label font-bold text-slate-500 uppercase tracking-wider mb-1">Loan Case No</label>
                  <Select
                    value={loanCaseNo}
                    onChange={setLoanCaseNo}
                    className="w-full"
                    placeholder="All Loan Cases"
                    allowClear
                    size="middle"
                  >
                    {loanCases.map(caseNo => (
                      <Option key={caseNo} value={caseNo}>
                        <span className="font-bold text-slate-700 fz-label">Case: {caseNo}</span>
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className={`rounded-xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
              <div className={`border-b px-3 py-2 flex items-center gap-2 ${isDark ? 'bg-slate-600/50 border-slate-600' : 'bg-gradient-to-r from-slate-50 to-blue-50/50 border-slate-100'}`}>
                <Calendar size={12} className="text-blue-600" />
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

            {/* Action Button */}
            <Button
              type="primary"
              icon={<Activity size={16} />}
              loading={loading}
              className="w-full h-12 rounded-xl fz-label font-black uppercase tracking-wider shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              onClick={fetchLedgerData}
            >
              Load Ledger
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
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-md">
              <div className="fz-label font-bold uppercase tracking-wide opacity-90 mb-1">Closing Balance</div>
              <div className="fz-heading font-black font-mono">₹{formatCurrency(closingBalance)}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-900/40' : 'bg-emerald-100'}`}>
                <div className={`fz-label font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Credits</div>
                <div className={`fz-body font-black ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>₹{formatCurrency(totalCredits)}</div>
              </div>
              
              <div className={`p-2 rounded-lg ${isDark ? 'bg-rose-900/40' : 'bg-rose-100'}`}>
                <div className={`fz-label font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Debits</div>
                <div className={`fz-body font-black ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>₹{formatCurrency(totalDebits)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Report Panel with Legacy Format */}
          <div className={`flex-1 rounded-xl shadow-sm flex flex-col overflow-hidden m-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
            <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-blue-50/50 border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-100'}`}>
                  <CreditCard size={14} className="text-blue-600" />
                </div>
                <div>
                  <h3 className={`fz-label font-extrabold uppercase tracking-wide leading-none ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Loan Account Ledger</h3>
                  <p className="fz-label font-semibold text-slate-400 uppercase mt-0.5 tracking-tight">
                    {memberInfo ? `${memberInfo.memberName} (${memberInfo.memberNo})` : 'Member Loan Transactions'}
                  </p>
                </div>
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-slate-500 font-bold fz-body">Loading loan ledger...</span>
                  </div>
                </div>
              ) : data.length > 0 ? (
                <div className="legacy-report-compact font-mono fz-label">
                  {/* Company Header */}
                  <div className="text-center mb-4 border-b border-dashed border-slate-300 pb-3">
                    <div className={`fz-body font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Espat Karmchari Co-Operative Credit Society Limited</div>
                    <div className={`fz-label ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                    <div className={`flex justify-between fz-label mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>Reg No: A.R/DRG/1796</span>
                      <span>Tel No: 0788-2298736</span>
                    </div>
                  </div>

                  {/* Report Header */}
                  <div className="flex justify-between fz-label mb-3 text-slate-600">
                    <div>Period: {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}</div>
                    <div>Generated: {dayjs().format('DD-MMM-YYYY h:mmA')}</div>
                  </div>

                  <div className="border-t border-b border-dashed border-slate-400 py-2 text-center mb-4">
                    <div className="fz-body font-bold text-slate-800">MEMBER LOAN LEDGER</div>
                    {memberInfo && (
                      <div className="fz-label text-slate-600 mt-1">
                        Member: {memberInfo.memberName} ({memberInfo.memberNo})
                        {loanCaseNo && ` | Loan Case: ${loanCaseNo}`}
                      </div>
                    )}
                  </div>

                  {/* Legacy Table */}
                  <div className="border border-dashed border-slate-400">
                    <table className="w-full fz-label">
                      <thead>
                        <tr className={`border-b border-dashed border-slate-400 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                          <th className="text-left py-2 px-2 font-bold text-slate-700 border-r border-dashed border-slate-300">DATE</th>
                          <th className="text-left py-2 px-2 font-bold text-slate-700 border-r border-dashed border-slate-300">VOUCHER</th>
                          <th className="text-left py-2 px-2 font-bold text-slate-700 border-r border-dashed border-slate-300">NARRATION</th>
                          <th className="text-right py-2 px-2 font-bold text-slate-700 border-r border-dashed border-slate-300">DEBIT</th>
                          <th className="text-right py-2 px-2 font-bold text-slate-700 border-r border-dashed border-slate-300">CREDIT</th>
                          <th className="text-right py-2 px-2 font-bold text-slate-700">BALANCE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, index) => (
                          <tr key={item.key} className="border-b border-dashed border-slate-200 hover:bg-blue-50/30 transition-colors">
                            <td className="py-2 px-2 text-slate-700 border-r border-dashed border-slate-200 font-medium">
                              {dayjs(item.date).format('DD-MM-YYYY')}
                            </td>
                            <td className="py-2 px-2 text-slate-800 border-r border-dashed border-slate-200 font-bold">{item.voucherNo}</td>
                            <td className="py-2 px-2 text-slate-700 border-r border-dashed border-slate-200 font-medium">{item.narration}</td>
                            <td className="py-2 px-2 text-right border-r border-dashed border-slate-200">
                              {(item.type === 'DR' || item.type === 'D') && (
                                <span className="text-rose-600 font-black">{formatCurrency(item.amount)}</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right border-r border-dashed border-slate-200">
                              {(item.type === 'CR' || item.type === 'C') && (
                                <span className="text-emerald-600 font-black">{formatCurrency(item.amount)}</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right text-blue-700 font-bold">{formatCurrency(item.balance)}</td>
                          </tr>
                        ))}
                        
                        {/* Total Row */}
                        <tr className={`border-t-2 border-dashed border-slate-400 font-bold ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`}>
                          <td colSpan={3} className="py-2 px-2 text-right text-slate-700 uppercase tracking-wider border-r border-dashed border-slate-300">
                            TOTAL
                          </td>
                          <td className="py-2 px-2 text-right border-r border-dashed border-slate-300">
                            <span className="text-rose-700 font-black">{formatCurrency(totalDebits)}</span>
                          </td>
                          <td className="py-2 px-2 text-right border-r border-dashed border-slate-300">
                            <span className="text-emerald-700 font-black">{formatCurrency(totalCredits)}</span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className="text-blue-700 font-black">{formatCurrency(closingBalance)}</span>
                          </td>
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
                  <h3 className="fz-body font-bold text-slate-400 uppercase tracking-wide">No Loan Transactions</h3>
                  <p className="fz-label font-medium text-slate-300 uppercase mt-2 text-center max-w-[200px]">
                    No transactions found for the selected member and period
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
          .ant-btn, .ant-select, .ant-picker, .ant-input { display: none !important; }
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
        
        .ant-picker, .ant-input {
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

export default MemberLoanLedger;