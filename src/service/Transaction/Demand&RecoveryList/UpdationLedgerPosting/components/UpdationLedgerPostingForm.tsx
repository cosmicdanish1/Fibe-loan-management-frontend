// components/UpdationLedgerPostingForm.tsx

import React from 'react';
import { Select } from 'antd';
import { BookOpenCheck, RotateCcw, X, Loader2, Send } from 'lucide-react';
import { UpdationLedgerPostingHookReturn } from '../interface/UpdationLedgerPostingInterfaces';

const { Option } = Select;
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const YEARS = Array.from({ length: 30 }, (_, i) => (2020 + i).toString());
const lbl = "text-[9px] font-bold text-slate-600 uppercase tracking-wide";

const UpdationLedgerPostingForm: React.FC<UpdationLedgerPostingHookReturn> = ({
    formData, memberGroups, branches, isLoading, isPosting,
    grandTotalSend, grandTotalReceived, grandTotalShort,
    updateField, handleLoad, handlePosting, handleReset, handleExit,
}) => {
    const totalsMatch = grandTotalSend > 0 && grandTotalSend === grandTotalReceived;

    return (
        <div className="ulp-root h-screen flex flex-col bg-white font-sans text-slate-900 overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-3 py-1.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <BookOpenCheck size={14} className="text-indigo-400" />
                    <div>
                        <h1 className="text-[11px] font-black text-white uppercase tracking-wider leading-none">Updation / Ledger Posting</h1>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Passing (Ledger Posting)</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={handlePosting} disabled={isPosting || !totalsMatch}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wide rounded flex items-center gap-1 transition-colors ${totalsMatch && !isPosting ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-600 text-slate-400 cursor-not-allowed'}`}>
                        <Send size={10} /> {isPosting ? 'Posting...' : 'Post'}
                    </button>
                    <button onClick={handleReset}
                        className="px-3 py-1 text-[9px] font-bold uppercase tracking-wide rounded bg-slate-600 hover:bg-slate-500 text-slate-200 flex items-center gap-1">
                        <RotateCcw size={10} /> Reset
                    </button>
                    <button onClick={handleExit}
                        className="px-3 py-1 text-[9px] font-bold uppercase tracking-wide rounded bg-rose-700 hover:bg-rose-600 text-white flex items-center gap-1">
                        <X size={10} /> Exit
                    </button>
                </div>
            </div>

            {/* Config Bar */}
            <div className="ulp-config bg-slate-50 border-b border-slate-200 px-4 py-2 shrink-0">
                <div className="flex items-end gap-3 flex-wrap">
                    <div>
                        <div className={lbl}>Month</div>
                        <Select value={formData.month} onChange={v => updateField('month', v)}
                            className="w-20" style={{ height: 28 }} size="small">
                            {MONTHS.map(m => <Option key={m} value={m}>{m}</Option>)}
                        </Select>
                    </div>
                    <div>
                        <div className={lbl}>Year</div>
                        <Select value={formData.year} onChange={v => updateField('year', v)}
                            className="w-24" style={{ height: 28 }} size="small">
                            {YEARS.map(y => <Option key={y} value={y}>{y}</Option>)}
                        </Select>
                    </div>
                    <div>
                        <div className={lbl}>Branch</div>
                        <Select value={formData.branch || undefined} onChange={v => updateField('branch', v)}
                            placeholder="Select" className="w-48" style={{ height: 28 }} size="small" showSearch allowClear
                            filterOption={(input, option) => String(option?.children).toLowerCase().includes(input.toLowerCase())}>
                            {branches.map(b => (
                                <Option key={b.officeno} value={String(b.officeno)}>
                                    {b.officeno}-{b.office_name}
                                </Option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <div className={lbl}>From Member</div>
                        <input type="text" value={formData.fromMember} onChange={e => updateField('fromMember', e.target.value)}
                            className="w-28 h-7 px-2 border border-slate-300 rounded text-[11px] font-mono" placeholder="" />
                    </div>
                    <div>
                        <div className={lbl}>To Member</div>
                        <input type="text" value={formData.toMember} onChange={e => updateField('toMember', e.target.value)}
                            className="w-28 h-7 px-2 border border-slate-300 rounded text-[11px] font-mono" placeholder="" />
                    </div>
                    <div>
                        <div className={lbl}>Mode of Receipt</div>
                        <div className="flex gap-1">
                            {(['CASH', 'BANK', 'OTHER'] as const).map(m => (
                                <button key={m} onClick={() => updateField('modeOfReceipt', m)}
                                    className={`h-7 px-2 text-[9px] font-bold uppercase rounded border transition-colors ${formData.modeOfReceipt === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'}`}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleLoad} disabled={isLoading}
                        className={`h-7 px-4 text-[10px] font-bold uppercase tracking-wide rounded border flex items-center gap-1.5 transition-colors ${isLoading ? 'bg-slate-200 text-slate-500 cursor-wait border-slate-300' : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-300 hover:border-indigo-500'}`}>
                        {isLoading ? <Loader2 size={11} className="animate-spin" /> : <BookOpenCheck size={11} />}
                        {isLoading ? 'Loading...' : 'Load Data'}
                    </button>
                </div>

                {/* Totals Bar */}
                {memberGroups.length > 0 && (
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-200 text-[9px] font-bold uppercase tracking-wide">
                        <span className="text-slate-500">{memberGroups.length} Member(s)</span>
                        <span className="text-indigo-600">Demand Send: ₹{grandTotalSend.toLocaleString('en-IN')}</span>
                        <span className={grandTotalReceived === grandTotalSend ? 'text-emerald-600' : 'text-rose-600'}>
                            Demand Received: ₹{grandTotalReceived.toLocaleString('en-IN')}
                        </span>
                        {grandTotalShort > 0 && <span className="text-rose-600">Short: ₹{grandTotalShort.toLocaleString('en-IN')}</span>}
                        {totalsMatch && <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">✓ Totals Match — Ready to Post</span>}
                        {grandTotalSend > 0 && !totalsMatch && <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">✗ Totals Do Not Match</span>}
                    </div>
                )}
            </div>

            {/* Data Grid */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="relative mb-4">
                            <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600" />
                            <BookOpenCheck size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
                        </div>
                        <p className="text-[12px] font-bold text-indigo-700 uppercase tracking-wide animate-pulse">Loading Demand Data...</p>
                    </div>
                ) : memberGroups.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <BookOpenCheck size={40} className="mb-2 text-slate-300" />
                        <p className="text-[11px] font-bold uppercase tracking-wide">No Data Loaded</p>
                        <p className="text-[9px] mt-1">Select Month, Year, Branch and click "Load Data"</p>
                    </div>
                ) : (
                    <table className="w-full text-[10px] border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="px-2 py-1.5 text-left text-[8px] font-black text-slate-600 uppercase tracking-wide w-12">Code</th>
                                <th className="px-2 py-1.5 text-left text-[8px] font-black text-slate-600 uppercase tracking-wide">Head Name</th>
                                <th className="px-2 py-1.5 text-right text-[8px] font-black text-slate-600 uppercase tracking-wide w-24">Balance</th>
                                <th className="px-2 py-1.5 text-right text-[8px] font-black text-slate-600 uppercase tracking-wide w-28">Demand Send</th>
                                <th className="px-2 py-1.5 text-right text-[8px] font-black text-indigo-600 uppercase tracking-wide w-28">Demand Received</th>
                                <th className="px-2 py-1.5 text-right text-[8px] font-black text-rose-600 uppercase tracking-wide w-28">Short Recovery</th>
                            </tr>
                        </thead>
                        <tbody>
                            {memberGroups.map((group) => (
                                <React.Fragment key={group.memberNo}>
                                    {/* Member Header */}
                                    <tr className="bg-slate-50 border-t-2 border-slate-300">
                                        <td colSpan={6} className="px-2 py-1.5 font-black text-[10px] text-slate-800">
                                            Member No : [{group.memberNo}] {group.memberName}
                                        </td>
                                    </tr>
                                    {/* Head rows */}
                                    {group.heads.map((head, idx) => (
                                        <tr key={`${group.memberNo}-${head.code}-${idx}`} className="border-b border-slate-100 hover:bg-indigo-50/30">
                                            <td className="px-2 py-0.5 font-bold text-slate-500">{head.code}</td>
                                            <td className="px-2 py-0.5 text-slate-700">{head.headName}</td>
                                            <td className="px-2 py-0.5 text-right font-mono text-slate-500">{head.balance.toFixed(2)}</td>
                                            <td className="px-2 py-0.5 text-right font-mono font-bold text-slate-900">{head.demandSend.toFixed(2)}</td>
                                            <td className="px-2 py-0.5 text-right font-mono font-bold text-indigo-700">{head.demandReceived.toFixed(2)}</td>
                                            <td className="px-2 py-0.5 text-right font-mono font-bold text-rose-600">{head.shortRecovery.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {/* Member total row */}
                                    <tr className="border-b-2 border-slate-200 bg-slate-50/50">
                                        <td colSpan={3} className="px-2 py-0.5 text-right font-black text-[9px] text-slate-500 uppercase">Total</td>
                                        <td className="px-2 py-0.5 text-right font-mono font-black text-slate-900">{group.totalSend.toFixed(2)}</td>
                                        <td className="px-2 py-0.5 text-right font-mono font-black text-indigo-700">{group.totalReceived.toFixed(2)}</td>
                                        <td className="px-2 py-0.5 text-right font-mono font-black text-rose-600">{group.totalShort.toFixed(2)}</td>
                                    </tr>
                                </React.Fragment>
                            ))}
                            {/* Grand Total */}
                            <tr className="bg-slate-200 border-t-2 border-slate-400 sticky bottom-0">
                                <td colSpan={3} className="px-2 py-1.5 text-right font-black text-[10px] text-slate-700 uppercase">Grand Total</td>
                                <td className="px-2 py-1.5 text-right font-mono font-black text-[11px] text-slate-900">{grandTotalSend.toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-right font-mono font-black text-[11px] text-indigo-700">{grandTotalReceived.toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-right font-mono font-black text-[11px] text-rose-600">{grandTotalShort.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer */}
            <div className="ulp-footer bg-slate-50 border-t border-slate-200 px-4 py-1 flex items-center justify-between shrink-0">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    Demand Posting | {formData.modeOfReceipt}
                </span>
                <span className="text-[8px] font-bold text-slate-400">
                    {formData.month}-{formData.year}
                </span>
            </div>

            <style>{`
                html.dark .ulp-root { background-color: #0f172a !important; color: #e2e8f0 !important; }
                html.dark .ulp-config { background-color: #1e293b !important; border-color: #334155 !important; }
                html.dark .ulp-config input { background-color: #1e293b !important; color: #e2e8f0 !important; border-color: #475569 !important; }
                html.dark .ulp-footer { background-color: #1e293b !important; border-color: #334155 !important; }
                html.dark table thead tr { background-color: #1e293b !important; }
                html.dark table th { color: #94a3b8 !important; border-color: #334155 !important; }
                html.dark table td { border-color: #1e293b !important; }
                html.dark table tr:hover { background-color: rgba(59,130,246,0.08) !important; }
                html.dark table tr.bg-slate-50 { background-color: #1e293b !important; }
                html.dark table tr.bg-slate-200 { background-color: #334155 !important; }
            `}</style>
        </div>
    );
};

export default UpdationLedgerPostingForm;
