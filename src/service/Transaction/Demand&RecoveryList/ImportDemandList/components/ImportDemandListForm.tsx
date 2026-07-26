// components/ImportDemandListForm.tsx

import React from 'react';
import { Select } from 'antd';
import { Upload, Save, RotateCcw, X, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ImportDemandListHookReturn } from '../interface/ImportDemandListInterfaces';

const { Option } = Select;

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const YEARS = Array.from({ length: 30 }, (_, i) => (2020 + i).toString());

const lbl = "text-[9px] font-bold text-slate-600 uppercase tracking-wide";

const ImportDemandListForm: React.FC<ImportDemandListHookReturn> = ({
    importConfig, previewData, branches, isImporting, isSaving, recordCount,
    updateConfig, handleImport, handleSave, handleClear, handleExit,
}) => {
    const validCount = previewData.filter(r => r.status === 'Valid').length;
    const errorCount = previewData.filter(r => r.status === 'Error').length;

    return (
        <div className="idl-root h-screen flex flex-col bg-white font-sans text-slate-900 overflow-hidden">

            {/* ── Header Bar ── */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-3 py-1.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <div>
                        <h1 className="text-[11px] font-black text-white uppercase tracking-wider leading-none">Import Demand</h1>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Demand &amp; Recovery List</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={handleSave} disabled={isSaving || previewData.length === 0}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wide rounded flex items-center gap-1 transition-colors ${previewData.length > 0 && !isSaving ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-600 text-slate-400 cursor-not-allowed'}`}>
                        <Save size={10} /> {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={handleClear}
                        className="px-3 py-1 text-[9px] font-bold uppercase tracking-wide rounded bg-slate-600 hover:bg-slate-500 text-slate-200 flex items-center gap-1">
                        <RotateCcw size={10} /> Clear
                    </button>
                    <button onClick={handleExit}
                        className="px-3 py-1 text-[9px] font-bold uppercase tracking-wide rounded bg-rose-700 hover:bg-rose-600 text-white flex items-center gap-1">
                        <X size={10} /> Exit
                    </button>
                </div>
            </div>

            {/* ── Config Bar ── */}
            <div className="idl-config bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-end gap-4 shrink-0 flex-wrap">
                <div>
                    <div className={lbl}>Division/RO</div>
                    <input type="text" value={importConfig.divisionRO} readOnly
                        className="w-36 h-7 px-2 border border-slate-300 rounded text-[11px] font-bold bg-slate-100" />
                </div>
                <div>
                    <div className={lbl}>Branch</div>
                    <Select value={importConfig.branch || undefined} onChange={v => updateConfig('branch', v)}
                        placeholder="Select Branch" className="w-52" style={{ height: 28 }} size="small" showSearch
                        filterOption={(input, option) => String(option?.children).toLowerCase().includes(input.toLowerCase())}>
                        {branches.map(b => (
                            <Option key={b.officeno} value={String(b.officeno)}>
                                {b.officeno}-{b.office_name}-{b.office_name}-{(b as any).division || b.officeno}
                            </Option>
                        ))}
                    </Select>
                </div>
                <div>
                    <div className={lbl}>Month</div>
                    <Select value={importConfig.monthStr} onChange={v => updateConfig('monthStr', v)}
                        className="w-20" style={{ height: 28 }} size="small">
                        {MONTHS.map(m => <Option key={m} value={m}>{m}</Option>)}
                    </Select>
                </div>
                <div>
                    <div className={lbl}>Year</div>
                    <Select value={importConfig.yearStr} onChange={v => updateConfig('yearStr', v)}
                        className="w-24" style={{ height: 28 }} size="small">
                        {YEARS.map(y => <Option key={y} value={y}>{y}</Option>)}
                    </Select>
                </div>
                <button onClick={handleImport} disabled={isImporting}
                    className={`h-7 px-4 text-[10px] font-bold uppercase tracking-wide rounded border flex items-center gap-1.5 transition-colors ${isImporting ? 'bg-slate-200 text-slate-500 cursor-wait border-slate-300' : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-300 hover:border-indigo-500'}`}>
                    {isImporting ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    {isImporting ? 'Importing...' : 'Import Demand'}
                </button>

                {recordCount > 0 && (
                    <div className="ml-auto flex items-center gap-3 text-[9px] font-bold uppercase tracking-wide">
                        <span className="text-slate-500">{recordCount} Record(s)</span>
                        {validCount > 0 && <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle2 size={9} /> {validCount} Valid</span>}
                        {errorCount > 0 && <span className="text-rose-600 flex items-center gap-0.5"><AlertCircle size={9} /> {errorCount} Error</span>}
                    </div>
                )}
            </div>

            {/* ── Data Table ── */}
            <div className="flex-1 overflow-auto">
                {isImporting ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="relative mb-4">
                            <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600" />
                            <FileSpreadsheet size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
                        </div>
                        <p className="text-[12px] font-bold text-indigo-700 uppercase tracking-wide animate-pulse">Importing Records...</p>
                        <p className="text-[9px] text-slate-500 mt-1">Reading Excel file, validating members, checking columns...</p>
                    </div>
                ) : previewData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                        <FileSpreadsheet size={40} className="mb-2 text-slate-300" />
                        <p className="text-[11px] font-bold uppercase tracking-wide">No Data Loaded</p>
                        <p className="text-[9px] mt-1">Select Branch, Month, Year and click "Import Demand" to load an Excel file</p>
                        <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200 text-left max-w-md">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Expected Excel Format</p>
                            <p className="text-[9px] text-slate-600 leading-relaxed">
                                S.NO. | YYMM | CODE | MS.NO. | PS.NO. | NAME | TOTAL | F/D | R/LOAN | E/LOAN | INTT.
                            </p>
                        </div>
                    </div>
                ) : (
                    <table className="w-full text-[10px] border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-100 border-b border-slate-300">
                                {['Period', 'Branch', 'Member No', 'Personal No', 'Member Name', 'Total Amount', 'RD Amount', 'Regular Loan', 'Emergency Loan', 'Loan Interest', 'IFRS Amt', 'FRS 1 Amt', 'Status'].map(h => (
                                    <th key={h} className="px-2 py-1.5 text-left text-[8px] font-black text-slate-600 uppercase tracking-wide whitespace-nowrap border-r border-slate-200 last:border-r-0">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {previewData.map((row) => (
                                <tr key={row.key} className={`border-b border-slate-100 hover:bg-indigo-50/30 ${row.status === 'Error' ? 'bg-rose-50/40' : ''}`}>
                                    <td className="px-2 py-1 text-slate-500 border-r border-slate-100">{row.period}</td>
                                    <td className="px-2 py-1 text-slate-600 border-r border-slate-100">{row.branch}</td>
                                    <td className="px-2 py-1 font-mono font-bold text-indigo-700 border-r border-slate-100">{row.memberNo}</td>
                                    <td className="px-2 py-1 font-mono text-slate-600 border-r border-slate-100">{row.personalNo}</td>
                                    <td className="px-2 py-1 font-bold text-slate-800 uppercase border-r border-slate-100">{row.memberName}</td>
                                    <td className="px-2 py-1 text-right font-mono font-bold text-slate-900 border-r border-slate-100">{row.totalAmount || ''}</td>
                                    <td className="px-2 py-1 text-right font-mono text-slate-700 border-r border-slate-100">{row.rdAmount || ''}</td>
                                    <td className="px-2 py-1 text-right font-mono text-blue-700 border-r border-slate-100">{row.regularLoanAmt || ''}</td>
                                    <td className="px-2 py-1 text-right font-mono text-orange-700 border-r border-slate-100">{row.emergencyLoanAmt || ''}</td>
                                    <td className="px-2 py-1 text-right font-mono text-slate-600 border-r border-slate-100">{row.loanInterest || ''}</td>
                                    <td className="px-2 py-1 text-right font-mono text-teal-700 border-r border-slate-100">{row.frs1Amount || ''}</td>
                                    <td className="px-2 py-1 text-right font-mono text-purple-700 border-r border-slate-100">{row.frs2Amount || ''}</td>
                                    <td className="px-2 py-1 text-center">
                                        {row.status === 'Valid' ? (
                                            <CheckCircle2 size={11} className="text-emerald-500 inline" />
                                        ) : (
                                            <span className="text-rose-500 flex items-center gap-0.5 justify-center" title={row.remarks}>
                                                <AlertCircle size={11} /> <span className="text-[8px]">{row.remarks}</span>
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="idl-footer bg-slate-50 border-t border-slate-200 px-4 py-1 flex items-center justify-between shrink-0">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Import Demand | {importConfig.divisionRO}
                </span>
                <span className="text-[8px] font-bold text-slate-400">
                    {importConfig.monthStr}-{importConfig.yearStr}
                </span>
            </div>

            <style>{`
                html.dark .idl-root { background-color: #0f172a !important; color: #e2e8f0 !important; }
                html.dark .idl-config { background-color: #1e293b !important; border-color: #334155 !important; }
                html.dark .idl-config input { background-color: #1e293b !important; color: #e2e8f0 !important; border-color: #475569 !important; }
                html.dark .idl-footer { background-color: #1e293b !important; border-color: #334155 !important; }
                html.dark table thead tr { background-color: #1e293b !important; }
                html.dark table th { color: #94a3b8 !important; border-color: #334155 !important; }
                html.dark table td { border-color: #1e293b !important; }
                html.dark table tr:hover { background-color: rgba(59,130,246,0.08) !important; }
            `}</style>
        </div>
    );
};

export default ImportDemandListForm;
