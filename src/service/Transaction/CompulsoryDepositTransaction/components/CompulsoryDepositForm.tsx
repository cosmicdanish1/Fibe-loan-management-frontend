import React from 'react';
import { ConfigProvider, Input, Select, Spin, Table } from 'antd';
import {
    Landmark, LayoutGrid, RotateCcw, Save, ShieldCheck,
    X, ArrowRightLeft, IndianRupee, FileText, Building2, Calendar,
} from 'lucide-react';
import { CompulsoryDepositHookReturn } from '../interface/CompulsoryDepositInterfaces';
import dayjs from 'dayjs';

const { Option } = Select;

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inp = "h-6 fz-small font-semibold bg-white border-slate-300 rounded";

const CompulsoryDepositForm: React.FC<CompulsoryDepositHookReturn> = ({
    formData,
    members,
    incomeHeads,
    isLoading,
    isPosting,
    updateField,
    updateMemberAmount,
    handleSave,
    handleReset,
    handleExit,
    distributeEqually,
}) => {
    const distributedTotal = members.reduce(
        (sum, m) => sum + (parseFloat(String(m.postAmount || 0)) || 0), 0
    );

    const columns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">MBNO</span>,
            dataIndex: 'memberNo',
            key: 'memberNo',
            width: '10%',
            render: (val: number) => (
                <span className="fz-small font-mono font-black text-indigo-700">{val}</span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Name</span>,
            dataIndex: 'memberName',
            key: 'memberName',
            width: '42%',
            render: (val: string) => (
                <span className="fz-small font-semibold text-slate-700 truncate block" title={val}>{val}</span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Current CD Balance</span>,
            dataIndex: 'currentBalance',
            key: 'currentBalance',
            width: '26%',
            align: 'right' as const,
            render: (val: number) => (
                <span className="fz-small font-black text-emerald-600">
                    ₹{Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Post Amount</span>,
            key: 'postAmount',
            width: '22%',
            align: 'right' as const,
            render: (_: any, record: any) => (
                <Input
                    value={record.postAmount}
                    onChange={e => updateMemberAmount(record.memberNo, e.target.value)}
                    placeholder="0.00"
                    className="cdt2-amt-input"
                />
            ),
        },
    ];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* ── Header ── */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-amber-400/50 bg-amber-600">
                            <Landmark size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Compulsory Deposit Transaction</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> Bulk CD Posting
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={distributeEqually} disabled={isLoading || isPosting}
                            className="h-7 px-3 bg-violet-600/80 hover:bg-violet-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-violet-400/50 uppercase tracking-wide disabled:opacity-50">
                            <ArrowRightLeft size={11} /> Distribute
                        </button>
                        <button onClick={handleReset} disabled={isPosting}
                            className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide disabled:opacity-50">
                            <RotateCcw size={11} /> Clear
                        </button>
                        <button onClick={handleSave} disabled={isPosting || isLoading}
                            className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed">
                            {isPosting ? <Spin size="small" /> : <Save size={11} />}
                            {isPosting ? 'Posting…' : 'Post'}
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit}
                            className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* ── Body (no scroll) ── */}
                <div className="flex-1 flex flex-col min-h-0 p-2 gap-1.5">

                    {/* 1. Config row — shrink-0 */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <FileText size={10} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Deposit Configuration</span>
                            </div>
                            <span className="fz-micro font-black text-slate-400 uppercase">{members.length} member(s)</span>
                        </div>
                        <div className="px-2 py-1.5 grid grid-cols-[140px_1fr_1fr] gap-3 items-end">
                            <div>
                                <label className={lbl}>Amount (₹) <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <IndianRupee size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-indigo-400" />
                                    <Input
                                        value={formData.amount}
                                        onChange={e => updateField('amount', e.target.value)}
                                        placeholder="0.00"
                                        className="h-6 fz-small font-black bg-indigo-50 border-indigo-200 rounded pl-5 text-indigo-700 text-right"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={lbl}>Income Head <span className="text-rose-500">*</span></label>
                                <Select
                                    value={formData.incomeHead || undefined}
                                    onChange={val => updateField('incomeHead', val)}
                                    className="w-full cdt2-sel"
                                    style={{ height: 24 }}
                                    placeholder="Select GL Head..."
                                    loading={isLoading}
                                    showSearch
                                    optionFilterProp="children"
                                >
                                    {incomeHeads.map(head => (
                                        <Option key={head.code} value={head.code}>
                                            {head.code} – {head.name}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <label className={lbl}>Narration</label>
                                <Input
                                    value={formData.narration}
                                    onChange={e => updateField('narration', e.target.value)}
                                    placeholder="Enter narration..."
                                    className={inp}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Member Distribution Table — flex-1 */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
                        <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5">
                                <LayoutGrid size={10} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member Distribution Matrix</span>
                            </div>
                            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                                <span className="fz-micro font-black text-indigo-400 uppercase">Distributed</span>
                                <span className="fz-small font-black text-indigo-700 font-mono">
                                    ₹{distributedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <Table
                                columns={columns}
                                dataSource={members.map(m => ({ ...m, key: m.memberNo }))}
                                pagination={false}
                                rowKey="key"
                                size="small"
                                loading={isLoading}
                                className="cdt2-table"
                                scroll={{ y: 'calc(100vh - 210px)' }}
                                locale={{
                                    emptyText: (
                                        <span className="fz-tiny font-black text-slate-400 uppercase py-4 block text-center">
                                            No active members found
                                        </span>
                                    ),
                                }}
                            />
                        </div>
                    </div>

                </div>

                {/* ── Footer ── */}
                <div className="px-3 py-1 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Compulsory Deposit Transaction</span>
                        {formData.amount && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">Amount: ₹{formData.amount}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-400">
                        <Calendar size={9} />
                        <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            <style>{`
                .cdt2-sel .ant-select-selector { height: 24px !important; min-height: 24px !important; font-size: 10px !important; font-weight: 600 !important; }
                .cdt2-sel .ant-select-selection-item { line-height: 22px !important; font-size: 10px !important; }
                .cdt2-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 8px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .cdt2-table .ant-table-tbody > tr > td { padding: 3px 7px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .cdt2-table .ant-table-tbody > tr:hover > td { background: #eef2ff !important; }
                .cdt2-amt-input { height: 24px !important; min-height: 24px !important; border-radius: 5px !important; border-color: #c7d2fe !important; background: #eef2ff !important; font-size: 10px !important; font-weight: 900 !important; color: #4338ca !important; text-align: right; padding: 2px 6px !important; width: 100%; }
                .cdt2-amt-input:focus { border-color: #818cf8 !important; background: #fff !important; box-shadow: 0 0 0 2px rgba(99,102,241,0.1) !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </ConfigProvider>
    );
};

export default CompulsoryDepositForm;
