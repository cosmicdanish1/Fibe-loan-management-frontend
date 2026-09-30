import React, { useState } from 'react';
import { Select, message } from 'antd';
import { Search, Save, FileText, Layout } from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';
import apiService from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

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

  const TABS = [
    { id: 'format', label: 'Format Identity', icon: <FileText size={14} /> },
    { id: 'detail', label: 'Field Setup',      icon: <Layout size={14} /> },
  ];

  const ACCOUNT_OPTIONS = [
    { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit (FD)' },
    { value: 'RECURRING_DEPOSIT', label: 'Recurring Deposit (RD)' },
    { value: 'SHARE', label: 'Share Certificate' },
  ];

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: loading ? 'Saving…' : 'Save',
    saveEnabled: !loading,
  });

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Certificate Parameter Setting</h1>
          <p className="aw-desc">Configure certificate layout fields and format</p>
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
      <div className="aw-tabs" role="tablist">
        {TABS.map(tab => (
          <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)} className="aw-tab">
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="aw-content">
        <div key={activeTab} className="aw-fade-in">
          {activeTab === 'format' ? (
            <div className="aw-narrow" style={{ maxWidth: 720, margin: '0 auto' }}>
              <section className="aw-card">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><FileText size={14} /></span>
                  <div>
                    <h2 className="aw-card-title">Format Identity</h2>
                    <p className="aw-meta">Set the format name, account type and default flag</p>
                  </div>
                </div>
                <div className="aw-stack">
                  <div className="aw-two">
                    <div>
                      <label className="aw-label" htmlFor="cps-name">Format Name</label>
                      <input id="cps-name" value={data.formatName} onChange={e => updateField('formatName', e.target.value)} placeholder="e.g. STD_FD_V1" className="aw-input" />
                    </div>
                    <div>
                      <label className="aw-label" htmlFor="cps-acc">Account Type</label>
                      <Select id="cps-acc" className="aw-select" popupClassName="aw-select-popup" value={data.accountType} onChange={v => updateField('accountType', v)} options={ACCOUNT_OPTIONS} />
                    </div>
                  </div>
                  <div className="aw-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span className="aw-strong" style={{ fontWeight: 600 }}>Set as default for this account type</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={data.isDefault}
                      aria-label="Set as default for this account type"
                      onClick={() => updateField('isDefault', !data.isDefault)}
                      className="aw-switch"
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Layout size={14} /></span>
                <h2 className="aw-card-title">Field Positions</h2>
                <input
                  value={data.detailFormatName}
                  onChange={e => updateField('detailFormatName', e.target.value)}
                  placeholder="Legacy map key…"
                  aria-label="Legacy map key"
                  className="aw-input"
                  style={{ marginLeft: 'auto', width: 200 }}
                />
              </div>
              <div className="aw-table-wrap" style={{ maxHeight: '62vh' }}>
                <table className="aw-table" style={{ minWidth: 820 }}>
                  <thead>
                    <tr>
                      <th>Display Name</th>
                      <th>Data Key</th>
                      <th className="is-center" style={{ width: 90 }}>Row</th>
                      <th className="is-center" style={{ width: 90 }}>Col</th>
                      <th className="is-center" style={{ width: 80 }}>Visible</th>
                      <th className="is-center" style={{ width: 100 }}>Length</th>
                      <th>Word Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fields.map(rec => (
                      <tr key={rec.key}>
                        <td className="has-input"><input aria-label={`Display name ${rec.field}`} value={rec.name} onChange={e => updateRow(rec.key, 'name', e.target.value)} className="aw-input" /></td>
                        <td className="has-input"><input aria-label={`Data key ${rec.field}`} value={rec.field} onChange={e => updateRow(rec.key, 'field', e.target.value)} className="aw-input" style={{ color: 'var(--aw-accent)', fontFamily: 'monospace' }} /></td>
                        <td className="has-input"><input type="number" aria-label={`Row ${rec.field}`} value={rec.row} onChange={e => updateRow(rec.key, 'row', parseInt(e.target.value) || 0)} className="aw-input" style={{ textAlign: 'center' }} /></td>
                        <td className="has-input"><input type="number" aria-label={`Col ${rec.field}`} value={rec.col} onChange={e => updateRow(rec.key, 'col', parseInt(e.target.value) || 0)} className="aw-input" style={{ textAlign: 'center' }} /></td>
                        <td className="is-center">
                          <input type="checkbox" aria-label={`Visible ${rec.field}`} checked={rec.visible} onChange={e => updateRow(rec.key, 'visible', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} />
                        </td>
                        <td className="has-input"><input type="number" aria-label={`Length ${rec.field}`} value={rec.length} onChange={e => updateRow(rec.key, 'length', parseInt(e.target.value) || 0)} className="aw-input" style={{ textAlign: 'center', color: 'var(--aw-success)' }} /></td>
                        <td className="has-input"><input aria-label={`Word mode ${rec.field}`} value={rec.inWo} placeholder="e.g. UPPER" onChange={e => updateRow(rec.key, 'inWo', e.target.value)} className="aw-input" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Find Templates dialog */}
      <AwDialog open={showFindModal} title="Select Certificate Template" icon={<Search size={14} />} onClose={() => setShowFindModal(false)} maxWidth="30rem">
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <span className="aw-card-icon"><FileText size={14} /></span>
                  <span>
                    <span className="aw-strong" style={{ display: 'block' }}>{t.templateName}</span>
                    <span className="aw-meta">{t.accountType}</span>
                  </span>
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

export default CertificateParameterSetting;
