import React from 'react';
import { Select } from 'antd';
import { Building2, CalendarDays, RotateCcw, Zap, X } from 'lucide-react';
import { GenerateHookReturn } from '../interface/GenerateInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const years = Array.from({ length: 8 }, (_, i) => (2023 + i).toString());
const divisions = [{ value: 'BHILAI', label: 'BHILAI', code: '1' }, { value: 'RAIPUR', label: 'RAIPUR', code: '2' }];
const branches = [
    { value: '1-BHILAI-BHILAI', label: '1-BHILAI-BHILAI', code: '1' },
    { value: '2-POWER HOUSE-POWER HOUSE', label: '2-POWER HOUSE-POWER HOUSE', code: '2' },
];

const GenerateForm: React.FC<GenerateHookReturn> = ({
    formData, updateField, resetForm, generateDemand, handleExit,
}) => {
    const divisionCode = divisions.find((d) => d.value === formData.divisionRO)?.code || '—';
    const fromCode = branches.find((d) => d.value === formData.from)?.code || '—';
    const toCode = branches.find((d) => d.value === formData.to)?.code || '—';

    usePageToolbarActions({
        onSave: generateDemand,
        saveLabel: 'Generate',
    });

    const officeRow = (id: string, label: string, value: string, code: string, placeholder: string, options: { value: string; label: string }[], field: 'divisionRO' | 'from' | 'to') => (
        <div style={{ display: 'grid', gridTemplateColumns: '130px minmax(0, 1fr) 40px', alignItems: 'center', gap: 'var(--aw-gap)' }}>
            <label className="aw-label" htmlFor={id} style={{ margin: 0 }}>{label}</label>
            <Select id={id} value={(value || undefined) as string} onChange={(v) => updateField(field, v)}
                className="aw-select" popupClassName="aw-select-popup" placeholder={placeholder} options={options} />
            <span className="aw-strong is-accent" style={{ textAlign: 'center', color: 'var(--aw-accent)' }}>{code}</span>
        </div>
    );

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Demand Generation</h1>
                    <p className="aw-desc">Demand &amp; Recovery</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={resetForm} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Clear</button>
                    <button type="button" onClick={generateDemand} className="aw-btn aw-btn-primary"><Zap size={13} /> Generate</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack" style={{ maxWidth: 760 }}>
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><CalendarDays size={14} /></span>
                            <h2 className="aw-card-title">Period</h2>
                        </div>
                        <div className="aw-inline" style={{ gap: 'var(--aw-gap)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ width: 150 }}>
                                <label className="aw-label" htmlFor="gen-month">Month</label>
                                <Select id="gen-month" value={formData.month} onChange={(v) => updateField('month', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={months.map(m => ({ value: m, label: m }))} />
                            </div>
                            <div style={{ width: 120 }}>
                                <label className="aw-label" htmlFor="gen-year">Year</label>
                                <Select id="gen-year" value={formData.year} onChange={(v) => updateField('year', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={years.map(y => ({ value: y, label: y }))} />
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Building2 size={14} /></span>
                            <h2 className="aw-card-title">Office</h2>
                        </div>
                        {officeRow('gen-division', 'Division / RO', formData.divisionRO, divisionCode, 'Select division', divisions, 'divisionRO')}
                        {officeRow('gen-from', 'From', formData.from, fromCode, 'Select from branch', branches, 'from')}
                        {officeRow('gen-to', 'To', formData.to, toCode, 'Select to branch', branches, 'to')}
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>{formData.month} {formData.year} · {formData.divisionRO || 'No division selected'}</span>
                <span>Demand Generation</span>
            </div>
        </div>
    );
};

export default GenerateForm;
