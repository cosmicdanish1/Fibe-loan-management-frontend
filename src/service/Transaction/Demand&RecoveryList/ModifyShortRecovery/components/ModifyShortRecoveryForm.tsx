// components/ModifyShortRecoveryForm.tsx

import React from 'react';
import { ConfigProvider, Select, Table } from 'antd';
import { Banknote, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, Save, Building2 } from 'lucide-react';
import { ModifyShortRecoveryHookReturn } from '../interface/ModifyShortRecoveryInterfaces';

const { Option } = Select;

const lbl = "block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-0.5";

const ModifyShortRecoveryForm: React.FC<ModifyShortRecoveryHookReturn> = ({
    formData, updateField, shortRecoveryList, selectedRecord,
    handleSelectRecord, handleSaveAdjustment, handleRefresh, handleExit,
}) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const total = shortRecoveryList.length;

    const columns = [
        { title: <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Member No</span>, dataIndex: 'memberNo', key: 'memberNo', width: 120, render: (t: string) => <span className="text-[10px] font-black text-indigo-700 font-mono">{t}</span> },
        { title: <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Name</span>, dataIndex: 'memberName', key: 'memberName', width: 200, render: (t: string) => <span className="text-[10px] font-black text-slate-800 uppercase">{t}</span> },
        { title: <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Type</span>, dataIndex: 'recoveryType', key: 'recoveryType', width: 100, render: (t: string) => <span className="text-[10px] font-bold text-slate-600">{t}</span> },
        { title: <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Expected</span>, dataIndex: 'expectedAmount', key: 'expectedAmount', align: 'right' as const, width: 100, render: (v: number) => <span className="text-[10px] font-black text-slate-700 font-mono">{v.toLocaleString()}</span> },
        { title: <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Recovered</span>, dataIndex: 'recoveredAmount', key: 'recoveredAmount', align: 'right' as const, width: 100, render: (v: number) => <span className="text-[10px] font-black text-emerald-600 font-mono">{v.toLocaleString()}</span> },
        { title: <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Shortfall</span>, dataIndex: 'shortfallAmount', key: 'shortfallAmount', align: 'right' as const, width: 100, render: (v: number) => <span className="text-[10px] font-black text-rose-600 font-mono">{v.toLocaleString()}</span> },
        {
            title: <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Status</span>,
            dataIndex: 'status', key: 'status', align: 'center' as const, width: 80,
            render: (s: string) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${s === 'Adjusted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                    {s}
                </span>
            ),
        },
    ];

    const navBtn = "h-7 w-8 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 text-slate-500 rounded transition-all active:scale-95";

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <Banknote size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-[11px] font-black text-white tracking-wider uppercase leading-none">Modify Short Recovery</h1>
                            <p className="text-[7px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Demand &amp; Recovery</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleRefresh} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 border border-white/20 uppercase tracking-wide transition-all">
                            <RotateCcw size={11} /> Refresh
                        </button>
                        <button onClick={handleSaveAdjustment} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide transition-all">
                            <Save size={11} /> Save
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide transition-all">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col min-h-0 p-2 gap-1.5">

                    {/* Wing selector */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="px-3 py-1.5 border-b border-slate-100">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Select Wing</span>
                        </div>
                        <div className="px-3 py-2">
                            <label className={lbl}>Wing</label>
                            <Select value={formData.wing} onChange={(v) => updateField('wing', v)} size="small" className="msr-sel w-full" placeholder="Select Wing...">
                                <Option value="BHILAI">BHILAI</Option>
                                <Option value="Wing A">Wing A</Option>
                                <Option value="Wing B">Wing B</Option>
                                <Option value="Wing C">Wing C</Option>
                            </Select>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="px-3 py-1.5 border-b border-slate-100">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Navigation</span>
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <button onClick={() => setCurrentIndex(0)} disabled={currentIndex === 0} className={navBtn}><ChevronsLeft size={13} /></button>
                                <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className={navBtn}><ChevronLeft size={13} /></button>
                                <div className="h-7 w-28 bg-slate-50 border border-slate-200 rounded flex items-center justify-center">
                                    <span className="text-[9px] font-black text-indigo-600">{total > 0 ? `${currentIndex + 1} / ${total}` : '—'}</span>
                                </div>
                                <button onClick={() => setCurrentIndex(Math.min(total - 1, currentIndex + 1))} disabled={currentIndex >= total - 1} className={navBtn}><ChevronRight size={13} /></button>
                                <button onClick={() => setCurrentIndex(total - 1)} disabled={currentIndex >= total - 1} className={navBtn}><ChevronsRight size={13} /></button>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{total} record(s)</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Short Recovery Records</span>
                            {selectedRecord && (
                                <span className="text-[8px] font-black text-indigo-600 uppercase">Selected: {selectedRecord.memberNo}</span>
                            )}
                        </div>
                        <div className="flex-1 min-h-0">
                            <Table
                                columns={columns}
                                dataSource={shortRecoveryList}
                                rowKey="id"
                                pagination={false}
                                size="small"
                                className="msr-table"
                                scroll={{ y: 'calc(100vh - 270px)' }}
                                onRow={(record) => ({
                                    onClick: () => handleSelectRecord(record),
                                    className: `cursor-pointer transition-colors ${selectedRecord?.id === record.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`,
                                })}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5"><Building2 size={9} className="text-slate-400" /><span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Recoveries</span></div>
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wide">Supervisor Mode</span>
                </div>
            </div>
            <style>{`
                .msr-sel .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 10px !important; font-weight: 700 !important; }
                .msr-sel .ant-select-selection-item { line-height: 26px !important; font-size: 10px !important; }
                .msr-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 8px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .msr-table .ant-table-tbody > tr > td { padding: 4px 8px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .msr-table .ant-table-tbody > tr:hover > td { background: #f8fafc !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default ModifyShortRecoveryForm;
