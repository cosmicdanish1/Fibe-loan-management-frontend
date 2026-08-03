// components/CastCategoryForm.tsx

import React from 'react';
import { ConfigProvider, Input, Table } from 'antd';
import {
    Users, Hash, Save, RotateCcw, X, ShieldCheck,
    Building2, Edit, Trash2, Tag, Calendar,
} from 'lucide-react';
import dayjs from 'dayjs';
import { CastCategoryHookReturn } from '../interface/CastCategoryInterfaces';

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const CastCategoryForm: React.FC<CastCategoryHookReturn> = ({
    data,
    categories,
    updateCategoryCode,
    updateCategoryName,
    save,
    reset,
    deleteCategory,
    editCategory
}) => {
    const handleExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    };

    // Editing an existing row when the current code matches one already in the list; else it's a new entry.
    const isEditing = !!data.categoryCode && categories.some(c => c.categoryCode === data.categoryCode);

    const columns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Code</span>,
            dataIndex: 'categoryCode',
            key: 'categoryCode',
            width: 90,
            render: (text: string) => (
                <span className="fz-small font-mono font-black text-indigo-700 uppercase">{text}</span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Category Name</span>,
            dataIndex: 'categoryName',
            key: 'categoryName',
            render: (text: string) => (
                <span className="fz-small font-semibold text-slate-800">{text}</span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide text-center block">Actions</span>,
            key: 'action',
            width: 80,
            align: 'center' as const,
            render: (_: any, record: any) => (
                <div className="flex items-center justify-center gap-1">
                    <button onClick={() => editCategory(record)}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <Edit size={12} />
                    </button>
                    <button onClick={() => deleteCategory(record.categoryCode)}
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                        <Trash2 size={12} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="cast-cat h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <Users size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Cast Category Master</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> Administrative Registry
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={reset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Reset
                        </button>
                        <button onClick={save} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide">
                            <Save size={11} /> Save
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-2xl mx-auto p-3 pb-4 space-y-2">

                        {/* ── Entry ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Tag size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Add / Edit Category</span>
                                <span className={`ml-auto fz-mini font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                    isEditing ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                    {isEditing ? `Editing #${data.categoryCode}` : 'New Entry'}
                                </span>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-x-4">
                                <div>
                                    <label className={labelCls}>Category Code</label>
                                    <div className="relative">
                                        <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={data.categoryCode}
                                            onChange={e => updateCategoryCode(e.target.value)}
                                            inputMode="numeric"
                                            placeholder="Auto (e.g. 5)"
                                            className={`${inputCls} pl-6 font-mono font-bold text-indigo-700`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Category Name</label>
                                    <Input value={data.categoryName}
                                        onChange={e => updateCategoryName(e.target.value)}
                                        placeholder="General / OBC / SC / ST…"
                                        className={inputCls} />
                                </div>
                            </div>
                        </div>

                        {/* ── List ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Building2 size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Categories</span>
                                </div>
                                {categories.length > 0 && (
                                    <span className="fz-mini font-black text-slate-400 uppercase tracking-wide">
                                        {categories.length} entries
                                    </span>
                                )}
                            </div>
                            <div className="max-h-[420px] overflow-auto">
                                <Table
                                    columns={columns}
                                    dataSource={categories}
                                    pagination={false}
                                    size="small"
                                    className="cast-table"
                                    rowKey="categoryCode"
                                    locale={{ emptyText: <span className="fz-tiny text-slate-400 py-4 block text-center font-bold uppercase">No categories yet</span> }}
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
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Cast Category Registry</span>
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500">
                        <Calendar size={9} />
                        <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            <style>{`
                .cast-table .ant-table-thead > tr > th {
                    background: #f8fafc !important;
                    padding: 4px 12px !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                }
                .cast-table .ant-table-tbody > tr > td {
                    padding: 4px 12px !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }

                /* ── Dark mode: arbitrary bg hex + the table's own !important light header ── */
                html.dark .cast-cat { background-color: #0f172a !important; }
                html.dark .cast-table .ant-table-thead > tr > th {
                    background: #0f172a !important; color: #94a3b8 !important; border-bottom-color: #334155 !important;
                }
                html.dark .cast-table .ant-table-tbody > tr > td { border-bottom-color: #1e293b !important; }
                html.dark .cast-cat .bg-amber-50 { background-color: #422006 !important; }
                html.dark .cast-cat .bg-emerald-50 { background-color: #064e3b !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default CastCategoryForm;
