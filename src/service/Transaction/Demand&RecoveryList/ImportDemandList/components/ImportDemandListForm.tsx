// components/ImportDemandListForm.tsx

import React from 'react';
import { Select } from 'antd';
import { Upload, Save, RotateCcw, X, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { ImportDemandListHookReturn } from '../interface/ImportDemandListInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const YEARS = Array.from({ length: 30 }, (_, i) => (2020 + i).toString());

const HEADERS = ['Period', 'Branch', 'Member No', 'Personal No', 'Member Name', 'Total Amount', 'RD Amount', 'Regular Loan', 'Emergency Loan', 'Loan Interest', 'IFRS Amt', 'FRS 1 Amt', 'Status'];

const ImportDemandListForm: React.FC<ImportDemandListHookReturn> = ({
    importConfig, previewData, branches, isImporting, isSaving, recordCount,
    updateConfig, handleImport, handleSave, handleClear, handleExit,
}) => {
    const validCount = previewData.filter(r => r.status === 'Valid').length;
    const errorCount = previewData.filter(r => r.status === 'Error').length;

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isSaving ? 'Saving...' : 'Save',
        saveEnabled: !(isSaving || previewData.length === 0),
    });

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Import Demand</h1>
                    <p className="aw-desc">Demand &amp; Recovery List</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleSave} disabled={isSaving || previewData.length === 0} className="aw-btn aw-btn-primary">
                        {isSaving ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />} {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Clear</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileSpreadsheet size={14} /></span>
                            <h2 className="aw-card-title">Import Configuration</h2>
                            {recordCount > 0 && (
                                <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8, flexWrap: 'wrap' }}>
                                    <span className="aw-pill">{recordCount} Record(s)</span>
                                    {validCount > 0 && <span className="aw-pill tone-success"><CheckCircle2 size={11} /> {validCount} Valid</span>}
                                    {errorCount > 0 && <span className="aw-pill tone-danger"><AlertCircle size={11} /> {errorCount} Error</span>}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 0.8fr) minmax(260px, 2fr) 110px 120px auto', gap: 'var(--aw-gap)', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="idl-div">Division/RO</label>
                                <input id="idl-div" type="text" value={importConfig.divisionRO} readOnly className="aw-input" />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="idl-branch">Branch</label>
                                <Select id="idl-branch" value={(importConfig.branch || undefined) as string} onChange={v => updateConfig('branch', v)}
                                    placeholder="Select Branch" className="aw-select" popupClassName="aw-select-popup" showSearch
                                    optionFilterProp="label"
                                    options={branches.map(b => ({
                                        value: String(b.officeno),
                                        label: `${b.officeno}-${b.office_name}-${b.office_name}-${(b as any).division || b.officeno}`,
                                    }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="idl-month">Month</label>
                                <Select id="idl-month" value={importConfig.monthStr} onChange={v => updateConfig('monthStr', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={MONTHS.map(m => ({ value: m, label: m }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="idl-year">Year</label>
                                <Select id="idl-year" value={importConfig.yearStr} onChange={v => updateConfig('yearStr', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={YEARS.map(y => ({ value: y, label: y }))} />
                            </div>
                            <button type="button" onClick={handleImport} disabled={isImporting} className="aw-btn aw-btn-secondary">
                                {isImporting ? <RotateCcw size={13} className="aw-spin" /> : <Upload size={13} />}
                                {isImporting ? 'Importing...' : 'Import Demand'}
                            </button>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileSpreadsheet size={14} /></span>
                            <h2 className="aw-card-title">Demand Preview</h2>
                        </div>
                        {isImporting ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <span className="aw-spin" />
                                <p className="aw-strong">Importing Records...</p>
                                <span className="aw-meta">Reading Excel file, validating members, checking columns...</span>
                            </div>
                        ) : previewData.length === 0 ? (
                            <div className="aw-empty" style={{ padding: 32 }}>
                                <FileSpreadsheet size={32} />
                                <p className="aw-strong">No Data Loaded</p>
                                <span className="aw-meta">Select Branch, Month, Year and click "Import Demand" to load an Excel file</span>
                                <div className="aw-panel aw-panel-dashed" style={{ textAlign: 'left', maxWidth: 520 }}>
                                    <span className="aw-label">Expected Excel Format</span>
                                    <p className="aw-meta">S.NO. | YYMM | CODE | MS.NO. | PS.NO. | NAME | TOTAL | R/D | R/LOAN | E/LOAN | INTT.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="aw-table-wrap" style={{ maxHeight: 'calc(100vh - 340px)', minHeight: 200 }}>
                                <table className="aw-table" style={{ minWidth: 1250 }}>
                                    <thead>
                                        <tr>
                                            {HEADERS.map((h, i) => (
                                                <th key={h} className={i >= 5 && i <= 11 ? 'is-right' : i === 12 ? 'is-center' : undefined}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row) => (
                                            <tr key={row.key}>
                                                <td className="is-muted">{row.period}</td>
                                                <td className="is-muted">{row.branch}</td>
                                                <td className="is-accent" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.memberNo}</td>
                                                <td style={{ fontFamily: 'monospace' }}>{row.personalNo}</td>
                                                <td style={{ fontWeight: 700, textTransform: 'uppercase' }}>{row.memberName}</td>
                                                <td className="is-right" style={{ fontWeight: 700 }}>{row.totalAmount || ''}</td>
                                                <td className="is-right">{row.rdAmount || ''}</td>
                                                <td className="is-right is-info">{row.regularLoanAmt || ''}</td>
                                                <td className="is-right is-warning">{row.emergencyLoanAmt || ''}</td>
                                                <td className="is-right is-muted">{row.loanInterest || ''}</td>
                                                <td className="is-right">{row.frs1Amount || ''}</td>
                                                <td className="is-right">{row.frs2Amount || ''}</td>
                                                <td className="is-center">
                                                    {row.status === 'Valid' ? (
                                                        <span style={{ display: 'inline-flex', color: 'var(--aw-success)' }}><CheckCircle2 size={14} /></span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--aw-danger)' }} title={row.remarks}>
                                                            <AlertCircle size={14} /> <span>{row.remarks}</span>
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Import Demand | {importConfig.divisionRO}</span>
                <span>{importConfig.monthStr}-{importConfig.yearStr}</span>
            </div>
        </div>
    );
};

export default ImportDemandListForm;
