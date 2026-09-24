import React, { useState, useEffect } from 'react';
import { Select, Button, Table, DatePicker, Spin, Empty, ConfigProvider, theme as antdTheme } from 'antd';
import {
  Printer,
  Search,
  RefreshCw,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  BarChart2
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

interface Schedule {
  id: number;
  schedule_name: string;
  template_name: string;
}

interface LineItem {
  particulars: string;
  codeFrom: string;
  codeTo: string;
  current: {
    receipts: number;
    payments: number;
    balance: number;
  };
  progressive: {
    receipts: number;
    payments: number;
    balance: number;
  };
}

const OpenProfitLoss: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [financialYearStart, setFinancialYearStart] = useState<Dayjs | null>(dayjs().startOf('year').month(3).date(1));

  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<LineItem[]>([]);
  const [grandTotals, setGrandTotals] = useState<any>(null);
  const [societyInfo, setSocietyInfo] = useState<{ name: string; address: string } | null>(null);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await apiService.getAllReportSchedules('PL');
      if (response.success && Array.isArray(response.data)) {
        setSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      await showDialog('error', 'Error', 'Failed to load schedules');
    }
  };

  const handleSearch = async () => {
    if (!selectedSchedule || !fromDate || !toDate || !financialYearStart) {
      await showDialog('error', 'Error', 'Please select all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.executeReportSchedule(
        selectedSchedule,
        fromDate.format('YYYY-MM-DD'),
        toDate.format('YYYY-MM-DD'),
        financialYearStart.format('YYYY-MM-DD')
      );

      if (response.success && response.data && response.data.lineItems) {
        setData(response.data.lineItems);
        setGrandTotals(response.data.grandTotals);
        setSocietyInfo({
          name: response.data.societyName,
          address: response.data.societyAddress
        });
        await showDialog('info', 'Success', 'Report generated successfully');
      } else {
        setData([]);
        setGrandTotals(null);
        await showDialog('warning', 'Warning', response.error || 'No data found');
      }
    } catch (error) {
      console.error('Error executing report:', error);
      await showDialog('error', 'Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const columns = [
    {
      title: 'INCOME / EXPENSE HEAD',
      dataIndex: 'particulars',
      width: 300,
      fixed: 'left',
      render: (text: string) => <span className="font-bold text-slate-700 fz-caption uppercase tracking-tight">{text}</span>
    },
    {
      title: 'CODES',
      width: 100,
      render: (_: any, record: LineItem) => (
        <span className="px-2 py-0.5 bg-slate-100 rounded fz-caption font-bold text-slate-500 border border-slate-200">
          {record.codeFrom}-{record.codeTo}
        </span>
      )
    },
    {
      title: 'CURRENT YEAR',
      className: 'bg-indigo-50/30',
      children: [
        {
          title: 'AMOUNT',
          dataIndex: ['current', 'balance'],
          width: 130,
          align: 'right',
          render: (val: number) => (
            <span className={`fz-caption font-bold ${val < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              <CrDrIndicator type={val < 0 ? 'debit' : 'credit'} className="mr-1 no-print" />
              {formatCurrency(Math.abs(val))} {val < 0 ? 'Dr' : 'Cr'}
            </span>
          )
        }
      ]
    },
    {
      title: 'PREVIOUS YEAR (YTD)',
      children: [
        {
          title: 'AMOUNT',
          dataIndex: ['progressive', 'balance'],
          width: 130,
          align: 'right',
          render: (val: number) => (
            <span className={`fz-caption font-bold ${val < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              <CrDrIndicator type={val < 0 ? 'debit' : 'credit'} className="mr-1 no-print" />
              {formatCurrency(Math.abs(val))} {val < 0 ? 'Dr' : 'Cr'}
            </span>
          )
        }
      ]
    }
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#4f46e5',
          fontFamily: "'Inter', sans-serif",
          borderRadius: 6,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        }
      }}
    >
      <div className={`open-profitloss-page h-screen flex flex-col font-sans selection:bg-indigo-100 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>

        {/* Print Styles */}
        <style>{`
          @media print {
            @page { size: landscape; margin: 5mm; }
            body { background: white !important; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-header { display: block !important; }
            .ant-table-wrapper { width: 100% !important; }
            .ant-table-thead > tr > th { background: #f1f5f9 !important; color: #000 !important; }
            .ant-table-content { overflow: visible !important; }
            .h-screen { height: auto !important; overflow: visible !important; }
          }
          .print-header { display: none; }
          .custom-table .ant-table-thead > tr > th {
            background: #ffffff;
            font-size: 10px;
            font-weight: 900;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 8px 8px;
            border-bottom: 2px solid #f1f5f9;
          }
           .custom-table .ant-table-tbody > tr > td {
             padding: 4px 8px;
           }
             .custom-table .ant-table-summary {
               background: #f8fafc;
             }

          /* ── Open Profit & Loss — dark mode ── */
          html.dark .open-profitloss-page .ant-select-selector,
          html.dark .open-profitloss-page .ant-picker { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
          html.dark .open-profitloss-page .ant-picker input,
          html.dark .open-profitloss-page .ant-select-selection-item { color: #f5f5f7 !important; }
          html.dark .open-profitloss-table .ant-table,
          html.dark .open-profitloss-table .ant-table-container,
          html.dark .open-profitloss-table .ant-table-content { background-color: #1c1c1e !important; }
          html.dark .open-profitloss-table .ant-table-thead > tr > th { background-color: #1c1c1e !important; color: #8e8e93 !important; border-color: rgba(255,255,255,.08) !important; }
          html.dark .open-profitloss-table .ant-table-tbody > tr > td { background-color: #1c1c1e !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.07) !important; }
          html.dark .open-profitloss-table .ant-table-summary,
          html.dark .open-profitloss-table .ant-table-summary > tr > td,
          html.dark .open-profitloss-table .bg-slate-50 { background-color: #0c0c0e !important; color: #f5f5f7 !important; }
          html.dark .open-profitloss-page .bg-white { background-color: #1c1c1e !important; }
        `}</style>

        {/* Header */}
        <div className={`px-5 py-3 flex items-center justify-between z-20 shadow-sm shrink-0 no-print border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
              <TrendingUp className="text-white" size={20} />
            </div>
            <div>
              <h1 className={`fz-body font-black tracking-tight uppercase leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Profit & Loss A/c</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="fz-caption font-bold text-slate-400 uppercase tracking-widest leading-none">Financial Statements</span>
                {data.length > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded fz-caption font-bold uppercase">
                    Generated
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchSchedules} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => window.print()}
              disabled={data.length === 0}
              className="h-9 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl fz-caption font-bold shadow-md shadow-slate-200 transition-all flex items-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={14} /> Print Report
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={`px-5 py-3 grid grid-cols-12 gap-4 items-end shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-10 shrink-0 no-print border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="col-span-3 space-y-1.5">
            <label className="fz-caption font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Filter size={10} /> Report Schedule
            </label>
            <Select
              showSearch
              className="w-full !h-9"
              placeholder="Select Schedule"
              value={selectedSchedule}
              onChange={setSelectedSchedule}
              variant="borderless"
              popupClassName="!rounded-xl !shadow-xl !p-1"
              dropdownStyle={{ padding: '4px' }}
            >
              {schedules.map(s => <Option key={s.id} value={s.id}>{s.schedule_name}</Option>)}
            </Select>
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="fz-caption font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Calendar size={10} /> From Date
            </label>
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              className="w-full h-9 border-slate-200 rounded-lg fz-label font-bold"
              format="DD-MMM-YYYY"
              allowClear={false}
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="fz-caption font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Calendar size={10} /> To Date
            </label>
            <DatePicker
              value={toDate}
              onChange={setToDate}
              className="w-full h-9 border-slate-200 rounded-lg fz-label font-bold"
              format="DD-MMM-YYYY"
              allowClear={false}
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <label className="fz-caption font-black text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Calendar size={10} /> FY Start
            </label>
            <DatePicker
              value={financialYearStart}
              onChange={setFinancialYearStart}
              className="w-full h-9 bg-indigo-50/50 border-indigo-100 rounded-lg fz-label font-bold"
              format="DD-MMM-YYYY"
              allowClear={false}
            />
          </div>

          <div className="col-span-3">
            <Button
              type="primary"
              icon={<Search size={14} />}
              loading={loading}
              onClick={handleSearch}
              block
              className="h-9 bg-indigo-600 hover:bg-indigo-700 border-none rounded-xl shadow-md shadow-indigo-100 fz-caption font-black uppercase tracking-widest"
            >
              Load Data
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 overflow-hidden flex flex-col p-5 relative ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>

          {/* Print Header */}
          <div className="print-header text-center mb-6">
            <h1 className="fz-heading font-black uppercase tracking-wide text-slate-800">{societyInfo?.name}</h1>
            <p className="fz-caption text-slate-500 font-bold uppercase tracking-widest mb-4">{societyInfo?.address}</p>
            <div className="border-b-2 border-slate-800 w-1/3 mx-auto mb-4"></div>
            <h2 className="fz-heading font-bold uppercase mb-1">Profit & Loss A/c</h2>
            <p className="fz-caption font-medium text-slate-600">
              Period: {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}
            </p>
          </div>

          {/* Metrics Overview (No Print) */}
          {grandTotals && (
            <div className="grid grid-cols-4 gap-4 mb-4 no-print shrink-0">
              <div className={`p-3 rounded-xl border shadow-sm flex items-center justify-between ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div>
                  <p className={`fz-caption font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Income</p>
                  <p className={`fz-body font-black mt-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{formatCurrency(grandTotals.currentAssets || grandTotals.currentReceipts)}</p>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                  <TrendingUp size={16} />
                </div>
              </div>

              <div className={`p-3 rounded-xl border shadow-sm flex items-center justify-between ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div>
                  <p className={`fz-caption font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Expense</p>
                  <p className={`fz-body font-black mt-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {formatCurrency(grandTotals.currentLiabilities || grandTotals.currentPayments)}
                  </p>
                </div>
                <div className="bg-rose-50 p-2 rounded-lg text-rose-600">
                  <TrendingDown size={16} />
                </div>
              </div>

              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-lg flex items-center justify-between col-span-2">
                <div>
                  <p className="fz-caption font-black text-slate-400 uppercase tracking-widest">Net Profit / (Loss)</p>
                  <p className={`fz-body font-black mt-1 ${grandTotals.currentBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(Math.abs(grandTotals.currentBalance))} {grandTotals.currentBalance >= 0 ? '(Profit)' : '(Loss)'}
                  </p>
                </div>
                <div className="bg-white/10 p-2 rounded-lg text-white">
                  <BarChart2 size={16} />
                </div>
              </div>
            </div>
          )}

          {data.length > 0 ? (
            <div className={`flex-1 border rounded-2xl shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex-1 overflow-auto">
                <Table
                  dataSource={data}
                  columns={columns as any}
                  pagination={false}
                  size="small"
                  className="custom-table open-profitloss-table"
                  scroll={{ x: 1000, y: 500 }}
                  bordered={false}
                  summary={() => (
                    grandTotals && (
                      <Table.Summary fixed="bottom">
                        <Table.Summary.Row className="bg-slate-50 font-black">
                          <Table.Summary.Cell index={0} className="fz-caption uppercase p-3">TOTAL</Table.Summary.Cell>
                          <Table.Summary.Cell index={1}></Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right" className="fz-caption p-2">
                            {formatCurrency(grandTotals.currentReceipts)}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right" className="fz-caption p-2">
                            {formatCurrency(grandTotals.progressiveReceipts)}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )
                  )}
                />
              </div>
            </div>
          ) : (
            <div className={`flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span className="text-slate-400 font-bold fz-label uppercase">No Data Generated</span>}
              />
            </div>
          )}

          {/* Print Footer */}
          <div className="print-header mt-8 pt-8 border-t border-slate-200">
            <div className="flex justify-between fz-caption font-bold uppercase text-slate-800">
              <div className="text-center">
                <p className="mb-8">______________________</p>
                <p>Prepared By</p>
              </div>
              <div className="text-center">
                <p className="mb-8">______________________</p>
                <p>Checked By</p>
              </div>
              <div className="text-center">
                <p className="mb-8">______________________</p>
                <p>Secretary / Manager</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ConfigProvider>
  );
};

export default OpenProfitLoss;
