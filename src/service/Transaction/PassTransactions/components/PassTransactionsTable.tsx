// components/PassTransactionsTable.tsx

import React, { useState } from 'react';
import { ConfigProvider, Input, Table, Tag, Tooltip } from 'antd';
import {
    RotateCcw, X, ShieldCheck, Building2,
    Search, CheckCircle2, Eye, Trash2, Calendar,
    FileText, Download,
} from 'lucide-react';
import { PassTransactionsHookReturn, TransactionEntry } from '../interface/PassTransactionsInterfaces';
import dayjs from 'dayjs';

const PassTransactionsTable: React.FC<PassTransactionsHookReturn> = ({
    transactionData,
    isLoading,
    handleRefresh,
    handlePass,
    handleDelete,
    handleExport,
    handleExit,
}) => {
    const [searchText, setSearchText] = useState('');

    const filteredData = transactionData.filter(item =>
        item.voucherNo.toLowerCase().includes(searchText.toLowerCase()) ||
        item.memberName.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.loanCaseNo || '').toLowerCase().includes(searchText.toLowerCase())
    );

    // Give each row a stable unique key and compute rowSpan per voucher group
    const dataWithKeys = filteredData.map((row, idx) => ({ ...row, _idx: idx, key: `${row.voucherNo}-${row.trNo}-${row.head}-${idx}` }));

    const voucherGroups: Record<string, { count: number; firstKey: string }> = {};
    dataWithKeys.forEach(row => {
        if (!voucherGroups[row.voucherNo]) {
            voucherGroups[row.voucherNo] = { count: 0, firstKey: row.key };
        }
        voucherGroups[row.voucherNo].count++;
    });

    const getSpan = (record: any): { rowSpan: number } => {
        const group = voucherGroups[record.voucherNo];
        if (!group) return { rowSpan: 1 };
        if (record.key === group.firstKey) return { rowSpan: group.count };
        return { rowSpan: 0 };
    };

    const columns = [
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Tr. No.</span>,
            dataIndex: 'trNo',
            key: 'trNo',
            width: 60,
            fixed: 'left' as const,
            render: (t: string) => <span className="fz-tiny font-bold text-slate-400 font-mono">{t || '—'}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Vchr No.</span>,
            dataIndex: 'voucherNo',
            key: 'voucherNo',
            width: 90,
            fixed: 'left' as const,
            render: (t: string, _: any, idx: number) => <span className="fz-small font-black text-indigo-600 font-mono tracking-tight">{t}</span>,
            onCell: (record: any) => getSpan(record),
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">MB No.</span>,
            dataIndex: 'memberNo',
            key: 'memberNo',
            width: 90,
            render: (t: string) => <span className="fz-small font-black text-slate-600 font-mono">{t}</span>,
            onCell: (record: any) => getSpan(record),
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Name</span>,
            dataIndex: 'memberName',
            key: 'memberName',
            width: 170,
            render: (t: string) => <span className="fz-small font-black text-slate-800 uppercase truncate block" title={t}>{t}</span>,
            onCell: (record: any) => getSpan(record),
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Acc</span>,
            dataIndex: 'noOfAcc',
            key: 'noOfAcc',
            width: 45,
            align: 'center' as const,
            render: (t: string) => <span className="fz-small font-black text-slate-600">{t}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Head</span>,
            dataIndex: 'head',
            key: 'head',
            width: 120,
            render: (t: string) => <span className="fz-small font-black text-indigo-600">{t}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Trans Type</span>,
            dataIndex: 'transType',
            key: 'transType',
            width: 75,
            render: (t: string) => (
                <span className={`fz-small font-black ${t === 'CR' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t}
                </span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Trans Amount</span>,
            dataIndex: 'amount',
            key: 'amount',
            width: 110,
            align: 'right' as const,
            render: (v: number) => (
                <span className="fz-small font-black text-slate-800 font-mono">
                    ₹{v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Vchr Typ</span>,
            dataIndex: 'vchrType',
            key: 'vchrType',
            width: 65,
            align: 'center' as const,
            render: (t: string) => <span className="fz-small font-black text-slate-600">{t || 'P'}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Cheque No.</span>,
            dataIndex: 'chequeNo',
            key: 'chequeNo',
            width: 95,
            render: (t: string) => <span className="fz-tiny font-bold font-mono text-slate-600">{t || '—'}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Cheque Date</span>,
            dataIndex: 'chequeDate',
            key: 'chequeDate',
            width: 95,
            render: (d: string) => (
                <span className="fz-tiny font-bold font-mono text-slate-600">
                    {d ? dayjs(d).format('DD/MM/YY') : '—'}
                </span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Cheque Amt</span>,
            dataIndex: 'chequeAmount',
            key: 'chequeAmount',
            width: 100,
            align: 'right' as const,
            render: (v: number) => v
                ? <span className="fz-tiny font-black font-mono text-slate-700">₹{v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                : <span className="fz-tiny text-slate-400">—</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Bank</span>,
            dataIndex: 'bankName',
            key: 'bankName',
            width: 140,
            render: (t: string) => <span className="fz-tiny font-bold text-slate-600 truncate block" title={t}>{t || '—'}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Pass Flag</span>,
            dataIndex: 'passFlag',
            key: 'passFlag',
            width: 75,
            align: 'center' as const,
            render: (t: string) => (
                <span className={`fz-small font-black ${t === 'Y' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {t || 'N'}
                </span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Narration</span>,
            dataIndex: 'narration',
            key: 'narration',
            width: 200,
            render: (t: string) => (
                <span className="fz-tiny font-medium text-slate-500 truncate block max-w-[180px]" title={t}>{t || '—'}</span>
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Action</span>,
            key: 'action',
            width: 120,
            fixed: 'right' as const,
            align: 'center' as const,
            render: (_: any, record: TransactionEntry) => (
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={() => handleDelete(record.voucherNo)}
                        className="h-6 px-2 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white rounded fz-mini font-black uppercase tracking-wide flex items-center gap-1 transition-colors border border-rose-200 hover:border-rose-500">
                        <Trash2 size={9} /> Reject
                    </button>
                    <button
                        onClick={() => handlePass(record.voucherNo)}
                        className="h-6 px-2 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded fz-mini font-black uppercase tracking-wide flex items-center gap-1 transition-colors border border-emerald-200 hover:border-emerald-500">
                        <CheckCircle2 size={9} /> Pass
                    </button>
                </div>
            ),
            onCell: (record: any) => getSpan(record),
        },
    ];

    const pendingCount = Object.keys(voucherGroups).length;

    // No theme override on the ConfigProvider below, on purpose: it used to
    // hardcode colorPrimary '#6366f1' and borderRadius 6, which shadowed the
    // global ThemeProvider and made Settings → Accent Color / Corner Radius do
    // nothing on this screen. Inheriting lets both settings through.
    return (
        <ConfigProvider>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* ── Header ── */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <ShieldCheck size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Pass Transactions</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <Building2 size={7} className="text-indigo-400" /> Voucher Authorization Portal
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Search */}
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-300" />
                            <input
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                placeholder="Search voucher, member, case..."
                                className="h-7 w-56 bg-white/10 border border-white/20 rounded-lg pl-7 pr-3 fz-small font-semibold text-white placeholder-indigo-300/70 focus:outline-none focus:bg-white/15 focus:border-white/40 transition-all"
                            />
                        </div>
                        <button onClick={handleRefresh}
                            className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} className={isLoading ? 'animate-spin' : ''} /> Refresh
                        </button>
                        <button onClick={handleExport}
                            className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <Download size={11} /> Export
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit}
                            className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 flex flex-col min-h-0 p-2">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">

                        {/* Card Header */}
                        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5">
                                <FileText size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Pending Voucher Registry</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {pendingCount > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse block" />
                                        <span className="fz-mini font-black text-amber-600 uppercase tracking-wide">{pendingCount} awaiting authorization</span>
                                    </div>
                                )}
                                <div className="fz-mini font-black text-slate-400 uppercase">{filteredData.length} record(s)</div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 min-h-0">
                            <Table
                                columns={columns}
                                dataSource={dataWithKeys}
                                pagination={false}
                                loading={isLoading}
                                rowKey="key"
                                size="small"
                                className="pt-table"
                                scroll={{ x: 1200, y: 'calc(100vh - 160px)' }}
                                locale={{
                                    emptyText: (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <CheckCircle2 size={32} className="text-slate-200 mb-2" />
                                            <span className="fz-tiny font-black uppercase tracking-widest text-slate-400">
                                                All caught up — no pending transactions
                                            </span>
                                        </div>
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
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Accounts & Audit</span>
                        <div className="w-px h-2.5 bg-slate-300" />
                        <div className="flex items-center gap-1 text-indigo-500">
                            <ShieldCheck size={9} />
                            <span className="fz-mini font-black uppercase tracking-wide">Secure Authorization Layer Active</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-indigo-400">
                        <Calendar size={9} />
                        <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            <style>{`
                .pt-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 10px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .pt-table .ant-table-tbody > tr > td { padding: 4px 10px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .pt-table .ant-table-tbody > tr:hover > td { background: #f0f9ff !important; }
                .pt-table .ant-table-tbody > tr > td[rowspan] { vertical-align: middle !important; border-right: 1px solid #f1f5f9 !important; }
                .pt-table .ant-table-cell-fix-left, .pt-table .ant-table-cell-fix-right { background: #fff !important; z-index: 2; }
                .pt-table .ant-table-row:hover .ant-table-cell-fix-left,
                .pt-table .ant-table-row:hover .ant-table-cell-fix-right { background: #f0f9ff !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default PassTransactionsTable;
