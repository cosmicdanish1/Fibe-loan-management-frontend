// components/DesignationForm.tsx

import React from 'react';
import { ConfigProvider, Input, Table } from 'antd';
import {
    Briefcase, Hash, Save, RotateCcw, X, ShieldCheck,
    Building2, Layers, Calendar, Edit, Trash2,
} from 'lucide-react';
import dayjs from 'dayjs';
import { DesignationHookReturn } from '../interfaces/interface';

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const DesignationForm: React.FC<DesignationHookReturn> = ({
    formData,
    designations,
    isExisting,
    handleChange,
    editDesignation,
    deleteDesignation,
    handleSave,
    handleCancel,
    handleExit
}) => {
    const onExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        } else {
            handleExit();
        }
    };

    const columns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Code</span>,
            dataIndex: 'code',
            key: 'code',
            width: 110,
            render: (text: string) => (
                <span className="fz-small font-mono font-black text-indigo-700 uppercase">{text}</span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Designation Name</span>,
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => (
                <span className="fz-small font-semibold text-slate-800">{text || <span className="text-slate-400 italic">— unnamed —</span>}</span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide text-center block">Level</span>,
            dataIndex: 'level',
            key: 'level',
            width: 70,
            align: 'center' as const,
            render: (text: string) => (
                <span className="fz-small font-bold text-slate-600">{text || '—'}</span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide text-center block">Actions</span>,
            key: 'action',
            width: 80,
            align: 'center' as const,
            render: (_: any, record: any) => (
                <div className="flex items-center justify-center gap-1">
                    <button onClick={() => editDesignation(record)}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <Edit size={12} />
                    </button>
                    <button onClick={() => deleteDesignation(record.code)}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                        <Trash2 size={12} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="desig-form h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <Briefcase size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Designation Master</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> Organizational Hierarchy
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleCancel} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Reset
                        </button>
                        <button onClick={handleSave} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide">
                            <Save size={11} /> Save
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={onExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-2xl mx-auto p-3 pb-4 space-y-2">

                        {/* ── Designation Entry ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Briefcase size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Designation Details</span>
                                <span className={`ml-auto fz-mini font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                    isExisting ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                    {isExisting ? `Editing ${formData.code}` : 'New Entry'}
                                </span>
                            </div>
                            <div className="p-3 space-y-2">

                                <div className="grid grid-cols-2 gap-x-4">
                                    <div>
                                        <label className={labelCls}>Designation Code</label>
                                        <div className="relative">
                                            <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <Input value={formData.code}
                                                onChange={e => handleChange('code', e.target.value)}
                                                placeholder="e.g. DES011"
                                                className={`${inputCls} pl-6 font-mono font-bold text-indigo-700`} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Hierarchical Level</label>
                                        <div className="relative">
                                            <Layers size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <Input value={formData.level}
                                                onChange={e => handleChange('level', e.target.value)}
                                                inputMode="numeric"
                                                placeholder="e.g. 1, 2, 3…"
                                                className={`${inputCls} pl-6 text-center`} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Designation Name</label>
                                    <div className="relative">
                                        <Briefcase size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={formData.name}
                                            onChange={e => handleChange('name', e.target.value)}
                                            placeholder="e.g. Senior Executive Officer"
                                            className={`${inputCls} pl-6`} />
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* ── List ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Building2 size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Designations</span>
                                </div>
                                {designations.length > 0 && (
                                    <span className="fz-mini font-black text-slate-400 uppercase tracking-wide">
                                        {designations.length} entries
                                    </span>
                                )}
                            </div>
                            <div className="max-h-[360px] overflow-auto">
                                <Table
                                    columns={columns}
                                    dataSource={designations}
                                    pagination={false}
                                    size="small"
                                    className="desig-table"
                                    rowKey="code"
                                    locale={{ emptyText: <span className="fz-tiny text-slate-400 py-4 block text-center font-bold uppercase">No designations yet</span> }}
                                    rowClassName={(_, i) => i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Designation Registry</span>
                        {formData.name && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">{formData.name}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500">
                        <Calendar size={9} />
                        <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            <style>{`
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                .desig-table .ant-table-thead > tr > th {
                    background: #f8fafc !important;
                    padding: 4px 12px !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                }
                .desig-table .ant-table-tbody > tr > td {
                    padding: 4px 12px !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                }

                /* ── Dark mode: arbitrary bg hex + the table's own !important light header + badge tints ── */
                html.dark .desig-form { background-color: #0f172a !important; }
                html.dark .desig-table .ant-table-thead > tr > th {
                    background: #0f172a !important; color: #94a3b8 !important; border-bottom-color: #334155 !important;
                }
                html.dark .desig-table .ant-table-tbody > tr > td { border-bottom-color: #1e293b !important; }
                html.dark .desig-form .bg-amber-50 { background-color: #422006 !important; }
                html.dark .desig-form .bg-emerald-50 { background-color: #064e3b !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default DesignationForm;
