import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Printer,
  Search,
  Calendar,
  Building,
  RotateCcw,
  BookOpen,
  Users,
  ChevronDown
} from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Spin, Select, theme as antdTheme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { apiService } from '../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

interface JottingItem {
  memberNo: string;
  memberName: string;
  wing: string;
  office: string;
  balance: number;
}

interface HeadMaster {
  code: string;
  headName: string;
}

const JottingReport: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [selectedHead, setSelectedHead] = useState<string>('');
  const [selectedWing, setSelectedWing] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [asOnDate, setAsOnDate] = useState<Dayjs>(dayjs());
  const [sortBy, setSortBy] = useState<string>('MBNO');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<JottingItem[]>([]);

  const [headList, setHeadList] = useState<HeadMaster[]>([]);
  const [wingList, setWingList] = useState<string[]>([]);
  const [officeList, setOfficeList] = useState<string[]>([]);

  const [societyInfo] = useState({
    name: 'Espat Karmchari Co-Operative Credit Society Limited.',
    address: 'Avenue A, Sahakari Sadan, Sector-C, AT Post:Bhilai Nagar,Dist:DURG-490006',
    regNo: 'A.R/DRG/1796',
    tel: '0788-2298736'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const [headsRes, wingsRes, officesRes] = await Promise.all([
        apiService.get('/jotting-report/head-masters'),
        apiService.get('/jotting-report/wings'),
        apiService.get('/jotting-report/offices')
      ]);

      if (headsRes.success && headsRes.data) {
        setHeadList(Array.isArray(headsRes.data) ? headsRes.data : []);
      }

      if (wingsRes.success && wingsRes.data) {
        setWingList(Array.isArray(wingsRes.data) ? wingsRes.data : []);
      }

      if (officesRes.success && officesRes.data) {
        setOfficeList(Array.isArray(officesRes.data) ? officesRes.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch initial data', error);
      await showDialog('error', 'Error', 'Failed to load dropdown data');
    }
  }, []);

  const handleGenerateReport = useCallback(async () => {
    if (!selectedHead || !asOnDate) {
      await showDialog('warning', 'Validation', 'Please select Head Code and As On Date');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.get('/jotting-report', {
        params: {
          headCode: selectedHead,
          asOnDate: asOnDate.format('YYYY-MM-DD'),
          wingName: selectedWing || undefined,
          officeName: selectedOffice || undefined,
          sortBy: sortBy
        }
      });

      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        setReportData(data);
        if (data.length > 0) {
          await showDialog('info', 'Success', `Found ${data.length} records`);
        } else {
          await showDialog('info', 'No Data', 'No records found for the selected criteria');
        }
      } else {
        setReportData([]);
        await showDialog('error', 'Error', response.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Report generation failed', error);
      await showDialog('error', 'Error', 'Failed to generate report');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedHead, asOnDate, selectedWing, selectedOffice, sortBy]);

  const handleReset = useCallback(() => {
    setSelectedHead('');
    setSelectedWing('');
    setSelectedOffice('');
    setAsOnDate(dayjs());
    setSortBy('MBNO');
    setReportData([]);
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExportCSV = useCallback(async () => {
    if (!reportData || reportData.length === 0) {
      await showDialog('warning', 'No Data', 'No data to export');
      return;
    }

    const headers = ['Member No', 'Member Name', 'Wing', 'Office', 'Balance'];
    const rows = reportData.map(item => [
      item.memberNo,
      item.memberName,
      item.wing,
      item.office,
      item.balance.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `JottingReport_${selectedHead}_${dayjs().format('YYYYMMDD')}.csv`;
    link.click();
    await showDialog('info', 'Success', 'CSV exported');
  }, [reportData, selectedHead]);

  const totals = useMemo(() => {
    if (!reportData || reportData.length === 0) {
      return { count: 0, balance: 0 };
    }

    return {
      count: reportData.length,
      balance: reportData.reduce((sum, item) => sum + (item.balance || 0), 0)
    };
  }, [reportData]);

  const selectedHeadName = useMemo(() => {
    const head = headList.find(h => h.code === selectedHead);
    return head ? head.headName : selectedHead;
  }, [headList, selectedHead]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#f59e0b',
          borderRadius: 6,
          fontSize: 12,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <style>{`
        @media print {
          @page { size: portrait; margin: 10mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-show { display: block !important; }
        }
        .print-show { display: none; }
        
        .legacy-jotting {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.5;
          background: ${isDark ? '#0f172a' : 'white'};
          padding: 16px;
        }
        .legacy-jotting .company-header {
          text-align: center;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 8px;
          border-radius: 6px;
          border: 2px solid #f59e0b;
        }
        .legacy-jotting .company-name {
          font-weight: 900;
          font-size: 14px;
          color: #92400e;
          text-shadow: 1px 1px 0px #fef3c7;
        }
        .legacy-jotting .company-address {
          font-size: 10px;
          color: #78350f;
          margin-top: 4px;
        }
        .legacy-jotting .company-contact {
          font-size: 10px;
          color: #78350f;
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          font-weight: 600;
        }
        .legacy-jotting .report-title {
          text-align: center;
          font-weight: 900;
          font-size: 16px;
          margin: 12px 0;
          letter-spacing: 3px;
          color: #f59e0b;
          text-shadow: 2px 2px 0px #fef3c7;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          padding: 8px;
          border-radius: 6px;
          border: 2px solid #f59e0b;
        }
        .legacy-jotting .report-info {
          margin: 12px 0;
          padding: 8px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 6px;
          border: 2px solid #f59e0b;
        }
        .legacy-jotting .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #78350f;
          padding: 3px 0;
          font-weight: 600;
        }
        .legacy-jotting .info-label {
          font-weight: 800;
          color: #92400e;
        }
        .legacy-jotting .table-header {
          display: flex;
          justify-content: space-between;
          font-weight: 900;
          padding: 8px 4px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          margin: 12px 0 6px 0;
          font-size: 11px;
          border-radius: 6px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        .legacy-jotting .table-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 4px;
          border-bottom: 1px solid ${isDark ? '#374151' : '#fde68a'};
          font-size: 10px;
          color: ${isDark ? '#94a3b8' : '#78350f'};
          font-weight: 600;
          transition: all 0.2s;
        }
        .legacy-jotting .table-row:nth-child(even) {
          background: ${isDark ? '#111827' : '#fffbeb'};
        }
        .legacy-jotting .table-row:hover {
          background: ${isDark ? '#1e293b' : '#fef3c7'};
          transform: translateX(4px);
          border-left: 3px solid #f59e0b;
        }
        .legacy-jotting .col-mbno { width: 12%; color: #1e40af; font-weight: 700; }
        .legacy-jotting .col-name { width: 35%; color: #1e293b; font-weight: 700; }
        .legacy-jotting .col-wing { width: 15%; color: #7c3aed; font-weight: 600; }
        .legacy-jotting .col-office { width: 15%; color: #0891b2; font-weight: 600; }
        .legacy-jotting .col-balance { width: 18%; text-align: right; color: #059669; font-weight: 800; }
        .legacy-jotting .total-row {
          display: flex;
          justify-content: space-between;
          font-weight: 900;
          padding: 10px 4px;
          margin-top: 8px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
          border-radius: 6px;
          font-size: 12px;
          color: #92400e;
        }
        .legacy-jotting .total-row .col-balance {
          color: #059669;
          font-size: 14px;
        }
        
        .custom-scrollbar-amber::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 3px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb {
          background: #fcd34d;
          border-radius: 3px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb:hover {
          background: #fbbf24;
        }
      `}</style>

      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50'}`}>
        {/* Ultra-Compact Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between z-10 shadow-sm shrink-0 no-print border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-1.5 rounded-lg text-white shadow-md">
              <BookOpen size={14} />
            </div>
            <div>
              <h1 className={`text-xs font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Jotting Report</h1>
              <div className="flex items-center gap-1 mt-0.5 fz-body font-bold text-slate-400 uppercase tracking-wider leading-none">
                <Users size={8} className="text-amber-500" /> Balance Snapshot
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              icon={<RotateCcw size={11} />}
              size="small"
              className="h-7 px-2 rounded-lg fz-body font-bold uppercase tracking-wide border-slate-200 hover:border-amber-500 hover:text-amber-600"
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              icon={<Printer size={11} />}
              size="small"
              className="h-7 px-2 rounded-lg fz-body font-bold uppercase tracking-wide border-slate-200 hover:border-amber-500 hover:text-amber-600"
              onClick={handlePrint}
              disabled={reportData.length === 0}
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<FileText size={11} />}
              size="small"
              className="h-7 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-lg fz-body font-bold uppercase tracking-wide shadow-md"
              onClick={handleExportCSV}
              disabled={reportData.length === 0}
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* LEFT SIDEBAR: Ultra-Compact Filters (260px) */}
          <div className="w-[260px] flex flex-col gap-2 shrink-0 no-print overflow-y-auto custom-scrollbar-amber">

            {/* Head Code */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <BookOpen size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">Head Code</h3>
              </div>
              <div className="p-2">
                <Select
                  value={selectedHead}
                  onChange={setSelectedHead}
                  placeholder="Select Head"
                  size="small"
                  className="w-full h-7 fz-small font-semibold"
                  showSearch
                  optionFilterProp="children"
                  suffixIcon={<ChevronDown size={12} />}
                >
                  {headList.map(head => (
                    <Option key={head.code} value={head.code}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="fz-small">{head.headName}</span>
                        <span className="fz-body text-slate-400 font-mono">{head.code}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>
            </div>

            {/* As On Date */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <Calendar size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">As On Date</h3>
              </div>
              <div className="p-2">
                <DatePicker
                  className="w-full h-7 fz-small font-semibold"
                  value={asOnDate}
                  onChange={v => v && setAsOnDate(v)}
                  format="DD-MMM-YY"
                />
              </div>
            </div>

            {/* Wing */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <Building size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">Wing</h3>
              </div>
              <div className="p-2">
                <Select
                  value={selectedWing}
                  onChange={setSelectedWing}
                  placeholder="All Wings"
                  size="small"
                  className="w-full h-7 fz-small font-semibold"
                  allowClear
                  suffixIcon={<ChevronDown size={12} />}
                >
                  {wingList.map(wing => (
                    <Option key={wing} value={wing}>{wing}</Option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Office */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <Building size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">Office</h3>
              </div>
              <div className="p-2">
                <Select
                  value={selectedOffice}
                  onChange={setSelectedOffice}
                  placeholder="All Offices"
                  size="small"
                  className="w-full h-7 fz-small font-semibold"
                  allowClear
                  suffixIcon={<ChevronDown size={12} />}
                >
                  {officeList.map(office => (
                    <Option key={office} value={office}>{office}</Option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Sort By */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <Users size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">Sort By</h3>
              </div>
              <div className="p-2">
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  size="small"
                  className="w-full h-7 fz-small font-semibold"
                  suffixIcon={<ChevronDown size={12} />}
                >
                  <Option value="MBNO">Member Number</Option>
                  <Option value="Name">Member Name</Option>
                </Select>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              type="primary"
              block
              size="small"
              icon={<Search size={11} />}
              onClick={handleGenerateReport}
              loading={loading}
              className="h-8 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 font-black uppercase tracking-wider fz-body mt-1 shadow-lg"
            >
              Generate
            </Button>
          </div>

          {/* RIGHT PANEL: Report */}
          <div className={`flex-1 rounded-lg shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-amber-200/60'}`}>
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-3 py-1.5 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-1.5">
                <div className="bg-white/20 p-1 rounded-md shadow-sm">
                  <FileText size={12} className="text-white" />
                </div>
                <div>
                  <h3 className="fz-small font-black text-white uppercase tracking-wide leading-none">Jotting Report</h3>
                  <p className="fz-body font-bold text-amber-200 uppercase mt-0.5 tracking-tight leading-none">
                    {selectedHeadName} - {asOnDate.format('DD-MMM-YY')}
                  </p>
                </div>
              </div>
              <div className="fz-body font-black text-white bg-white/20 px-2 py-0.5 rounded">
                {totals.count} Members
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-2 custom-scrollbar-amber ${isDark ? 'bg-slate-900/40' : 'bg-gradient-to-br from-white to-amber-50/10'}`}>
              <Spin spinning={loading} tip="Loading..." size="small">
                {reportData && reportData.length > 0 ? (
                  <div className="legacy-jotting">
                    {/* Company Header */}
                    <div className="company-header">
                      <div className="company-name">{societyInfo.name}</div>
                      <div className="company-address">{societyInfo.address}</div>
                      <div className="company-contact">
                        <span>Reg No: {societyInfo.regNo}</span>
                        <span>Tel No: {societyInfo.tel}</span>
                      </div>
                    </div>

                    {/* Report Title */}
                    <div className="report-title">JOTTING REPORT</div>

                    {/* Report Info */}
                    <div className="report-info">
                      <div className="info-row">
                        <span className="info-label">Head Code :-</span>
                        <span>{selectedHead} - {selectedHeadName}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">As On Date :-</span>
                        <span>{asOnDate.format('DD-MMM-YYYY')}</span>
                        <span className="info-label">Generated: {dayjs().format('DD-MMM-YYYY HH:mm')}</span>
                      </div>
                      {(selectedWing || selectedOffice) && (
                        <div className="info-row">
                          {selectedWing && <><span className="info-label">Wing :-</span><span>{selectedWing}</span></>}
                          {selectedOffice && <><span className="info-label">Office :-</span><span>{selectedOffice}</span></>}
                        </div>
                      )}
                    </div>

                    {/* Table Header */}
                    <div className="table-header">
                      <span className="col-mbno">Member No</span>
                      <span className="col-name">Member Name</span>
                      <span className="col-wing">Wing</span>
                      <span className="col-office">Office</span>
                      <span className="col-balance">Balance</span>
                    </div>

                    {/* Table Rows */}
                    {reportData.map((item, idx) => (
                      <div key={idx} className="table-row">
                        <span className="col-mbno">{item.memberNo}</span>
                        <span className="col-name">{item.memberName}</span>
                        <span className="col-wing">{item.wing}</span>
                        <span className="col-office">{item.office}</span>
                        <span className="col-balance">{formatCurrency(item.balance)}</span>
                      </div>
                    ))}

                    {/* Total Row */}
                    <div className="total-row">
                      <span className="col-mbno"></span>
                      <span className="col-name">Total : - ({totals.count} Members)</span>
                      <span className="col-wing"></span>
                      <span className="col-office"></span>
                      <span className="col-balance">{formatCurrency(totals.balance)}</span>
                    </div>

                    {/* Print Footer */}
                    <div className="print-show mt-3 fz-body text-center text-slate-500">
                      Generated: {dayjs().format('DD-MMM-YYYY HH:mm')}
                    </div>
                  </div>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <FileText className="text-4xl text-amber-200" />
                    </div>
                    <h4 className="text-slate-400 font-black text-xs uppercase tracking-wider">No Data</h4>
                    <p className="text-slate-300 fz-small mt-1 font-semibold">Select head code and generate report</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default JottingReport;
