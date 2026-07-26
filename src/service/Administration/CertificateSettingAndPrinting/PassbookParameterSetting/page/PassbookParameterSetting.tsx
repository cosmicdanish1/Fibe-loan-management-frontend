import React, { useState, useEffect } from 'react';
import { ConfigProvider, Select, Checkbox, message, Modal, List, Tag, theme as antdTheme } from 'antd';
import { Book, Building2, FileText, Save, Search, Layers, Layout, Hash, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../../../../services/api';

const { Option } = Select;

interface BankPassbookSettings { formatName: string; accountType: string; }
interface PageSettings { bankFormat: string; totalPages: string; linesPerPage: string; lineStartNumber: string; incrementLevel: string; }
interface DetailField { name: string; row: number; col: number; visible: boolean; }
interface FirstPageField { name: string; row: number; col: number; displayNameFlag: boolean; visibleFlag: boolean; }

interface PassbookParameters {
  id?: number;
  isDefault: boolean;
  bankPassbookSettings: BankPassbookSettings;
  pageSettings: PageSettings;
  detailPageSetting: { bankFormat: string; fields: DetailField[] };
  firstPageSetting: { formatForBank: string; fields: FirstPageField[] };
}

const DEFAULT_PARAMS: PassbookParameters = {
  isDefault: true,
  bankPassbookSettings: { formatName: '', accountType: 'Saving Bank - SE' },
  pageSettings: { bankFormat: '', totalPages: '', linesPerPage: '', lineStartNumber: '', incrementLevel: '' },
  detailPageSetting: {
    bankFormat: '',
    fields: [
      { name: 'Date',        row: 1, col: 1, visible: true  },
      { name: 'Particulars', row: 1, col: 2, visible: true  },
      { name: 'Withdrawal', row: 1, col: 3, visible: true  },
      { name: 'Deposit',    row: 1, col: 4, visible: true  },
      { name: 'Balance',    row: 1, col: 5, visible: true  },
      { name: 'Initial',    row: 1, col: 6, visible: false },
    ],
  },
  firstPageSetting: {
    formatForBank: '',
    fields: [
      { name: 'Member Name',    row: 1, col: 1, displayNameFlag: true,  visibleFlag: true  },
      { name: 'Account Number', row: 2, col: 1, displayNameFlag: true,  visibleFlag: true  },
      { name: 'Address',        row: 3, col: 1, displayNameFlag: true,  visibleFlag: true  },
      { name: 'Phone',          row: 4, col: 1, displayNameFlag: false, visibleFlag: true  },
      { name: 'Opening Date',   row: 5, col: 1, displayNameFlag: true,  visibleFlag: true  },
    ],
  },
};

const inputCls = 'w-full h-10 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors';
const numCls  = `${inputCls} text-center`;

const PassbookParameterSetting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bank' | 'page' | 'detail' | 'first'>('bank');
  const [loading, setLoading] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [params, setParams] = useState<PassbookParameters>(DEFAULT_PARAMS);

  const mapBackendToFrontend = (b: any) => {
    setParams({
      id: b.id,
      isDefault: b.isDefault,
      bankPassbookSettings: { formatName: b.templateName, accountType: b.accountType },
      pageSettings: {
        bankFormat: b.pageSettings?.bankFormat || '',
        totalPages: b.pageSettings?.totalPages?.toString() || '',
        linesPerPage: b.pageSettings?.linesPerPage?.toString() || '',
        lineStartNumber: b.pageSettings?.lineStartNumber?.toString() || '',
        incrementLevel: b.pageSettings?.incrementLevel?.toString() || '',
      },
      detailPageSetting: {
        bankFormat: b.pageSettings?.bankFormat || '',
        fields: (b.fields || []).filter((f: any) => f.fieldType === 'TRANSACTION').map((f: any) => ({
          name: f.name, row: f.rowPos, col: f.colPos, visible: f.isVisible,
        })),
      },
      firstPageSetting: {
        formatForBank: b.pageSettings?.bankFormat || '',
        fields: (b.fields || []).filter((f: any) => f.fieldType === 'MANIFEST').map((f: any) => ({
          name: f.name, row: f.rowPos, col: f.colPos, displayNameFlag: f.isLabelVisible, visibleFlag: f.isVisible,
        })),
      },
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiService.getPassbookTemplates();
        if (resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
          const def = resp.data.find((t: any) => t.isDefault && t.accountType === 'Saving Bank - SE')
            || resp.data.find((t: any) => t.isDefault)
            || resp.data[0];
          mapBackendToFrontend(def);
        }
      } catch { /* keep defaults */ }
    })();
  }, []);

  const setBankField = (field: keyof BankPassbookSettings, value: string) =>
    setParams(prev => ({ ...prev, bankPassbookSettings: { ...prev.bankPassbookSettings, [field]: value } }));

  const setPageField = (field: keyof PageSettings, value: string) =>
    setParams(prev => ({ ...prev, pageSettings: { ...prev.pageSettings, [field]: value } }));

  const handleSave = async () => {
    if (!params.bankPassbookSettings.formatName) { message.error('Please enter a format name'); return; }
    setLoading(true);
    try {
      const payload = {
        templateName: params.bankPassbookSettings.formatName,
        accountType: params.bankPassbookSettings.accountType,
        isDefault: params.isDefault,
        pageSettings: {
          bankFormat: params.pageSettings.bankFormat,
          totalPages: parseInt(params.pageSettings.totalPages) || 0,
          linesPerPage: parseInt(params.pageSettings.linesPerPage) || 0,
          lineStartNumber: parseInt(params.pageSettings.lineStartNumber) || 1,
          incrementLevel: parseInt(params.pageSettings.incrementLevel) || 1,
        },
        fields: [
          ...params.detailPageSetting.fields.map(f => ({ name: f.name, rowPos: f.row, colPos: f.col, isVisible: f.visible, fieldType: 'TRANSACTION' })),
          ...params.firstPageSetting.fields.map(f => ({ name: f.name, rowPos: f.row, colPos: f.col, isLabelVisible: f.displayNameFlag, isVisible: f.visibleFlag, fieldType: 'MANIFEST' })),
        ],
      };
      const resp = params.id
        ? await apiService.updatePassbookTemplate(params.id, payload)
        : await apiService.createPassbookTemplate(payload);
      if (resp.success) {
        message.success('Passbook parameters saved');
        if (resp.data?.id) setParams(prev => ({ ...prev, id: resp.data.id }));
      } else { message.error(resp.message || 'Save failed'); }
    } catch { message.error('Connection error'); }
    finally { setLoading(false); }
  };

  const handleFind = async () => {
    setLoading(true);
    try {
      const resp = await apiService.getPassbookTemplates();
      if (resp.success) { setTemplates(resp.data); setShowFindModal(true); }
      else message.error('Failed to load templates');
    } catch { message.error('Connection error'); }
    finally { setLoading(false); }
  };

  const TABS = [
    { id: 'bank',   label: 'Identity',     icon: <Building2 size={14} /> },
    { id: 'page',   label: 'Page Layout',  icon: <Layers size={14} /> },
    { id: 'detail', label: 'Transactions', icon: <Layout size={14} /> },
    { id: 'first',  label: 'First Page',   icon: <FileText size={14} /> },
  ];

  const PAGE_FIELDS = [
    { label: 'Bank Format',     field: 'bankFormat',       icon: <Building2 size={13} /> },
    { label: 'Total Pages',     field: 'totalPages',       icon: <Hash size={13} /> },
    { label: 'Lines per Page',  field: 'linesPerPage',     icon: <FileText size={13} /> },
    { label: 'Start Line No.',  field: 'lineStartNumber',  icon: <ChevronRight size={13} /> },
    { label: 'Increment Level', field: 'incrementLevel',   icon: <Layers size={13} /> },
  ] as const;

  return (
    <ConfigProvider theme={{ algorithm: antdTheme.darkAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 8, colorBgContainer: '#1e293b', colorBorder: '#334155' } }}>
      <div className="h-screen flex flex-col overflow-hidden bg-[#0f172a] text-slate-100 font-sans">

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30"><Book size={18} className="text-white" /></div>
            <div>
              <h1 className="text-sm font-black text-white uppercase">Passbook Parameter Setting</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Configure passbook layout, page settings and field positions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleFind} disabled={loading}
              className="h-9 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
              <Search size={13} /> Find
            </button>
            <button onClick={handleSave} disabled={loading}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
              <Save size={13} /> {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-0 px-4 shrink-0 border-b border-slate-700 bg-slate-800 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all relative whitespace-nowrap flex items-center gap-2
                ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
              {tab.icon} {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="pb-tab-indicator"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
              className="h-full overflow-auto p-5">
              <div className="max-w-3xl mx-auto">

                {/* Identity Tab */}
                {activeTab === 'bank' && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                      <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400"><Building2 size={16} /></div>
                      <div>
                        <h2 className="text-sm font-black text-white">Identity</h2>
                        <p className="text-xs text-slate-400">Template name and account type</p>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Format Name</label>
                        <div className="relative">
                          <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input value={params.bankPassbookSettings.formatName}
                            onChange={e => setBankField('formatName', e.target.value)}
                            placeholder="IDENT_V1"
                            className="w-full h-10 bg-slate-700 border border-slate-600 text-white rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Type</label>
                        <Select value={params.bankPassbookSettings.accountType}
                          onChange={v => setBankField('accountType', v)} className="w-full" style={{ height: 40 }}>
                          <Option value="Saving Bank - SE">Saving Bank - SE</Option>
                          <Option value="Current Account">Current Account</Option>
                          <Option value="Recurring Deposit">Recurring Deposit</Option>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3 pt-3 border-t border-slate-700">
                        <Checkbox checked={params.isDefault}
                          onChange={e => setParams(prev => ({ ...prev, isDefault: e.target.checked }))} />
                        <span className="text-sm text-slate-300 font-semibold">Set as system default template</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Page Layout Tab */}
                {activeTab === 'page' && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                      <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400"><Layers size={16} /></div>
                      <div>
                        <h2 className="text-sm font-black text-white">Page Layout</h2>
                        <p className="text-xs text-slate-400">Page dimensions and line configuration</p>
                      </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {PAGE_FIELDS.map(item => (
                        <div key={item.field} className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{item.icon}</div>
                            <input value={(params.pageSettings as any)[item.field]}
                              onChange={e => setPageField(item.field, e.target.value)}
                              className="w-full h-10 bg-slate-700 border border-slate-600 text-white rounded-lg pl-9 pr-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transactions Tab */}
                {activeTab === 'detail' && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-indigo-700/50 bg-indigo-600/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Layout size={15} className="text-indigo-400" />
                        <h2 className="text-xs font-black text-white uppercase tracking-wider">Transaction Columns</h2>
                      </div>
                      <input value={params.detailPageSetting.bankFormat}
                        onChange={e => setParams(prev => ({ ...prev, detailPageSetting: { ...prev.detailPageSetting, bankFormat: e.target.value } }))}
                        placeholder="Map key…"
                        className="h-7 w-36 bg-white/10 border border-white/20 text-xs text-white rounded px-3 focus:outline-none placeholder:text-white/30" />
                    </div>
                    <div className="overflow-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-slate-700 bg-slate-900/60">
                          <th className="text-left px-4 py-2.5 text-slate-400 font-bold uppercase tracking-wider">Column Name</th>
                          <th className="text-center px-3 py-2.5 text-slate-400 font-bold uppercase tracking-wider w-16">Row</th>
                          <th className="text-center px-3 py-2.5 text-slate-400 font-bold uppercase tracking-wider w-16">Col</th>
                          <th className="text-center px-3 py-2.5 text-slate-400 font-bold uppercase tracking-wider w-16">Visible</th>
                        </tr></thead>
                        <tbody>
                          {params.detailPageSetting.fields.map((f, idx) => (
                            <tr key={idx} className={`border-b border-slate-700/50 ${idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/60'}`}>
                              <td className="px-4 py-2"><input value={f.name} readOnly className="bg-transparent text-slate-200 font-semibold w-full" /></td>
                              <td className="px-3 py-2"><input type="number" value={f.row} onChange={e => {
                                const nf = [...params.detailPageSetting.fields]; nf[idx].row = parseInt(e.target.value) || 0;
                                setParams(prev => ({ ...prev, detailPageSetting: { ...prev.detailPageSetting, fields: nf } }));
                              }} className={numCls} /></td>
                              <td className="px-3 py-2"><input type="number" value={f.col} onChange={e => {
                                const nf = [...params.detailPageSetting.fields]; nf[idx].col = parseInt(e.target.value) || 0;
                                setParams(prev => ({ ...prev, detailPageSetting: { ...prev.detailPageSetting, fields: nf } }));
                              }} className={numCls} /></td>
                              <td className="px-3 py-2 text-center">
                                <Checkbox checked={f.visible} onChange={e => {
                                  const nf = [...params.detailPageSetting.fields]; nf[idx].visible = e.target.checked;
                                  setParams(prev => ({ ...prev, detailPageSetting: { ...prev.detailPageSetting, fields: nf } }));
                                }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* First Page Tab */}
                {activeTab === 'first' && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-emerald-700/50 bg-emerald-600/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText size={15} className="text-emerald-400" />
                        <h2 className="text-xs font-black text-white uppercase tracking-wider">First Page Fields</h2>
                      </div>
                      <input value={params.firstPageSetting.formatForBank}
                        onChange={e => setParams(prev => ({ ...prev, firstPageSetting: { ...prev.firstPageSetting, formatForBank: e.target.value } }))}
                        placeholder="Map key…"
                        className="h-7 w-36 bg-white/10 border border-white/20 text-xs text-white rounded px-3 focus:outline-none placeholder:text-white/30" />
                    </div>
                    <div className="overflow-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-slate-700 bg-slate-900/60">
                          <th className="text-left px-4 py-2.5 text-slate-400 font-bold uppercase tracking-wider">Field Name</th>
                          <th className="text-center px-3 py-2.5 text-slate-400 font-bold uppercase tracking-wider w-14">Row</th>
                          <th className="text-center px-3 py-2.5 text-slate-400 font-bold uppercase tracking-wider w-14">Col</th>
                          <th className="text-center px-3 py-2.5 text-slate-400 font-bold uppercase tracking-wider w-16">Label</th>
                          <th className="text-center px-3 py-2.5 text-slate-400 font-bold uppercase tracking-wider w-16">Visible</th>
                        </tr></thead>
                        <tbody>
                          {params.firstPageSetting.fields.map((f, idx) => (
                            <tr key={idx} className={`border-b border-slate-700/50 ${idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/60'}`}>
                              <td className="px-4 py-2"><span className="text-slate-200 font-semibold">{f.name}</span></td>
                              <td className="px-3 py-2"><input type="number" value={f.row} onChange={e => {
                                const nf = [...params.firstPageSetting.fields]; nf[idx].row = parseInt(e.target.value) || 0;
                                setParams(prev => ({ ...prev, firstPageSetting: { ...prev.firstPageSetting, fields: nf } }));
                              }} className={numCls} /></td>
                              <td className="px-3 py-2"><input type="number" value={f.col} onChange={e => {
                                const nf = [...params.firstPageSetting.fields]; nf[idx].col = parseInt(e.target.value) || 0;
                                setParams(prev => ({ ...prev, firstPageSetting: { ...prev.firstPageSetting, fields: nf } }));
                              }} className={numCls} /></td>
                              <td className="px-3 py-2 text-center">
                                <Checkbox checked={f.displayNameFlag} onChange={e => {
                                  const nf = [...params.firstPageSetting.fields]; nf[idx].displayNameFlag = e.target.checked;
                                  setParams(prev => ({ ...prev, firstPageSetting: { ...prev.firstPageSetting, fields: nf } }));
                                }} />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Checkbox checked={f.visibleFlag} onChange={e => {
                                  const nf = [...params.firstPageSetting.fields]; nf[idx].visibleFlag = e.target.checked;
                                  setParams(prev => ({ ...prev, firstPageSetting: { ...prev.firstPageSetting, fields: nf } }));
                                }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Find Modal */}
        <Modal title="Select Passbook Template" open={showFindModal}
          onCancel={() => setShowFindModal(false)} footer={null} width={480}>
          <List dataSource={templates} renderItem={(t: any) => (
            <List.Item onClick={() => { mapBackendToFrontend(t); setShowFindModal(false); }}
              className="cursor-pointer rounded-xl mb-2 transition-all hover:bg-slate-700/50 px-4 py-3">
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="text-sm font-bold text-white">{t.templateName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t.accountType}</div>
                </div>
                {t.isDefault && <Tag color="gold" className="text-xs">Default</Tag>}
              </div>
            </List.Item>
          )} />
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default PassbookParameterSetting;
