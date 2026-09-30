import React, { useState, useEffect } from 'react';
import { Select, message } from 'antd';
import { Building2, FileText, Save, Search, Layers, Layout, Hash, ChevronRight } from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';
import apiService from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

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

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: loading ? 'Saving…' : 'Save',
    saveEnabled: !loading,
  });

  const ACCOUNT_OPTIONS = ['Saving Bank - SE', 'Current Account', 'Recurring Deposit'].map(v => ({ value: v, label: v }));

  const patchDetail = (idx: number, patch: Partial<DetailField>) =>
    setParams(prev => ({
      ...prev,
      detailPageSetting: { ...prev.detailPageSetting, fields: prev.detailPageSetting.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)) },
    }));

  const patchFirst = (idx: number, patch: Partial<FirstPageField>) =>
    setParams(prev => ({
      ...prev,
      firstPageSetting: { ...prev.firstPageSetting, fields: prev.firstPageSetting.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)) },
    }));

  const checkbox = (checked: boolean, label: string, onChange: (v: boolean) => void) => (
    <input type="checkbox" aria-label={label} checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} />
  );

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Passbook Parameter Setting</h1>
          <p className="aw-desc">Configure passbook layout, page settings and field positions</p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleFind} disabled={loading} className="aw-btn aw-btn-secondary">
            <Search size={13} /> Find
          </button>
          <button type="button" onClick={handleSave} disabled={loading} className="aw-btn aw-btn-primary">
            <Save size={13} /> {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="aw-tabs" role="tablist" style={{ overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)} className="aw-tab">
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="aw-content">
        <div key={activeTab} className="aw-fade-in aw-narrow" style={{ maxWidth: 820, margin: '0 auto' }}>

          {/* Identity */}
          {activeTab === 'bank' && (
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Building2 size={14} /></span>
                <div>
                  <h2 className="aw-card-title">Identity</h2>
                  <p className="aw-meta">Template name and account type</p>
                </div>
              </div>
              <div className="aw-stack">
                <div>
                  <label className="aw-label" htmlFor="pb-name">Format Name</label>
                  <div className="aw-input-wrap has-icon">
                    <FileText size={13} />
                    <input id="pb-name" value={params.bankPassbookSettings.formatName} onChange={e => setBankField('formatName', e.target.value)} placeholder="IDENT_V1" className="aw-input" />
                  </div>
                </div>
                <div>
                  <label className="aw-label" htmlFor="pb-acc">Account Type</label>
                  <Select id="pb-acc" className="aw-select" popupClassName="aw-select-popup" value={params.bankPassbookSettings.accountType} onChange={v => setBankField('accountType', v)} options={ACCOUNT_OPTIONS} />
                </div>
                <div className="aw-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span className="aw-strong" style={{ fontWeight: 600 }}>Set as system default template</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={params.isDefault}
                    aria-label="Set as system default template"
                    onClick={() => setParams(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                    className="aw-switch"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Page layout */}
          {activeTab === 'page' && (
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Layers size={14} /></span>
                <div>
                  <h2 className="aw-card-title">Page Layout</h2>
                  <p className="aw-meta">Page dimensions and line configuration</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--aw-gap)' }}>
                {PAGE_FIELDS.map(item => (
                  <div key={item.field}>
                    <label className="aw-label" htmlFor={`pb-${item.field}`}>{item.label}</label>
                    <div className="aw-input-wrap has-icon">
                      {item.icon}
                      <input id={`pb-${item.field}`} value={(params.pageSettings as any)[item.field]} onChange={e => setPageField(item.field, e.target.value)} className="aw-input" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Transactions */}
          {activeTab === 'detail' && (
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Layout size={14} /></span>
                <h2 className="aw-card-title">Transaction Columns</h2>
                <input
                  value={params.detailPageSetting.bankFormat}
                  onChange={e => setParams(prev => ({ ...prev, detailPageSetting: { ...prev.detailPageSetting, bankFormat: e.target.value } }))}
                  placeholder="Map key…"
                  aria-label="Map key"
                  className="aw-input"
                  style={{ marginLeft: 'auto', width: 180 }}
                />
              </div>
              <div className="aw-table-wrap" style={{ maxHeight: '58vh' }}>
                <table className="aw-table">
                  <thead>
                    <tr>
                      <th>Column Name</th>
                      <th className="is-center" style={{ width: 100 }}>Row</th>
                      <th className="is-center" style={{ width: 100 }}>Col</th>
                      <th className="is-center" style={{ width: 90 }}>Visible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.detailPageSetting.fields.map((f, idx) => (
                      <tr key={idx}>
                        <td>{f.name}</td>
                        <td className="has-input"><input type="number" aria-label={`Row ${f.name}`} value={f.row} onChange={e => patchDetail(idx, { row: parseInt(e.target.value) || 0 })} className="aw-input" style={{ textAlign: 'center' }} /></td>
                        <td className="has-input"><input type="number" aria-label={`Col ${f.name}`} value={f.col} onChange={e => patchDetail(idx, { col: parseInt(e.target.value) || 0 })} className="aw-input" style={{ textAlign: 'center' }} /></td>
                        <td className="is-center">{checkbox(f.visible, `Visible ${f.name}`, v => patchDetail(idx, { visible: v }))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* First page */}
          {activeTab === 'first' && (
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><FileText size={14} /></span>
                <h2 className="aw-card-title">First Page Fields</h2>
                <input
                  value={params.firstPageSetting.formatForBank}
                  onChange={e => setParams(prev => ({ ...prev, firstPageSetting: { ...prev.firstPageSetting, formatForBank: e.target.value } }))}
                  placeholder="Map key…"
                  aria-label="Map key"
                  className="aw-input"
                  style={{ marginLeft: 'auto', width: 180 }}
                />
              </div>
              <div className="aw-table-wrap" style={{ maxHeight: '58vh' }}>
                <table className="aw-table">
                  <thead>
                    <tr>
                      <th>Field Name</th>
                      <th className="is-center" style={{ width: 100 }}>Row</th>
                      <th className="is-center" style={{ width: 100 }}>Col</th>
                      <th className="is-center" style={{ width: 80 }}>Label</th>
                      <th className="is-center" style={{ width: 80 }}>Visible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.firstPageSetting.fields.map((f, idx) => (
                      <tr key={idx}>
                        <td>{f.name}</td>
                        <td className="has-input"><input type="number" aria-label={`Row ${f.name}`} value={f.row} onChange={e => patchFirst(idx, { row: parseInt(e.target.value) || 0 })} className="aw-input" style={{ textAlign: 'center' }} /></td>
                        <td className="has-input"><input type="number" aria-label={`Col ${f.name}`} value={f.col} onChange={e => patchFirst(idx, { col: parseInt(e.target.value) || 0 })} className="aw-input" style={{ textAlign: 'center' }} /></td>
                        <td className="is-center">{checkbox(f.displayNameFlag, `Label ${f.name}`, v => patchFirst(idx, { displayNameFlag: v }))}</td>
                        <td className="is-center">{checkbox(f.visibleFlag, `Visible ${f.name}`, v => patchFirst(idx, { visibleFlag: v }))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Find dialog */}
      <AwDialog open={showFindModal} title="Select Passbook Template" icon={<Search size={14} />} onClose={() => setShowFindModal(false)} maxWidth="30rem">
        {templates.length === 0 ? (
          <div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">No templates found</span></div>
        ) : (
          <div className="aw-stack" style={{ gap: 6 }}>
            {templates.map((t: any, i: number) => (
              <button
                key={t.id ?? i}
                type="button"
                onClick={() => { mapBackendToFrontend(t); setShowFindModal(false); }}
                className="aw-right-cell"
                style={{ justifyContent: 'space-between', width: '100%', padding: '10px 12px' }}
              >
                <span>
                  <span className="aw-strong" style={{ display: 'block' }}>{t.templateName}</span>
                  <span className="aw-meta">{t.accountType}</span>
                </span>
                {t.isDefault && <span className="aw-pill">Default</span>}
              </button>
            ))}
          </div>
        )}
      </AwDialog>
    </div>
  );
};

export default PassbookParameterSetting;
