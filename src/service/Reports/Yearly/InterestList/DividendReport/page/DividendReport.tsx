import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DatePicker, Button, ConfigProvider, Select, InputNumber, Pagination, Input, Space, Spin, Modal, theme as antdTheme } from 'antd';
import MemberLookup from '../../../../../../components/shared/MemberLookup/MemberLookup';
import {
  Printer,
  FileDown,
  IndianRupee,
  Building2,
  Users,
  Percent,
  Search,
  Calendar
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../store';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

interface DividendData {
  memberNo: string;
  memberName: string;
  wing: string;
  office: string;
  designation: string;
  shareAmount: number;
  dividendAmount: number;
  dividendRate: number;
}

const DividendReport: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedWing, setSelectedWing] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [dividendRate, setDividendRate] = useState<number>(10);
  const [financialYear, setFinancialYear] = useState<string>(`${currentYear}-${currentYear + 1}`);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<DividendData[]>([]);
  const [wings, setWings] = useState<string[]>([]);
  const [offices, setOffices] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [validatingMember, setValidatingMember] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark';

  // Calculate dynamic years
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const start = currentYear - 2 + i;
    return `${start}-${start + 1}`;
  }).reverse(), [currentYear]);

  useEffect(() => {
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validateMember = useCallback(async (mbno: string) => {
    if (!mbno.trim()) { setSelectedMemberName(''); return; }
    setValidatingMember(true);
    try {
      const res = await apiService.validateMember(mbno.trim());
      if (res.success && res.data?.exists) {
        setSelectedMemberName(res.data.memberName || '');
        setCurrentPage(1);
        fetchData(1, mbno.trim());
      } else {
        setSelectedMemberName('');
      }
    } catch { setSelectedMemberName(''); }
    finally { setValidatingMember(false); }
  }, []);

  const handleMemberBlur = () => validateMember(searchText);
  const handleMemberKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') validateMember(searchText);
  };

  const handleMemberSelect = (member: { memberNo: string; memberName?: string; name?: string }) => {
    setSearchText(member.memberNo);
    setSelectedMemberName(member.memberName || member.name || '');
    setShowLookupModal(false);
    setCurrentPage(1);
    fetchData(1, member.memberNo);
  };

  const fetchData = async (page: number = 1, searchValue?: string) => {
    if (dividendRate <= 0 || dividendRate > 100) {
      await showDialog('warning', 'Warning', 'Please enter a valid dividend rate between 0.1% and 100%');
      return;
    }

    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const search = searchValue !== undefined ? searchValue : searchText;

      const response = await apiService.getDividendReport(
        selectedWing,
        selectedOffice,
        financialYear,
        dividendRate
      );

      if (response && response.success) {
        let responseData = [];

        if (Array.isArray(response.data)) {
          responseData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          responseData = response.data.data;
        }

        // Apply client-side search filter
        if (search) {
          responseData = responseData.filter((item: DividendData) =>
            item.memberNo.toLowerCase().includes(search.toLowerCase()) ||
            item.memberName.toLowerCase().includes(search.toLowerCase())
          );
        }

        setData(responseData);
        setCurrentPage(page);
        setTotalRecords(responseData.length);

        // Extract unique wings and offices
        if (page === 1 && responseData.length > 0) {
          const uniqueWings = [...new Set(responseData.map((m: any) => m.wing).filter(Boolean))];
          const uniqueOffices = [...new Set(responseData.map((m: any) => m.office).filter(Boolean))];
          setWings(uniqueWings.sort());
          setOffices(uniqueOffices.sort());
        }

        if (responseData.length === 0) {
          await showDialog('info', 'Info', 'No dividend records found');
        }
      } else {
        setData([]);
        setTotalRecords(0);
        await showDialog('warning', 'Warning', 'No data found');
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      await showDialog('error', 'Error', `Failed to load data: ${error.message || 'Unknown error'}`);
      setData([]);
      setTotalRecords(0);
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

  const handlePrint = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'Warning', 'No data available for printing');
      return;
    }
    window.print();
  };

  const handleExportCSV = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'Warning', 'No data available for export');
      return;
    }

    const headers = ['SR', 'MEMBER NO', 'MEMBER NAME', 'DESIGNATION', 'WING', 'SHARE AMOUNT', 'DIVIDEND RATE', 'DIVIDEND AMOUNT'];
    const csvData = data.map((item, index) => [
      index + 1,
      item.memberNo,
      item.memberName,
      item.designation || '-',
      item.wing || '-',
      formatCurrency(item.shareAmount),
      `${dividendRate}%`,
      formatCurrency(item.dividendAmount)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dividend_report_${financialYear}_${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  const totals = useMemo(() => ({
    total: data.length,
    totalShares: data.reduce((acc, curr) => acc + (curr.shareAmount || 0), 0),
    totalDividend: data.reduce((acc, curr) => acc + (curr.dividendAmount || 0), 0)
  }), [data]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);

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
      <div className={`dividend-report-page h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="dividend-report-topbar bg-gradient-to-r from-slate-900 to-slate-900 px-3 py-1.5 flex items-center shrink-0 shadow-lg border-b border-white/5">
          <h1 className="fz-caption font-black text-white tracking-tight uppercase">5.3.1 Dividend Report</h1>
        </div>
        <div className="flex-1 flex overflow-hidden">

        {/* Compact Sidebar */}
        <div className={`dividend-report-sidebar w-80 flex flex-col shrink-0 border-r ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {/* Header */}
          <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg text-white shadow-lg">
                <IndianRupee size={18} />
              </div>
              <div>
                <h1 className={`fz-heading font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>5.3.1 Dividend Report</h1>
                <div className="flex items-center gap-2 mt-0.5 fz-label font-bold text-slate-400 uppercase tracking-wider">
                  <Building2 size={10} className="text-purple-500" />
                  Financial Report
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex-1 p-4 space-y-4 overflow-auto">
            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Member Search</label>
              <Space.Compact className="w-full">
                <Input
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  onBlur={handleMemberBlur}
                  onKeyDown={handleMemberKeyDown}
                  placeholder="e.g. 61002684"
                  suffix={validatingMember ? <Spin size="small" /> : null}
                  className="h-9 font-semibold"
                  style={{ flex: 1 }}
                />
                <Button
                  icon={<Search size={14} />}
                  onClick={() => setShowLookupModal(true)}
                  title="Browse members"
                  className={`h-9 w-9 flex items-center justify-center ${isDark ? 'bg-purple-900/40 hover:bg-purple-800/60 border-purple-700 text-purple-400' : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-600'}`}
                />
              </Space.Compact>
              {selectedMemberName && (
                <div className={`mt-2 fz-label font-bold px-2 py-1.5 rounded truncate ${isDark ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                  {selectedMemberName}
                </div>
              )}
              {searchText && (
                <button
                  onClick={() => { setSearchText(''); setSelectedMemberName(''); setCurrentPage(1); fetchData(1, ''); }}
                  className={`mt-1.5 fz-label font-bold underline ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Clear filter
                </button>
              )}
            </div>

            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Financial Year</label>
              <Select
                value={financialYear}
                onChange={setFinancialYear}
                className="w-full h-9"
              >
                {years.map(y => (
                  <Option key={y} value={y}>{y}</Option>
                ))}
              </Select>
            </div>

            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Dividend Rate (%)</label>
              <InputNumber
                value={dividendRate}
                onChange={(val) => setDividendRate(val || 0)}
                className="w-full h-9"
                min={0}
                max={100}
                step={0.1}
                prefix={<Percent size={14} />}
              />
            </div>

            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Wing</label>
              <Select
                value={selectedWing}
                onChange={setSelectedWing}
                className="w-full h-9"
                placeholder="All Wings"
                allowClear
              >
                {wings.map(w => (
                  <Option key={w} value={w}>{w}</Option>
                ))}
              </Select>
            </div>

            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Office</label>
              <Select
                value={selectedOffice}
                onChange={setSelectedOffice}
                className="w-full h-9"
                placeholder="All Offices"
                allowClear
              >
                {offices.map(o => (
                  <Option key={o} value={o}>{o}</Option>
                ))}
              </Select>
            </div>

            <Button
              type="primary"
              onClick={() => {
                setCurrentPage(1);
                fetchData(1);
              }}
              loading={loading}
              className="w-full h-10 bg-purple-600 hover:bg-purple-700 font-bold fz-body"
              icon={<IndianRupee size={16} />}
            >
              {loading ? 'Calculating...' : 'Calculate Dividend'}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className={`p-4 border-t space-y-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-purple-900/30 border-purple-800' : 'bg-purple-50 border-purple-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`fz-heading font-black ${isDark ? 'text-purple-400' : 'text-purple-800'}`}>{totals.total}</div>
                  <div className={`fz-label font-bold uppercase ${isDark ? 'text-purple-500' : 'text-purple-600'}`}>Members</div>
                </div>
                <Users size={20} className={isDark ? "text-purple-500" : "text-purple-600"} />
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-center">
                <div className={`fz-heading font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>₹{formatCurrency(totals.totalDividend)}</div>
                <div className={`fz-label font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Dividend</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className={`dividend-report-mainbar px-4 py-3 shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`fz-heading font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Dividend Distribution Report</h2>
                <p className={`fz-body mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  FY {financialYear} • Rate: {dividendRate}% • {data.length} records
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  icon={<FileDown size={16} />}
                  onClick={handleExportCSV}
                  disabled={data.length === 0}
                  className="h-9 px-4 fz-body font-bold"
                >
                  CSV
                </Button>
                <Button
                  icon={<Printer size={16} />}
                  onClick={handlePrint}
                  disabled={data.length === 0}
                  className="h-9 px-4 fz-body font-bold"
                >
                  Print
                </Button>
              </div>
            </div>
          </div>

          {/* Legacy Report Table */}
          <div className="flex-1 p-4 overflow-auto">
            <div className={`dividend-report-card rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
                  <span className="text-slate-500 font-bold">Loading dividend data...</span>
                </div>
              ) : paginatedData.length > 0 ? (
                <div className="legacy-report-compact font-mono fz-label">
                  {/* Company Header */}
                    <div className={`text-center mb-4 border-b border-dashed pb-3 p-4 ${isDark ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                      <div className={`fz-body font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className={`fz-label mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                      <div className={`fz-body font-bold mt-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>DIVIDEND DISTRIBUTION REPORT</div>
                      <div className={`fz-label ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Financial Year: {financialYear} • Rate: {dividendRate}% • Generated on {dayjs().format('DD MMMM YYYY')}</div>
                    </div>

                  {/* Legacy Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-400">
                      <thead>
                        <tr className={`${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <th className={`border px-2 py-2 text-left fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>SR</th>
                          <th className={`border px-2 py-2 text-left fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>MEMBER NO</th>
                          <th className={`border px-2 py-2 text-left fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>MEMBER NAME</th>
                          <th className={`border px-2 py-2 text-left fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>DESIGNATION</th>
                          <th className={`border px-2 py-2 text-left fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>WING</th>
                          <th className={`border px-2 py-2 text-right fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>SHARE AMOUNT</th>
                          <th className={`border px-2 py-2 text-center fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>RATE</th>
                          <th className={`border px-2 py-2 text-right fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>DIVIDEND</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((item, index) => (
                          <tr key={`${item.memberNo}-${index}`} className={`transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                            <td className={`border px-2 py-1 fz-label ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-700'}`}>{((currentPage - 1) * pageSize) + index + 1}</td>
                            <td className={`border px-2 py-1 fz-label font-bold ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-800'}`}>{item.memberNo}</td>
                            <td className={`border px-2 py-1 fz-label font-bold ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-800'}`}>{item.memberName}</td>
                            <td className={`border px-2 py-1 fz-label ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-700'}`}>{item.designation || '-'}</td>
                            <td className={`border px-2 py-1 fz-label ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-700'}`}>{item.wing || '-'}</td>
                            <td className={`border px-2 py-1 fz-label text-right font-bold ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-800'}`}>
                              ₹{formatCurrency(item.shareAmount)}
                            </td>
                            <td className={`border px-2 py-1 fz-label text-center font-bold ${isDark ? 'border-slate-700 text-purple-400' : 'border-slate-300 text-purple-700'}`}>
                              {dividendRate}%
                            </td>
                            <td className={`border px-2 py-1 fz-label text-right font-bold ${isDark ? 'border-slate-700 text-emerald-400' : 'border-slate-300 text-emerald-700'}`}>
                              {item.dividendAmount > 0 && <CrDrIndicator type="credit" className="mr-1" />}
                              ₹{formatCurrency(item.dividendAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      
                      {/* Summary Row */}
                      <tfoot>
                        <tr className={`font-bold ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <td colSpan={5} className={`border px-2 py-2 fz-label font-black uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>
                            PAGE: {paginatedData.length} RECORDS | TOTAL: {totals.total} MEMBERS
                          </td>
                          <td className={`border px-2 py-2 fz-label text-right font-black ${isDark ? 'border-slate-600 text-slate-100' : 'border-slate-400 text-slate-800'}`}>
                            ₹{formatCurrency(totals.totalShares)}
                          </td>
                          <td className={`border px-2 py-2 fz-label text-center font-black ${isDark ? 'border-slate-600 text-purple-400' : 'border-slate-400 text-purple-700'}`}>
                            {dividendRate}%
                          </td>
                          <td className={`border px-2 py-2 fz-label text-right font-black ${isDark ? 'border-slate-600 text-emerald-400' : 'border-slate-400 text-emerald-700'}`}>
                            {totals.totalDividend > 0 && <CrDrIndicator type="credit" className="mr-1" />}
                            ₹{formatCurrency(totals.totalDividend)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalRecords > 0 && (
                    <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`fz-label font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
                      </div>
                      
                      <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={totalRecords}
                        onChange={(page, newPageSize) => {
                          if (newPageSize && newPageSize !== pageSize) {
                            setPageSize(newPageSize);
                            setCurrentPage(1);
                          } else {
                            setCurrentPage(page);
                          }
                        }}
                        showSizeChanger
                        showQuickJumper
                        pageSizeOptions={['50', '100', '200', '500']}
                        showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} records`}
                        size="small"
                        className="ant-pagination-compact"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <IndianRupee size={48} className="text-slate-300 mx-auto mb-3" />
                  <h3 className="fz-body font-bold text-slate-400 uppercase tracking-wide">No Dividend Data</h3>
                  <p className="fz-label text-slate-400 mt-1">Set dividend rate and click Calculate Dividend</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Member Lookup Modal — same as Member Ledger Report */}
      <Modal
        open={showLookupModal}
        onCancel={() => setShowLookupModal(false)}
        footer={null}
        width={800}
        styles={{ body: { padding: 0 } }}
        closable={false}
        destroyOnClose
        title={null}
      >
        <MemberLookup
          isModal={true}
          onSelect={handleMemberSelect}
          onClose={() => setShowLookupModal(false)}
        />
      </Modal>

      {/* Print Styles */}
      <style>{`
        @media print {
          .ant-btn, .ant-select, .ant-input, .ant-input-number, .ant-pagination { display: none !important; }
          body { margin: 0; padding: 20px; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
        
        .legacy-report-compact table {
          border-collapse: collapse;
        }
        
        .ant-select-selector {
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important;
          font-weight: 600 !important;
        }
        
        .ant-pagination-compact .ant-pagination-item {
          border-radius: 6px !important;
          font-weight: 600 !important;
          font-size: 12px !important;
        }
        
        .ant-pagination-compact .ant-pagination-item-active {
          background: #7c3aed !important;
          border-color: #7c3aed !important;
        }
        
        .ant-pagination-compact .ant-pagination-item-active a {
          color: white !important;
        }

        /* ── Dividend Report — dark mode (reinforces the page's own isDark styling) ── */
        html.dark .dividend-report-page { background-color: #000000 !important; }
        html.dark .dividend-report-topbar { background-image: none !important; background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dividend-report-sidebar,
        html.dark .dividend-report-mainbar,
        html.dark .dividend-report-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dividend-report-page label { color: #8e8e93 !important; }
        html.dark .dividend-report-page .ant-select-selector,
        html.dark .dividend-report-page .ant-input,
        html.dark .dividend-report-page .ant-input-number,
        html.dark .dividend-report-page .ant-picker { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dividend-report-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default DividendReport;
