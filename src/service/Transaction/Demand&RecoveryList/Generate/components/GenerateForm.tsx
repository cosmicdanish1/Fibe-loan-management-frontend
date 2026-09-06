import React from 'react';
import { ConfigProvider, Select } from 'antd';
import { Building2, CalendarDays, RotateCcw, ServerCog, X, Zap } from 'lucide-react';
import { GenerateHookReturn } from '../interface/GenerateInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const { Option } = Select;

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";
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

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6, fontSize: 11 } }}>
            <div className="gen-root h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="gen-header bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <ServerCog size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Demand Generation</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Demand &amp; Recovery</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={resetForm} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 border border-white/20 uppercase tracking-wide transition-all">
                            <RotateCcw size={11} /> Clear
                        </button>
                        <button onClick={generateDemand} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide transition-all">
                            <Zap size={11} /> Generate
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide transition-all">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col min-h-0 p-2 gap-1.5">

                    {/* Period card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                            <CalendarDays size={10} className="text-slate-400" />
                            <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Period</span>
                        </div>
                        <div className="px-3 py-2 flex items-end gap-3">
                            <div>
                                <label className={lbl}>Month</label>
                                <Select value={formData.month} onChange={(v) => updateField('month', v)} size="small" className="gen-sel w-32">
                                    {months.map(m => <Option key={m} value={m}>{m}</Option>)}
                                </Select>
                            </div>
                            <div>
                                <label className={lbl}>Year</label>
                                <Select value={formData.year} onChange={(v) => updateField('year', v)} size="small" className="gen-sel w-24">
                                    {years.map(y => <Option key={y} value={y}>{y}</Option>)}
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Office card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                            <Building2 size={10} className="text-slate-400" />
                            <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Office</span>
                        </div>
                        <div className="px-3 py-2 space-y-2">
                            <div className="grid grid-cols-[120px_1fr_32px] items-center gap-2">
                                <label className={lbl}>Division / RO</label>
                                <Select value={formData.divisionRO || undefined} onChange={(v) => updateField('divisionRO', v)} size="small" className="gen-sel w-full" placeholder="Select division">
                                    {divisions.map(d => <Option key={d.value} value={d.value}>{d.label}</Option>)}
                                </Select>
                                <span className="fz-small font-black text-indigo-600 text-center">{divisionCode}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr_32px] items-center gap-2">
                                <label className={lbl}>From</label>
                                <Select value={formData.from || undefined} onChange={(v) => updateField('from', v)} size="small" className="gen-sel w-full" placeholder="Select from branch">
                                    {branches.map(b => <Option key={b.value} value={b.value}>{b.label}</Option>)}
                                </Select>
                                <span className="fz-small font-black text-indigo-600 text-center">{fromCode}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr_32px] items-center gap-2">
                                <label className={lbl}>To</label>
                                <Select value={formData.to || undefined} onChange={(v) => updateField('to', v)} size="small" className="gen-sel w-full" placeholder="Select to branch">
                                    {branches.map(b => <Option key={b.value} value={b.value}>{b.label}</Option>)}
                                </Select>
                                <span className="fz-small font-black text-indigo-600 text-center">{toCode}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="gen-footer px-3 py-1 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <CalendarDays size={9} className="text-indigo-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">{formData.month} {formData.year}</span>
                        <div className="w-px h-2.5 bg-slate-300" />
                        <Building2 size={9} className="text-indigo-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">{formData.divisionRO || 'No division selected'}</span>
                    </div>
                    <span className="fz-mini font-black text-indigo-400 uppercase tracking-wide">Demand Generation</span>
                </div>
            </div>
            <style>{`
                .gen-sel .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 10px !important; font-weight: 800 !important; }
                .gen-sel .ant-select-selection-item { line-height: 26px !important; font-size: 10px !important; font-weight: 800 !important; }

                /* ── Dark mode ── */
                html.dark .gen-root { background-color: #000000 !important; color: #f5f5f7 !important; }
                html.dark .gen-header { background: #0c0c0e !important; }
                html.dark .gen-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .gen-root .bg-white { background-color: #1c1c1e !important; }
                html.dark .gen-root .border-slate-200,
                html.dark .gen-root .border-slate-100 { border-color: rgba(255,255,255,.08) !important; }
                html.dark .gen-root .text-slate-500 { color: #8e8e93 !important; }
                html.dark .gen-root .text-slate-400 { color: #71717a !important; }
                html.dark .gen-root .bg-slate-300 { background-color: rgba(255,255,255,.08) !important; }
                html.dark .gen-sel .ant-select-selector { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
                html.dark .ant-select-dropdown { background-color: #1c1c1e !important; }
                html.dark .ant-select-dropdown .ant-select-item { color: #f5f5f7 !important; }
                html.dark .ant-select-dropdown .ant-select-item-option-active { background-color: rgba(255,255,255,.08) !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default GenerateForm;
