import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, ConfigProvider, Select, Pagination, theme as antdTheme } from 'antd';
import { MemberLookupInput, MemberLookupData } from '../../../../../../components/shared/MemberLookup';
import {
  Users,
  Printer,
  FileDown,
  Search,
  Building2,
  UserCheck,
  UserMinus
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../store';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

interface MemberData {
  memberNo: string;
  memberName: string;
  designation: string;
  officeName: string;
  officeNo: string;
  basicPay: number;
  membershipDate: string;
  isActive: boolean;
  shareBalance: number;
}

const VotersWithdrawalList: React.FC = () => {
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedMemberList, setSelectedMemberList] = useState<string>('ACTIVE');
  const [sortBy, setSortBy] = useState<string>('MBNO');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<MemberData[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Load initial data and filters on mount
  useEffect(() => {
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMemberSelect = (memberNo: string, memberData?: MemberLookupData) => {
    setSearchText(memberNo);
    setSelectedMemberName(memberData?.memberName || '');
    setCurrentPage(1);
    fetchData(1, memberNo);
  };

  const fetchData = async (page: number = 1, searchValue?: string) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const search = searchValue !== undefined ? searchValue : searchText;

      const response = await apiService.getVotersList(
        selectedDivision,
        selectedBranch,
        selectedMemberList,
        sortBy,
        pageSize,
        offset,
        search
      );

      if (response && response.success) {
        let responseData = [];

        // Handle different response structures
        if (Array.isArray(response.data)) {
          responseData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          responseData = response.data.data;
        } else if (response.data) {
          responseData = [response.data];
        }

        setData(responseData);
        setCurrentPage(page);

        // Get total count from metadata
        const totalCount = response.metadata?.totalCount || response.data?.metadata?.totalCount || responseData.length;
        setTotalRecords(totalCount);

        // Extract unique divisions and branches from the data (only on first load)
        if (page === 1 && responseData.length > 0) {
          const uniqueDivisions = [...new Set(responseData.map((m: any) => m.officeName).filter(Boolean))];
          const uniqueBranches = [...new Set(responseData.map((m: any) => String(m.officeNo)).filter(Boolean))];
          setDivisions(uniqueDivisions.sort());
          setBranches(uniqueBranches.sort());
        }

        if (responseData.length === 0) {
          await showDialog('info', 'Info', 'No records found matching the criteria');
        }
      } else {
        setData([]);
        setTotalRecords(0);
        await showDialog('warning', 'Warning', 'No data found or API error');
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

    const headers = ['SR', 'MEMBER NO', 'MEMBER NAME', 'DESIGNATION', 'OFFICE', 'JOIN DATE', 'SHARES', 'STATUS'];
    const csvData = data.map((item, index) => [
      index + 1,
      item.memberNo,
      item.memberName,
      item.designation || '-',
      item.officeName || '-',
      item.membershipDate ? dayjs(item.membershipDate).format('DD-MM-YYYY') : '-',
      formatCurrency(item.shareBalance),
      item.isActive ? 'ACTIVE' : 'INACTIVE'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `voters_withdrawal_list_${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  const totals = useMemo(() => ({
    total: data.length,
    active: data.filter(d => d.isActive).length,
    inactive: data.filter(d => !d.isActive).length,
    totalShares: data.reduce((acc, curr) => acc + (curr.shareBalance || 0), 0)
  }), [data]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#059669',
          borderRadius: 8,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="bg-gradient-to-r from-slate-900 to-slate-900 px-3 py-1.5 flex items-center shrink-0 shadow-lg border-b border-white/5">
          <h1 className="fz-caption font-black text-white tracking-tight uppercase">5.2.1 Voters/Withdrawal List</h1>
        </div>
        <div className="flex-1 flex overflow-hidden">

        {/* Compact Sidebar */}
        <div className={`w-80 flex flex-col shrink-0 border-r ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {/* Header */}
          <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-lg text-white shadow-lg">
                <Users size={18} />
              </div>
              <div>
                <h1 className={`fz-heading font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>5.2.1 Voters/Withdrawal List</h1>
                <div className="flex items-center gap-2 mt-0.5 fz-label font-bold text-slate-400 uppercase tracking-wider">
                  <Building2 size={10} className="text-emerald-500" />
                  Member Registry
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex-1 p-4 space-y-4 overflow-auto">
            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Member Search</label>
              <MemberLookupInput
                value={searchText}
                onChange={handleMemberSelect}
                placeholder="Type name or number to search..."
              />
              {selectedMemberName && (
                <div className={`mt-1 fz-label font-semibold truncate ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {selectedMemberName}
                </div>
              )}
              {searchText && (
                <button
                  onClick={() => { setSearchText(''); setSelectedMemberName(''); setCurrentPage(1); fetchData(1, ''); }}
                  className={`mt-1 fz-label font-bold underline ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Clear filter
                </button>
              )}
            </div>

            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Member Status</label>
              <Select
                value={selectedMemberList}
                onChange={setSelectedMemberList}
                className="w-full h-9"
              >
                <Option value="ACTIVE">Active Members</Option>
                <Option value="INACTIVE">Withdrawn Members</Option>
                <Option value="ALL">All Members</Option>
              </Select>
            </div>

            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Division</label>
              <Select
                value={selectedDivision}
                onChange={setSelectedDivision}
                className="w-full h-9"
                placeholder="All Divisions"
                allowClear
              >
                {divisions.map(d => (
                  <Option key={d} value={d}>{d}</Option>
                ))}
              </Select>
            </div>

            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Branch</label>
              <Select
                value={selectedBranch}
                onChange={setSelectedBranch}
                className="w-full h-9"
                placeholder="All Branches"
                allowClear
              >
                {branches.map(b => (
                  <Option key={b} value={b}>Office {b}</Option>
                ))}
              </Select>
            </div>

            <div>
              <label className={`block fz-label font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Sort By</label>
              <Select
                value={sortBy}
                onChange={setSortBy}
                className="w-full h-9"
              >
                <Option value="MBNO">Member Number</Option>
                <Option value="NAME">Name (A-Z)</Option>
                <Option value="DOJ">Join Date</Option>
              </Select>
            </div>

            <Button
              type="primary"
              onClick={() => {
                setCurrentPage(1);
                fetchData(1);
              }}
              loading={loading}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 font-bold fz-body"
              icon={<Search size={16} />}
            >
              {loading ? 'Loading...' : 'Load Data'}
            </Button>
          </div>

          {/* Summary Cards */}

          <div className={`p-4 border-t space-y-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-emerald-900/30 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-emerald-500" />
                  <div>
                    <div className={`fz-heading font-black ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>{totals.active}</div>
                    <div className={`fz-label font-bold uppercase ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>Active</div>
                  </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-rose-900/30 border-rose-800' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-center gap-2">
                  <UserMinus size={16} className="text-rose-500" />
                  <div>
                    <div className={`fz-heading font-black ${isDark ? 'text-rose-400' : 'text-rose-800'}`}>{totals.inactive}</div>
                    <div className={`fz-label font-bold uppercase ${isDark ? 'text-rose-500' : 'text-rose-600'}`}>Withdrawn</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-center">
                <div className={`fz-heading font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{totals.total}</div>
                <div className={`fz-label font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Records</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className={`px-4 py-3 shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`fz-heading font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Member Registry Report</h2>
                <p className={`fz-body mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Showing {data.length} records • {selectedMemberList.toLowerCase()} members
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
            <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
                  <span className="text-slate-500 font-bold">Loading member data...</span>
                </div>
              ) : data.length > 0 ? (
                <div className="legacy-report-compact font-mono fz-label">
                  {/* Company Header */}
                  <div className={`text-center mb-4 border-b border-dashed pb-3 p-4 ${isDark ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                    <div className={`fz-body font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                    <div className={`fz-label mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                    <div className={`fz-body font-bold mt-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>VOTERS/WITHDRAWAL LIST</div>
                    <div className={`fz-label ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Status: {selectedMemberList} • Generated on {dayjs().format('DD MMMM YYYY')}</div>
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
                          <th className={`border px-2 py-2 text-left fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>OFFICE</th>
                          <th className={`border px-2 py-2 text-left fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>JOIN DATE</th>
                          <th className={`border px-2 py-2 text-right fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>SHARES</th>
                          <th className={`border px-2 py-2 text-center fz-label font-bold uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, index) => (
                          <tr key={`${item.memberNo}-${index}-${currentPage}`} className={`transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                            <td className={`border px-2 py-1 fz-label ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-700'}`}>{index + 1}</td>
                            <td className={`border px-2 py-1 fz-label font-bold ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-800'}`}>{item.memberNo}</td>
                            <td className={`border px-2 py-1 fz-label font-bold ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-800'}`}>{item.memberName}</td>
                            <td className={`border px-2 py-1 fz-label ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-700'}`}>{item.designation || '-'}</td>
                            <td className={`border px-2 py-1 fz-label ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-700'}`}>{item.officeName || '-'}</td>
                            <td className={`border px-2 py-1 fz-label ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-700'}`}>
                              {item.membershipDate ? dayjs(item.membershipDate).format('DD-MM-YYYY') : '-'}
                            </td>
                            <td className={`border px-2 py-1 fz-label text-right font-bold ${isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-800'}`}>
                              ₹{formatCurrency(item.shareBalance)}
                            </td>
                            <td className={`border px-2 py-1 text-center ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                              <span className={`px-2 py-1 rounded fz-label font-bold uppercase ${
                                item.isActive
                                  ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-800')
                                  : (isDark ? 'bg-rose-900/50 text-rose-400' : 'bg-rose-100 text-rose-800')
                              }`}>
                                {item.isActive ? 'ACTIVE' : 'WITHDRAWN'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      
                      {/* Summary Row */}
                      <tfoot>
                        <tr className={`font-bold ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <td colSpan={6} className={`border px-2 py-2 fz-label font-black uppercase ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>
                            PAGE: {data.length} RECORDS | TOTAL: {totalRecords} | ACTIVE: {totals.active} | WITHDRAWN: {totals.inactive}
                          </td>
                          <td className={`border px-2 py-2 fz-label text-right font-black ${isDark ? 'border-slate-600 text-slate-100' : 'border-slate-400 text-slate-800'}`}>
                            ₹{formatCurrency(totals.totalShares)}
                          </td>
                          <td className={`border px-2 py-2 text-center fz-label font-black ${isDark ? 'border-slate-600 text-slate-200' : 'border-slate-400 text-slate-800'}`}>
                            PAGE {currentPage}
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
                            // Manually fetch with new page size
                            const offset = 0;
                            setLoading(true);
                            apiService.getVotersList(
                              selectedDivision,
                              selectedBranch,
                              selectedMemberList,
                              sortBy,
                              newPageSize,
                              offset,
                              searchText
                            ).then(async response => {
                              if (response.success && response.data) {
                                const responseData = Array.isArray(response.data) ? response.data : response.data.data || [];
                                setData(responseData);
                                if (response.metadata && response.metadata.totalCount) {
                                  setTotalRecords(response.metadata.totalCount);
                                }
                                await showDialog('info', 'Success', `Loaded ${responseData.length} records`);
                              }
                              setLoading(false);
                            }).catch(async error => {
                              console.error('Error:', error);
                              await showDialog('error', 'Error', 'Failed to load data');
                              setLoading(false);
                            });
                          } else {
                            fetchData(page);
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
                  <Users size={48} className="text-slate-300 mx-auto mb-3" />
                  <h3 className="fz-body font-bold text-slate-400 uppercase tracking-wide">No Member Data</h3>
                  <p className="fz-label text-slate-400 mt-1">Select filters and click Load Data to view records</p>
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
          .ant-btn, .ant-select, .ant-input, .ant-pagination { display: none !important; }
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
          background: #059669 !important;
          border-color: #059669 !important;
        }
        
        .ant-pagination-compact .ant-pagination-item-active a {
          color: white !important;
        }
        
        .ant-pagination-compact .ant-select-selector {
          font-size: 12px !important;
          font-weight: 600 !important;
        }
        
        .ant-pagination-compact .ant-pagination-options-quick-jumper input {
          border-radius: 6px !important;
          font-weight: 600 !important;
        }
      `}</style>
    </ConfigProvider>
  );
};

export default VotersWithdrawalList;
