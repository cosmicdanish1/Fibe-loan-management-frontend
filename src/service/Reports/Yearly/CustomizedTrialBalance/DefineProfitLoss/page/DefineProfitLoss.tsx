import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Save,
  CheckSquare,
  Square,
  Search,
  FileSpreadsheet,
  LayoutTemplate,
  RefreshCw,
  Info,
  TrendingUp // Changed icon for PL
} from 'lucide-react';
import { ConfigProvider, Input, Button, Table, Select, Spin, Checkbox, theme as antdTheme } from 'antd';
import { apiService } from '../../../../../../services/api';
import { usePageToolbarActions } from '../../../../../../utils/pageToolbarActions';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../store';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

interface PLItem {
  key: string;
  srNo: number;
  particulars: string;
  codeFrom: string;
  codeTo: string;
  selected: boolean;
}

const DefineProfitLoss: React.FC = () => {
  const [scheduleName, setScheduleName] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [tableData, setTableData] = useState<PLItem[]>(() => {
    return Array.from({ length: 20 }, (_, index) => ({
      key: `${index + 1}`,
      srNo: index + 1,
      particulars: '',
      codeFrom: '',
      codeTo: '',
      selected: false
    }));
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await apiService.getAllReportSchedules('PL');
      if (response.success && response.data) {
        setSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const loadScheduleDetails = async (id: number) => {
    setLoading(true);
    try {
      const response = await apiService.getReportScheduleDetails(id);
      if (response.success && response.data) {
        const schedule = response.data;
        setScheduleName(schedule.schedule_name);
        setTemplateName(schedule.template_name);

        const details = schedule.details || [];
        const newTableData = Array.from({ length: Math.max(20, details.length + 5) }, (_, index) => {
          const detail = details[index];
          return {
            key: `${index + 1}`,
            srNo: index + 1,
            particulars: detail ? detail.particulars : '',
            codeFrom: detail ? detail.code_from : '',
            codeTo: detail ? detail.code_to : '',
            selected: false
          };
        });
        setTableData(newTableData);
        setSelectedScheduleId(id);
        await showDialog('info', 'Success', `Loaded schedule: ${schedule.schedule_name}`);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      await showDialog('error', 'Error', 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!scheduleName || !templateName) {
      await showDialog('error', 'Error', 'Please enter Schedule Name and Template Name');
      return;
    }

    const validRows = tableData.filter(row =>
      row.particulars.trim() && row.codeFrom.trim() && row.codeTo.trim()
    );

    if (validRows.length === 0) {
      await showDialog('error', 'Error', 'Please add at least one valid row');
      return;
    }

    setSaving(true);
    try {
      const details = validRows.map(row => ({
        particulars: row.particulars,
        code_from: row.codeFrom,
        code_to: row.codeTo
      }));

      const response = await apiService.createReportSchedule(
        scheduleName,
        templateName,
        details,
        'PL',
        selectedScheduleId || undefined
      );

      if (response.success) {
        await showDialog('info', 'Success', `Profit & Loss Schedule saved successfully!`);
        fetchSchedules();
      } else {
        await showDialog('error', 'Error', 'Failed to save schedule');
      }
    } catch (error) {
      console.error('Error saving:', error);
      await showDialog('error', 'Error', 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (key: string, field: keyof PLItem, value: any) => {
    setTableData(prev =>
      prev.map(item => item.key === key ? { ...item, [field]: value } : item)
    );
  };

  const addNewRow = () => {
    const newRow: PLItem = {
      key: Date.now().toString(),
      srNo: tableData.length + 1,
      particulars: '',
      codeFrom: '',
      codeTo: '',
      selected: false
    };
    setTableData(prev => [...prev, newRow]);
  };

  const handleReset = () => {
    setScheduleName('');
    setTemplateName('');
    setSelectedScheduleId(null);
    setTableData(Array.from({ length: 20 }, (_, index) => ({
      key: `${index + 1}`,
      srNo: index + 1,
      particulars: '',
      codeFrom: '',
      codeTo: '',
      selected: false
    })));
    showDialog('info', 'Info', 'Form reset');
  };

  const columns = [
    {
      title: '',
      dataIndex: 'selected',
      width: 40,
      render: (selected: boolean, record: PLItem) => (
        <div
          onClick={() => updateRow(record.key, 'selected', !selected)}
          className="cursor-pointer flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
        >
          {selected ? <CheckSquare size={16} /> : <Square size={16} />}
        </div>
      )
    },
    {
      title: 'SR',
      dataIndex: 'srNo',
      width: 50,
      align: 'center' as const,
      render: (val: number) => <span className="fz-caption font-bold text-slate-400">{val}</span>
    },
    {
      title: 'EXPENSES / INCOME HEAD',
      dataIndex: 'particulars',
      render: (val: string, record: PLItem) => (
        <input
          value={val}
          onChange={(e) => updateRow(record.key, 'particulars', e.target.value)}
          className="w-full h-7 px-2 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none fz-caption font-medium text-slate-700 transition-all placeholder:text-slate-300"
          placeholder="Enter description..."
        />
      )
    },
    {
      title: 'FROM CODE',
      dataIndex: 'codeFrom',
      width: 120,
      render: (val: string, record: PLItem) => (
        <div className="relative">
          <input
            value={val}
            onChange={(e) => updateRow(record.key, 'codeFrom', e.target.value)}
            className="w-full h-7 px-2 bg-slate-50 border border-slate-100 rounded fz-caption font-bold text-slate-600 focus:bg-white focus:border-indigo-500 outline-none transition-all uppercase text-center"
            placeholder="E1001"
          />
        </div>
      )
    },
    {
      title: 'TO CODE',
      dataIndex: 'codeTo',
      width: 120,
      render: (val: string, record: PLItem) => (
        <input
          value={val}
          onChange={(e) => updateRow(record.key, 'codeTo', e.target.value)}
          className="w-full h-7 px-2 bg-slate-50 border border-slate-100 rounded fz-caption font-bold text-slate-600 focus:bg-white focus:border-indigo-500 outline-none transition-all uppercase text-center"
          placeholder="E1999"
        />
      )
    }
  ];

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: 'Save Definition',
    saveEnabled: !saving,
  });

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 6,
          fontFamily: "'Inter', sans-serif",
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <div className={`define-pl-page h-screen flex flex-col font-sans selection:bg-indigo-100 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Spin spinning={loading} tip="Loading definition..." size="large">

          {/* Header */}
          <div className={`define-pl-header px-4 py-3 flex items-center justify-between z-20 shadow-sm shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-50">
                <Settings size={18} />
              </div>
              <div>
                <h1 className="fz-body font-black text-slate-800 tracking-tight leading-none uppercase">Define Profit & Loss</h1>
                <div className="flex items-center gap-1.5 mt-1 fz-caption font-bold text-slate-400 uppercase tracking-widest leading-none">
                  <TrendingUp size={10} className="text-indigo-500" /> FINANCIAL CONFIGURATION
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="h-8 px-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg fz-caption font-bold uppercase tracking-wide transition-all flex items-center gap-2"
              >
                <RefreshCw size={12} />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl fz-caption font-black shadow-md shadow-indigo-100 transition-all flex items-center gap-2 transform active:scale-95 uppercase tracking-widest"
              >
                {saving ? <Spin size="small" /> : <Save size={14} />}
                Save Definition
              </button>
            </div>
          </div>

          {/* Control Bar */}
          <div className={`define-pl-controlbar px-4 py-3 grid grid-cols-12 gap-4 items-end shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-10 shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="col-span-4 space-y-1.5">
              <label className="fz-caption font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Search size={10} /> Load Existing Schedule
              </label>
              <Select
                showSearch
                className="w-full !h-9"
                placeholder="Search schedule to edit..."
                optionFilterProp="children"
                onChange={loadScheduleDetails}
                value={selectedScheduleId}
                variant="borderless"
                popupClassName="!rounded-xl !shadow-xl !p-1"
                dropdownStyle={{ padding: '4px' }}
              >
                {schedules.map(s => <Option key={s.id} value={s.id}>{s.schedule_name}</Option>)}
              </Select>
            </div>

            <div className="col-span-4 space-y-1.5">
              <label className="fz-caption font-black text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <LayoutTemplate size={10} /> Schedule Name
              </label>
              <input
                value={scheduleName}
                onChange={e => setScheduleName(e.target.value)}
                className="w-full h-9 px-3 bg-indigo-50/50 border border-indigo-100 rounded-lg fz-label font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-indigo-200"
                placeholder="e.g. FY 2024-25 Income/Exp"
              />
            </div>

            <div className="col-span-4 space-y-1.5">
              <label className="fz-caption font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                Template Name
              </label>
              <input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-100 rounded-lg fz-label font-bold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                placeholder="e.g. Standard P&L"
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`flex-1 overflow-hidden flex flex-col p-4 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
            <div className={`define-pl-card flex-1 border rounded-2xl shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              {/* Table Header Action */}
              <div className={`px-4 py-2 border-b flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-slate-100 bg-slate-50/30'}`}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <span className="fz-caption font-black text-slate-500 uppercase tracking-wide">Income & Expense Heads</span>
                </div>
                <button
                  onClick={addNewRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all fz-caption font-bold uppercase"
                >
                  <Plus size={12} /> Add Line
                </button>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-auto">
                <Table
                  dataSource={tableData}
                  columns={columns as any}
                  pagination={false}
                  size="small"
                  className="custom-table border-none"
                  rowClassName="hover:bg-slate-50/80 transition-colors group"
                  sticky
                />
              </div>

              {/* Stats Footer */}
              <div className="define-pl-footer px-4 py-2 border-t border-slate-100 bg-slate-50 fz-caption font-bold text-slate-400 flex justify-between items-center">
                <span>Total Rows: {tableData.length}</span>
                <div className="flex items-center gap-2">
                  <Info size={12} />
                  <span>Define Income and Expense ranges</span>
                </div>
              </div>
            </div>
          </div>

        </Spin>

        {/* Custom Styles for Ant Design overrides */}
        <style>{`
          .custom-table .ant-table-thead > tr > th {
            background: #ffffff !important;
            border-bottom: 2px solid #f1f5f9 !important;
            color: #64748b !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            padding: 10px 8px !important;
          }
          .custom-table .ant-table-tbody > tr > td {
            padding: 4px 8px !important;
            border-bottom: 1px solid #f8fafc !important;
          }
          .custom-table .ant-table-tbody > tr > td {
            background: transparent;
          }
          .custom-table .ant-table-tbody > tr:hover > td {
            background: #f8fafc !important;
          }
          .ant-select-selector {
            background-color: #f8fafc !important;
            border: 1px solid #f1f5f9 !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #334155 !important;
          }

          /* ── Define Profit & Loss — dark mode ── */
          html.dark .define-pl-page { background-color: #000000 !important; }
          html.dark .define-pl-header,
          html.dark .define-pl-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; background-image: none !important; }
          html.dark .define-pl-controlbar,
          html.dark .define-pl-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
          html.dark .define-pl-page h1,
          html.dark .define-pl-page span,
          html.dark .define-pl-page input,
          html.dark .define-pl-page label { color: #f5f5f7 !important; }
          html.dark .define-pl-page label,
          html.dark .define-pl-page .text-slate-400,
          html.dark .define-pl-page .text-slate-500 { color: #8e8e93 !important; }
          html.dark .define-pl-page input { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
          html.dark .define-pl-page .custom-table .ant-table-thead > tr > th { background: #1c1c1e !important; color: #8e8e93 !important; border-color: rgba(255,255,255,.07) !important; }
          html.dark .define-pl-page .custom-table .ant-table-tbody > tr > td { border-color: rgba(255,255,255,.07) !important; color: #f5f5f7 !important; }
          html.dark .define-pl-page .custom-table .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,.05) !important; }
          html.dark .define-pl-page .ant-select-selector { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
          html.dark .define-pl-page button { color: #f5f5f7 !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default DefineProfitLoss;
