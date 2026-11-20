// components/ImportDemandListForm.tsx

import React from 'react';
import { Select } from 'antd';
import { Upload, Save, RotateCcw, X, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { ImportDemandListHookReturn } from '../interface/ImportDemandListInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const YEARS = Array.from({ length: 30 }, (_, i) => (2020 + i).toString());

const HEADERS = ['Row', 'H.O.NO.', 'Member No', 'PS.NO.', 'Member Name', 'Total Amount', 'F/D (RD/CD)', 'Regular Loan', 'Emergency Loan', 'Loan Interest', 'FRS 1 (MD)', 'FRS 2 (MD1)', 'Found By', 'Status', 'Check'];

const FOUND_BY: Record<string, string> = { HONO: 'H.O.NO.', MEMBER_NO: 'MS.NO.', MANUAL: 'By hand' };

const ImportDemandListForm: React.FC<ImportDemandListHookReturn> = ({
    importConfig, previewData, branches, isImporting, isSaving, recordCount, strictness, saveBlockedReason,
    updateConfig, handleImport, handleSave, handleClear, handleExit, pickMember,
}) => {
  const { t } = useTranslation();
    const validCount = previewData.filter(r => r.status === 'Valid').length;
    const errorCount = previewData.filter(r => r.status === 'Error').length;
    const flaggedCount = previewData.filter(r => (r.flags?.length ?? 0) > 0).length;

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isSaving ? 'Saving...' : 'Save',
        saveEnabled: !(isSaving || previewData.length === 0 || !!saveBlockedReason),
    });

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Import Demand')}</h1>
                    <p className="aw-desc">{t('Demand & Recovery List')}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleSave} disabled={isSaving || previewData.length === 0 || !!saveBlockedReason} title={saveBlockedReason || undefined} className="aw-btn aw-btn-primary">
                        {isSaving ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />} {isSaving ? t('Saving...') : t('Save')}
                    </button>
                    <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> {t('Clear')}</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Exit')}</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileSpreadsheet size={14} /></span>
                            <h2 className="aw-card-title">{t('Import Configuration')}</h2>
                            {recordCount > 0 && (
                                <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8, flexWrap: 'wrap' }}>
                                    <span className="aw-pill" title={t('Import strictness from Modify Business Rules')}>{strictness === 'STRICT' ? t('Strict') : t('Standard')}</span>
                                    <span className="aw-pill">{t('{{1}} Record(s)', { 1: recordCount })}</span>
                                    {validCount > 0 && <span className="aw-pill tone-success"><CheckCircle2 size={11} /> {validCount} {t('Valid')}</span>}
                                    {errorCount > 0 && <span className="aw-pill tone-danger"><AlertCircle size={11} /> {errorCount} {t('Error')}</span>}
                                    {flaggedCount > 0 && <span className="aw-pill tone-warning"><AlertCircle size={11} /> {flaggedCount} {t('Need Checking')}</span>}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 0.8fr) minmax(260px, 2fr) 110px 120px auto', gap: 'var(--aw-gap)', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="idl-div">{t('Division/RO')}</label>
                                <input id="idl-div" type="text" value={importConfig.divisionRO} readOnly className="aw-input" />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="idl-branch">{t('Branch')}</label>
                                <Select id="idl-branch" value={(importConfig.branch || undefined) as string} onChange={v => updateConfig('branch', v)}
                                    placeholder={t('Select Branch')} className="aw-select" popupClassName="aw-select-popup" showSearch
                                    optionFilterProp="label"
                                    options={branches.map(b => ({
                                        value: String(b.officeno),
                                        label: `${b.officeno}-${b.office_name}-${b.office_name}-${(b as any).division || b.officeno}`,
                                    }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="idl-month">{t('Month')}</label>
                                <Select id="idl-month" value={importConfig.monthStr} onChange={v => updateConfig('monthStr', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={MONTHS.map(m => ({ value: m, label: m }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="idl-year">{t('Year')}</label>
                                <Select id="idl-year" value={importConfig.yearStr} onChange={v => updateConfig('yearStr', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={YEARS.map(y => ({ value: y, label: y }))} />
                            </div>
                            <button type="button" onClick={handleImport} disabled={isImporting} className="aw-btn aw-btn-secondary">
                                {isImporting ? <RotateCcw size={13} className="aw-spin" /> : <Upload size={13} />}
                                {isImporting ? t('Importing...') : t('Import Demand')}
                            </button>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileSpreadsheet size={14} /></span>
                            <h2 className="aw-card-title">{t('Demand Preview')}</h2>
                        </div>
                        {isImporting ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <span className="aw-spin" />
                                <p className="aw-strong">{t('Importing Records...')}</p>
                                <span className="aw-meta">{t('Reading Excel file, validating members, checking columns...')}</span>
                            </div>
                        ) : previewData.length === 0 ? (
                            <div className="aw-empty" style={{ padding: 32 }}>
                                <FileSpreadsheet size={32} />
                                <p className="aw-strong">{t('No Data Loaded')}</p>
                                <span className="aw-meta">{t('Select Branch, Month, Year and click "Import Demand" to load an Excel file')}</span>
                                <div className="aw-panel aw-panel-dashed" style={{ textAlign: 'left', maxWidth: 520 }}>
                                    <span className="aw-label">{t('Expected Excel Format')}</span>
                                    <p className="aw-meta">YYMM | CODE | H.O.NO. (or MS.NO.) | PS.NO. | NAME | TOTAL | F/D (or R/D) | R/LOAN | E/LOAN | INTT. | F.R.S.-1 | F.R.S.-2</p>
                                </div>
                            </div>
                        ) : (
                            <>
                            {saveBlockedReason && (
                                <div className="aw-panel aw-panel-accent" style={{ marginBottom: 8 }}>
                                    <span className="aw-label">{t('Strict mode: nothing can be saved yet')}</span>
                                    <p className="aw-meta" style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{saveBlockedReason}</p>
                                </div>
                            )}
                            <div className="aw-table-wrap" style={{ maxHeight: 'calc(100vh - 340px)', minHeight: 200 }}>
                                <table className="aw-table" style={{ minWidth: 1560 }}>
                                    <thead>
                                        <tr>
                                            {HEADERS.map((h, i) => (
                                                <th key={h} className={i >= 5 && i <= 11 ? 'is-right' : i >= 12 ? 'is-center' : undefined}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row) => (
                                            <tr key={row.key}>
                                                <td className="is-muted">{row.rowNo ?? ''}</td>
                                                <td className="is-muted" style={{ fontFamily: 'monospace' }}>{row.honoGiven ?? ''}</td>
                                                <td className="is-accent" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.memberId}</td>
                                                <td style={{ fontFamily: 'monospace' }}>{row.psNo ?? ''}</td>
                                                <td style={{ fontWeight: 700, textTransform: 'uppercase' }}>{row.memberName}</td>
                                                <td className="is-right" style={{ fontWeight: 700 }}>{row.totalDemand || ''}</td>
                                                <td className="is-right">{row.cdAmount || ''}</td>
                                                <td className="is-right is-info">{row.rlnAmount || ''}</td>
                                                <td className="is-right is-warning">{row.alnAmount || ''}</td>
                                                <td className="is-right is-muted">{row.interest || ''}</td>
                                                <td className="is-right">{row.mdAmount || ''}</td>
                                                <td className="is-right">{row.md1Amount || ''}</td>
                                                <td className="is-center">
                                                    {row.matchMethod ? <span className="aw-pill">{FOUND_BY[row.matchMethod] ?? row.matchMethod}</span> : ''}
                                                </td>
                                                <td className="is-center">
                                                    {row.status === 'Valid' ? (
                                                        <span style={{ display: 'inline-flex', color: 'var(--aw-success)' }}><CheckCircle2 size={14} /></span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, color: 'var(--aw-danger)' }} title={row.remarks}>
                                                            <AlertCircle size={14} /> <span>{row.remarks}</span>
                                                            {/* ES-587: the member was not found - offer similar names, the operator decides */}
                                                            {(row.suggestions?.length ?? 0) > 0 && (
                                                                <Select size="small" placeholder={t('Pick member')} style={{ minWidth: 240 }}
                                                                    className="aw-select" popupClassName="aw-select-popup"
                                                                    onChange={(v: string) => pickMember(row.key, v)}
                                                                    options={row.suggestions!.map(s => ({ value: s.memberNo, label: `${s.memberNo} - ${s.name} (${t('Branch')} ${s.officeno})` }))} />
                                                            )}
                                                        </span>
                                                    )}
                                                </td>
                                                {/* Check column: name / PS.NO. differences and the possible old-EMI / new-EMI mix-up. Saving is never blocked. */}
                                                <td className="is-center">
                                                    {(row.warnings?.length ?? 0) > 0 && (
                                                        <span className="aw-pill tone-warning" style={{ cursor: 'help', marginRight: 4 }}
                                                            title={row.warnings!.join('\n')}>
                                                            <AlertCircle size={11} style={{ marginRight: 4 }} /> {t('Name / PS.NO.')}
                                                        </span>
                                                    )}
                                                    {(row.flags?.length ?? 0) > 0 && (
                                                        <span className="aw-pill tone-warning" style={{ cursor: 'help' }}
                                                            title={row.flags!.map(f => `Loan #${f.loancaseno}: ${f.message}`).join('\n\n')}>
                                                            <AlertCircle size={11} style={{ marginRight: 4 }} /> {t('Check')}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            </>
                        )}
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>{t('Import Demand |')} {importConfig.divisionRO}</span>
                <span>{importConfig.monthStr}-{importConfig.yearStr}</span>
            </div>
        </div>
    );
};

export default ImportDemandListForm;
