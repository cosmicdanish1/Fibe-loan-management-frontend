import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DatePicker, Button, ConfigProvider, Checkbox, Input, Tabs, theme as antdTheme } from 'antd';
import {
  Printer,
  FileDown,
  Scale,
  Calendar,
  FileCheck,
  Activity,
  Search,
  Building2,
  Settings
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

const { TabPane } = Tabs;

interface BalanceSheetItem {
  headCode: string;
  headName: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
}

interface BalanceSheetData {
  liabilities: BalanceSheetItem[];
  assets: BalanceSheetItem[];
  totals: {
    totalLiabilities: number;
    totalAssets: number;
    difference: number;
  };
}

interface FinancialOptions {
  includeFinancialYrOpBal: boolean;
  zeroClosingBalance: boolean;
  zeroTransactionAc: boolean;
  profitLossTransferAccount: string;
}

const PLBalanceSheet: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('1');
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('year'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [options, setOptions] = useState<FinancialOptions>({
    includeFinancialYrOpBal: true,
    zeroClosingBalance: false,
    zeroTransactionAc: true,
    profitLossTransferAccount: ''
  });

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      const response = await apiService.getBalanceSheet(
        fromDate?.format('YYYY-MM-DD'),
        toDate?.format('YYYY-MM-DD')
      );

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setData(null);
        await showDialog('warning', 'No Data', 'No balance sheet data found');
      }
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      await showDialog('error', 'Fetch Error', 'Failed to load balance sheet data');
      setData(null);
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

  const handleShow = () => {
    fetchBalanceSheet();
    setActiveTab('4'); // Switch to Balance Sheet tab
  };

  const handlePrint = async () => {
    if (!data) {
      await showDialog('warning', 'No Data', 'No data available for printing');
      return;
    }
    window.print();
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#7c3aed',
          borderRadius: 8,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <div className={`plbs-page h-screen flex font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>

        {/* Main Content - Full Width Legacy Style */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className={`plbs-header border-b px-4 py-2 shrink-0 ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg text-white shadow-lg">
                <Scale size={18} />
              </div>
              <div>
                <h1 className={`fz-heading font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Espat Karmchari Co-Operative Credit Society Limited.</h1>
                <div className="flex items-center gap-2 mt-0.5 fz-label font-bold text-slate-400 uppercase tracking-wider">
                  <FileCheck size={10} className="text-purple-500" />
                  Financial Statements
                </div>
              </div>
            </div>
          </div>

          {/* Legacy Tab Interface */}
          <div className="flex-1 p-2 overflow-auto">
            <div className={`plbs-card rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              
              {/* Custom Tab Headers - Legacy Style */}
              <div className={`border-b ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex">
                  {[
                    { key: '1', label: 'Step 1.' },
                    { key: '2', label: '2. Trial Balance' },
                    { key: '3', label: '3. Profit and Loss' },
                    { key: '4', label: '4. Balance Sheet' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-1.5 fz-label font-bold border-r transition-colors ${isDark ? 'border-slate-700' : 'border-slate-200'} ${
                        activeTab === tab.key
                          ? (isDark ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-500' : 'bg-white text-purple-700 border-b-2 border-purple-600')
                          : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100')
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-3">
                
                {/* Step 1 - Date Selection */}
                {activeTab === '1' && (
                  <div className="space-y-3">
                    
                    {/* Section 1 - DATE */}
                    <div className={`border-2 rounded-lg p-3 ${isDark ? 'border-slate-600 bg-slate-700/40' : 'border-blue-300 bg-blue-50/30'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center fz-label font-bold">1</span>
                        <h3 className={`fz-label font-black uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>DATE</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block fz-label font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>From</label>
                          <DatePicker
                            value={fromDate}
                            onChange={setFromDate}
                            className="w-full h-8"
                            format="DD-MMM-YYYY"
                            placeholder="01-Nov-2019"
                          />
                        </div>
                        
                        <div>
                          <label className={`block fz-label font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>To</label>
                          <DatePicker
                            value={toDate}
                            onChange={setToDate}
                            className="w-full h-8"
                            format="DD-MMM-YYYY"
                            placeholder="31-Mar-2020"
                          />
                          <p className="fz-label text-slate-500 mt-0.5 italic">(Date depends on Fin'Yr)</p>
                        </div>
                      </div>
                    </div>

                    {/* Section 2 - Include Financial Yr OpBal */}
                    <div className={`border-2 rounded-lg p-3 ${isDark ? 'border-slate-600 bg-slate-700/40' : 'border-blue-300 bg-blue-50/30'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center fz-label font-bold">2</span>
                      </div>
                      
                      <Checkbox
                        checked={options.includeFinancialYrOpBal}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeFinancialYrOpBal: e.target.checked }))}
                        className="fz-label font-bold"
                      >
                        Include Financial Yr OpBal
                      </Checkbox>
                    </div>

                    {/* Section 3 - Suppress A/c with */}
                    <div className={`border-2 rounded-lg p-3 ${isDark ? 'border-slate-600 bg-slate-700/40' : 'border-blue-300 bg-blue-50/30'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center fz-label font-bold">3</span>
                        <h3 className={`fz-label font-black uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Suppress A/c with</h3>
                      </div>
                      
                      <div className="space-y-1">
                        <Checkbox
                          checked={options.zeroClosingBalance}
                          onChange={(e) => setOptions(prev => ({ ...prev, zeroClosingBalance: e.target.checked }))}
                          className="fz-label font-bold"
                        >
                          Zero Closing Balance
                        </Checkbox>
                        
                        <Checkbox
                          checked={options.zeroTransactionAc}
                          onChange={(e) => setOptions(prev => ({ ...prev, zeroTransactionAc: e.target.checked }))}
                          className="fz-label font-bold"
                        >
                          Zero Transaction A/c
                        </Checkbox>
                      </div>
                    </div>

                    {/* Section 4 - Profit/Loss Transfer */}
                    <div className={`border-2 rounded-lg p-3 ${isDark ? 'border-slate-600 bg-slate-700/40' : 'border-blue-300 bg-blue-50/30'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center fz-label font-bold">4</span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className={`fz-label font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Profit/Loss will be transferred to<br />
                          Balance Sheet in Ledger Account
                        </p>
                        
                        <div className="border-b border-slate-300 pb-1">
                          <Input
                            value={options.profitLossTransferAccount}
                            onChange={(e) => setOptions(prev => ({ ...prev, profitLossTransferAccount: e.target.value }))}
                            className="border-none shadow-none p-0 fz-label"
                            placeholder="Enter account name..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Show Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        type="primary"
                        className="bg-purple-600 hover:bg-purple-700 px-6 h-8 fz-label font-bold uppercase tracking-wider"
                        onClick={handleShow}
                        loading={loading}
                      >
                        Show
                      </Button>
                    </div>
                  </div>
                )}

                {/* Trial Balance Tab */}
                {activeTab === '2' && (
                  <div className="text-center py-12">
                    <Settings size={48} className="text-slate-300 mx-auto mb-3" />
                    <h3 className={`fz-body font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Trial Balance</h3>
                    <p className={`fz-label mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Click <strong>Show</strong> in Step 1 to generate</p>
                  </div>
                )}

                {/* Profit and Loss Tab */}
                {activeTab === '3' && (
                  <div className="text-center py-12">
                    <Settings size={48} className="text-slate-300 mx-auto mb-3" />
                    <h3 className={`fz-body font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Profit and Loss</h3>
                    <p className={`fz-label mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Click <strong>Show</strong> in Step 1 to generate</p>
                  </div>
                )}

                {/* Balance Sheet Tab */}
                {activeTab === '4' && (
                  <div>
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                        <span className="text-slate-500 font-bold fz-body">Loading balance sheet...</span>
                      </div>
                    ) : data ? (
                      <div className="legacy-report-compact font-mono fz-label">
                        {/* Company Header */}
                        <div className="text-center mb-3 border-b border-dashed border-slate-300 pb-2">
                          <div className={`fz-body font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                          <div className={`fz-label mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                          <div className={`fz-body font-bold mt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>BALANCE SHEET</div>
                          <div className={`fz-label ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>As on {toDate?.format('DD MMMM YYYY')}</div>
                        </div>

                        {/* Balance Sheet Layout - Two Columns */}
                        <div className="grid grid-cols-2 gap-3">
                          
                          {/* Liabilities Column */}
                          <div>
                            <div className="border border-slate-400">
                                <div className={`border-b border-slate-400 py-1 px-2 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                <h4 className={`fz-label font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>LIABILITIES</h4>
                              </div>
                              
                              <table className="w-full fz-label">
                                <tbody>
                                  {data.liabilities && Array.isArray(data.liabilities) && data.liabilities.length > 0 ? data.liabilities.map((item, index) => (
                                    <tr key={item.headCode} className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                      <td className="py-1 px-2 font-medium">
                                        <div className="flex flex-col">
                                          <span className={`font-bold fz-label ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{item.headName}</span>
                                          <span className={`fz-label ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{item.headCode}</span>
                                        </div>
                                      </td>
                                      <td className={`py-1 px-2 text-right font-bold fz-label ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                        {formatCurrency(item.closingBalance)}
                                      </td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan={2} className="py-4 px-3 text-center text-slate-400 fz-label">
                                        No liability data available
                                      </td>
                                    </tr>
                                  )}
                                  
                                  {/* Total Liabilities */}
                                  <tr className={`border-t-2 border-slate-400 font-bold ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                    <td className={`py-1 px-2 uppercase tracking-wider font-black fz-label ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>TOTAL</td>
                                    <td className={`py-1 px-2 text-right font-black fz-label ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{data.totals && formatCurrency(data.totals.totalLiabilities || 0)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Assets Column */}
                          <div>
                            <div className="border border-slate-400">
                                <div className={`border-b border-slate-400 py-1 px-2 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                <h4 className={`fz-label font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>ASSETS</h4>
                              </div>
                              
                              <table className="w-full fz-label">
                                <tbody>
                                  {data.assets && Array.isArray(data.assets) && data.assets.length > 0 ? data.assets.map((item, index) => (
                                    <tr key={item.headCode} className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                      <td className="py-1 px-2 font-medium">
                                        <div className="flex flex-col">
                                          <span className={`font-bold fz-label ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{item.headName}</span>
                                          <span className={`fz-label ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{item.headCode}</span>
                                        </div>
                                      </td>
                                      <td className={`py-1 px-2 text-right font-bold fz-label ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                        {formatCurrency(item.closingBalance)}
                                      </td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan={2} className="py-4 px-3 text-center text-slate-400 fz-label">
                                        No asset data available
                                      </td>
                                    </tr>
                                  )}
                                  
                                  {/* Total Assets */}
                                  <tr className={`border-t-2 border-slate-400 font-bold ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                    <td className={`py-1 px-2 uppercase tracking-wider font-black fz-label ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>TOTAL</td>
                                    <td className={`py-1 px-2 text-right font-black fz-label ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{data.totals && formatCurrency(data.totals.totalAssets || 0)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* Print Button */}
                        <div className={`flex justify-end mt-3 pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <Button
                            icon={<Printer size={14} />}
                            className="h-7 px-3 fz-label font-bold"
                            onClick={handlePrint}
                          >
                            Print
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Search size={48} className="text-slate-300 mx-auto mb-3" />
                        <h3 className="fz-body font-bold text-slate-400 uppercase tracking-wide">No Balance Sheet Data</h3>
                        <p className="fz-label text-slate-400 mt-1">Configure settings in Step 1 and click Show</p>
                      </div>
                    )}
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
          .ant-btn, .ant-picker, .ant-checkbox, .ant-input { display: none !important; }
          body { margin: 0; padding: 20px; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
        
        .legacy-report-compact table {
          border-collapse: collapse;
        }
        
        .grid-cols-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        /* ── PL Balance Sheet — dark mode (screen chrome; legacy report table already isDark-aware) ── */
        html.dark .plbs-page { background-color: #000000 !important; }
        html.dark .plbs-header { background-image: none !important; background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .plbs-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .plbs-page .bg-slate-900\/50 { background-color: #0c0c0e !important; }
        html.dark .plbs-page .bg-slate-700\/40,
        html.dark .plbs-page .bg-slate-700 { background-color: #1c1c1e !important; }
        html.dark .plbs-page .border-slate-600,
        html.dark .plbs-page .border-slate-700 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .plbs-page .text-slate-100,
        html.dark .plbs-page .text-slate-200,
        html.dark .plbs-page .text-slate-300 { color: #f5f5f7 !important; }
        html.dark .plbs-page .text-slate-400,
        html.dark .plbs-page .text-slate-500 { color: #8e8e93 !important; }
        html.dark .plbs-page label { color: #8e8e93 !important; }
        html.dark .plbs-page .ant-picker,
        html.dark .plbs-page .ant-input { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .plbs-page .ant-picker input { color: #f5f5f7 !important; }
        html.dark .plbs-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default PLBalanceSheet;