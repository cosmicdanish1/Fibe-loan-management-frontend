// components/PrintMembersDemandListForm.tsx

import React from 'react';
import { Select } from 'antd';
import { Printer, FileOutput, RotateCcw, X } from 'lucide-react';
import { PrintMembersDemandListHookReturn } from '../interface/PrintMembersDemandListInterfaces';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const YEARS = ['2024','2025','2026'];
const SORTS = ['Member No.', 'Name', 'Account No.'];
const OUTPUTS = ['Screen', 'Printer'] as const;
const OPTIONS = [
    { key: 'printBalance', label: 'Print Balance' },
    { key: 'printEmpNo', label: 'Print Emp No' },
    { key: 'printPrevBalance', label: 'Print Prev. Balance' },
];

const PrintMembersDemandListForm: React.FC<PrintMembersDemandListHookReturn> = ({
    formData, updateField, handleExport, handleReset, handleExit, divisions, branches,
}) => {
    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Print Members Demand List</h1>
                    <p className="aw-desc">Demand &amp; Recovery</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Reset</button>
                    <button type="button" onClick={handleExport} className="aw-btn aw-btn-primary"><FileOutput size={13} /> Export To Details</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Printer size={14} /></span>
                            <h2 className="aw-card-title">Print Configuration</h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--aw-gap)' }}>
                            <div>
                                <label className="aw-label" htmlFor="pmd-division">Division / RO</label>
                                <Select id="pmd-division" value={(formData.division || undefined) as string} onChange={(v) => updateField('division', v)}
                                    className="aw-select" popupClassName="aw-select-popup" placeholder="Select Division/RO..."
                                    options={divisions.map(d => ({ value: d.id, label: d.name }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="pmd-branch">Branch</label>
                                <Select id="pmd-branch" value={formData.branch} onChange={(v) => updateField('branch', v)}
                                    className="aw-select" popupClassName="aw-select-popup" placeholder="All Branches"
                                    options={[{ value: '', label: 'All Branches' }, ...branches.map(b => ({ value: b.officeId, label: b.officeName }))]} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="pmd-month">Month</label>
                                <Select id="pmd-month" value={formData.month} onChange={(v) => updateField('month', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={MONTHS.map(m => ({ value: m, label: m }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="pmd-year">Year</label>
                                <Select id="pmd-year" value={formData.year} onChange={(v) => updateField('year', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={YEARS.map(y => ({ value: y, label: y }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="pmd-sort">Sort By</label>
                                <Select id="pmd-sort" value={formData.sortBy} onChange={(v) => updateField('sortBy', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={SORTS.map(s => ({ value: s, label: s }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="pmd-pages">Total Pages</label>
                                <input id="pmd-pages" value="*" readOnly className="aw-input" />
                            </div>
                        </div>

                        <div className="aw-inline" style={{ gap: 28, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div>
                                <span className="aw-label">Output</span>
                                <div className="aw-seg" role="tablist" style={{ width: 220, ['--seg-index' as any]: formData.outputType === 'Printer' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                                    {OUTPUTS.map(opt => (
                                        <button key={opt} type="button" role="tab" aria-selected={formData.outputType === opt} onClick={() => updateField('outputType', opt)}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="aw-inline" style={{ gap: 20, flexWrap: 'wrap', paddingBottom: 8 }}>
                                {OPTIONS.map(({ key, label }) => (
                                    <label key={key} className="aw-inline" style={{ gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                                        <input type="checkbox" checked={(formData as any)[key]}
                                            onChange={(e) => updateField(key as any, e.target.checked)}
                                            style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Printer size={14} /></span>
                            <h2 className="aw-card-title">Report Preview</h2>
                        </div>
                        <div className="aw-empty" style={{ padding: 40 }}>
                            <Printer size={40} />
                            <p className="aw-strong">Report Preview</p>
                            <span className="aw-meta">Select parameters and click Export To Details</span>
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Administration</span>
                <span>Reporting Mode</span>
            </div>
        </div>
    );
};

export default PrintMembersDemandListForm;
