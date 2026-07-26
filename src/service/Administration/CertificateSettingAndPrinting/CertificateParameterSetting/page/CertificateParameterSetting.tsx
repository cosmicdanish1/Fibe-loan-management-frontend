import React, { useState } from 'react';
import { ConfigProvider, Select, Table, Checkbox, message, Modal, List, Tag, theme as antdTheme } from 'antd';
import { Settings, Search, Save, FileText, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../../../../services/api';

const { Option } = Select;

interface CertificateField {
  key: string;
  name: string;
  field: string;
  row: number;
  col: number;
  visible: boolean;
  inWo: string;
  length: number;
}

interface CertificateParameterData {
  id?: number;
  formatName: string;
  accountType: string;
  detailFormatName: string;
  isDefault: boolean;
  fields: CertificateField[];
}

const DARK = { bg: '#0f172a', card: '#1e293b', border: '#334155', muted: '#94a3b8', text: '#f1f5f9' };

const CertificateParameterSetting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'format' | 'detail'>('format');
  const [data, setData] = useState<CertificateParameterData>({
    formatName: '',
    accountType: 'FIXED_DEPOSIT',
    detailFormatName: '',
    isDefault: true,
    fields: [
      { key: '1', name: 'Member Name',    field: 'memberName',    row: 1, col: 1, visible: true,  inWo: '', length: 50 },
      { key: '2', name: 'Certificate No', field: 'certificateNo', row: 3, col: 1, visible: true,  inWo: '', length: 20 },
      { key: '3', name: 'Deposit Amount', field: 'depositAmount', row: 5, col: 1, visible: true,  inWo: '', length: 15 },
      { key: '4', name: 'Interest Rate',  field: 'interestRate',  row: 6, col: 1, visible: true,  inWo: '', length: 10 },
      { key: '5', name: 'Maturity Date',  field: 'maturityDate',  row: 7, col: 1, visible: true,  inWo: '', length: 12 },
    ],
  });

  const [loading, setLoading] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await apiService.getDefaultCertificateTemplate('FIXED_DEPOSIT');
        if (resp.success && resp.data) mapBackendToFrontend(resp.data);
      } catch { /* use defaults */ }
    })();
  }, []);

  const mapBackendToFrontend = (b: any) => {
    setData({
      id: b.id,
      formatName: b.templateName,
      accountType: b.accountType,
      detailFormatName: '',
      isDefault: b.isDefault,
      fields: b.fields.map((f: any, idx: number) => ({
        key: f.id?.toString() || String(idx + 1),
        name: f.label,
        field: f.dataKey,
        row: f.rowPos,
        col: f.colPos,
        visible: f.isVisible,
        inWo: f.transformMode || '',
        length: f.length || 0,
      })),
    });
  };

  const updateField = (field: keyof CertificateParameterData, value: any) =>
    setData(prev => ({ ...prev, [field]: value }));

  const updateRow = (key: string, field: keyof CertificateField, value: any) =>
    setData(prev => ({ ...prev, fields: prev.fields.map(r => r.key === key ? { ...r, [field]: value } : r) }));

  const handleFind = async () => {
    setLoading(true);
    try {
      const resp = await apiService.getCertificateTemplates();
      if (resp.success) { setTemplates(resp.data); setShowFindModal(true); }
    } catch { message.error('Failed to load templates'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!data.formatName) { message.warning('Please enter a format name'); return; }
    setLoading(true);
    try {
      const payload = {
        templateName: data.formatName,
        accountType: data.accountType,
        isDefault: data.isDefault,
        fields: data.fields.map(f => ({
          label: f.name, dataKey: f.field, rowPos: f.row, colPos: f.col,
          isVisible: f.visible, transformMode: f.inWo || 'NONE', length: f.length,
        })),
      };
      const resp = data.id
        ? await apiService.updateCertificateTemplate(data.id, payload)
        : await apiService.createCertificateTemplate(payload);
      if (resp.success) {
        message.success('Certificate parameters saved');
        if (resp.data?.id) setData(prev => ({ ...prev, id: resp.data.id }));
      } else {
        message.error(resp.message || 'Save failed');
      }
    } catch { message.error('Connection error'); }
    finally { setLoading(false); }
  };

  const columns = [
    {
      title: 'Display Name', dataIndex: 'name', key: 'name', width: '22%',
      render: (text: string, rec: CertificateField) => (
        <input value={text} onChange={e => updateRow(rec.key, 'name', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500" />
      ),
    },
    {
      title: 'Data Key', dataIndex: 'field', key: 'field', width: '18%',
      render: (text: string, rec: CertificateField) => (
        <input value={text} onChange={e => updateRow(rec.key, 'field', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 text-indigo-300 font-mono rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500" />
      ),
    },
    {
      title: 'Row', dataIndex: 'row', key: 'row', align: 'center' as const, width: '8%',
      render: (v: number, rec: CertificateField) => (
        <input type="number" value={v} onChange={e => updateRow(rec.key, 'row', parseInt(e.target.value) || 0)}
          className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-indigo-500" />
      ),
    },
    {
      title: 'Col', dataIndex: 'col', key: 'col', align: 'center' as const, width: '8%',
      render: (v: number, rec: CertificateField) => (
        <input type="number" value={v} onChange={e => updateRow(rec.key, 'col', parseInt(e.target.value) || 0)}
          className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-indigo-500" />
      ),
    },
    {
      title: 'Visible', dataIndex: 'visible', key: 'visible', align: 'center' as const, width: '8%',
      render: (v: boolean, rec: CertificateField) => (
        <Checkbox checked={v} onChange={e => updateRow(rec.key, 'visible', e.target.checked)} />
      ),
    },
    {
      title: 'Length', dataIndex: 'length', key: 'length', align: 'center' as const, width: '8%',
      render: (v: number, rec: CertificateField) => (
        <input type="number" value={v} onChange={e => updateRow(rec.key, 'length', parseInt(e.target.value) || 0)}
          className="w-full bg-slate-700 border border-slate-600 text-emerald-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-indigo-500" />
      ),
    },
    {
      title: 'Word Mode', dataIndex: 'inWo', key: 'inWo',
      render: (text: string, rec: CertificateField) => (
        <input value={text} placeholder="e.g. UPPER" onChange={e => updateRow(rec.key, 'inWo', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 text-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500" />
      ),
    },
  ];

  const TABS = [
    { id: 'format', label: 'Format Identity', icon: <FileText size={14} /> },
    { id: 'detail', label: 'Field Setup',      icon: <Layout size={14} /> },
  ];

  return (
    <ConfigProvider theme={{ algorithm: antdTheme.darkAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 8, colorBgContainer: '#1e293b', colorBorder: '#334155' } }}>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: DARK.bg, color: DARK.text }}>

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="px-4 py-3 flex items-center justify-between shrink-0 border-b"
          style={{ background: '#1e293b', borderColor: DARK.border }}>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <Settings size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight uppercase">Certificate Parameter Setting</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Configure certificate layout fields and format</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleFind} disabled={loading}
              className="h-9 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
              <Search size={14} /> Find
            </button>
            <button onClick={handleSave} disabled={loading}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
              <Save size={14} /> {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 shrink-0 border-b" style={{ background: '#1e293b', borderColor: DARK.border }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all relative flex items-center gap-2
                ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
              {tab.icon} {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="cert-tab-indicator"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'format' ? (
              <motion.div key="format" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                className="h-full p-6 overflow-auto">
                <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden border" style={{ background: DARK.card, borderColor: DARK.border }}>
                  <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: DARK.border }}>
                    <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400"><FileText size={16} /></div>
                    <div>
                      <h2 className="text-sm font-black text-white">Format Identity</h2>
                      <p className="text-xs text-slate-400">Set the format name, account type and default flag</p>
                    </div>
                  </div>
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Format Name</label>
                      <input value={data.formatName} onChange={e => updateField('formatName', e.target.value)}
                        placeholder="e.g. STD_FD_V1"
                        className="w-full h-10 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Type</label>
                      <Select value={data.accountType} onChange={v => updateField('accountType', v)} className="w-full" style={{ height: 40 }}>
                        <Option value="FIXED_DEPOSIT">Fixed Deposit (FD)</Option>
                        <Option value="RECURRING_DEPOSIT">Recurring Deposit (RD)</Option>
                        <Option value="SHARE">Share Certificate</Option>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-3 pt-2 border-t" style={{ borderColor: DARK.border }}>
                      <Checkbox checked={data.isDefault} onChange={e => updateField('isDefault', e.target.checked)} />
                      <span className="text-sm text-slate-300 font-semibold">Set as default for this account type</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                className="h-full p-4 flex flex-col">
                <div className="rounded-t-2xl overflow-hidden border border-b-0 px-5 py-3 flex items-center gap-3"
                  style={{ background: '#4f46e5', borderColor: '#4338ca' }}>
                  <Layout size={16} className="text-indigo-200" />
                  <h2 className="text-xs font-black text-white uppercase tracking-wider">Field Positions</h2>
                  <div className="flex-1" />
                  <input value={data.detailFormatName} onChange={e => updateField('detailFormatName', e.target.value)}
                    placeholder="Legacy map key…"
                    className="h-7 w-40 bg-white/10 border border-white/20 text-xs font-bold text-white rounded px-3 focus:outline-none placeholder:text-white/40" />
                </div>
                <div className="flex-1 overflow-auto border rounded-b-2xl" style={{ borderColor: DARK.border }}>
                  <Table columns={columns} dataSource={data.fields} pagination={false} size="small"
                    className="cert-dark-table"
                    rowClassName={(_, i) => i % 2 === 0 ? 'row-even' : 'row-odd'} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Find Templates Modal */}
        <Modal title="Select Certificate Template" open={showFindModal}
          onCancel={() => setShowFindModal(false)} footer={null} width={480}>
          <List dataSource={templates} renderItem={(t: any) => (
            <List.Item onClick={() => { mapBackendToFrontend(t); setShowFindModal(false); }}
              className="cursor-pointer rounded-xl mb-2 transition-all hover:bg-slate-700/50 px-4 py-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400"><FileText size={14} /></div>
                  <div>
                    <div className="text-sm font-bold text-white">{t.templateName}</div>
                    <div className="text-xs text-slate-400">{t.accountType}</div>
                  </div>
                </div>
                {t.isDefault && <Tag color="geekblue" className="text-xs">Default</Tag>}
              </div>
            </List.Item>
          )} />
        </Modal>

        <style>{`
          .cert-dark-table .ant-table { background: #1e293b !important; }
          .cert-dark-table .ant-table-thead > tr > th { background: #0f172a !important; color: #94a3b8 !important; border-bottom: 1px solid #334155 !important; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          .cert-dark-table .ant-table-tbody > tr > td { border-bottom: 1px solid #1e293b !important; padding: 6px 12px !important; background: transparent !important; }
          .row-even td { background: #1a2744 !important; }
          .row-odd td  { background: #1e293b !important; }
          .cert-dark-table .ant-table-tbody > tr:hover > td { background: #2d3f6b !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default CertificateParameterSetting;
