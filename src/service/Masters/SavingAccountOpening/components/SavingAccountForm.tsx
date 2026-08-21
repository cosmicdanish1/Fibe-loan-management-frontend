// components/SavingAccountForm.tsx

import React, { useEffect, useRef } from 'react';
import { ConfigProvider, Input, Select, DatePicker, Table } from 'antd';
import {
    User, Landmark, Calendar, IndianRupee, Users,
    Save, RotateCcw, Search, ShieldCheck, Building2,
    Info, X, Hash, BookOpen, Plus, Trash2
} from 'lucide-react';
import dayjs from 'dayjs';
import { SavingAccountHookReturn } from '../interfaces/interface';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

const { Option } = Select;
const { TextArea } = Input;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

// Keep money fields numeric: digits + a single decimal point.
const numeric = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, '');
    const i = cleaned.indexOf('.');
    return i === -1 ? cleaned : cleaned.slice(0, i + 1) + cleaned.slice(i + 1).replace(/\./g, '');
};

const RELATIONS = ['Son', 'Daughter', 'Wife', 'Husband', 'Father', 'Mother', 'Brother', 'Sister', 'Grandson', 'Granddaughter', 'Other'];

const SavingAccountForm: React.FC<SavingAccountHookReturn> = ({
    data,
    updateField,
    addNominee,
    removeNominee,
    updateNominee,
    save,
    reset
}) => {
    const memberInputRef = useRef<any>(null);
    const lastSpaceRef = useRef<number>(0);

    const openMemberLookup = () => {
        const eAPI = (window as any).electronAPI;
        if (eAPI?.openNewWindow) {
            eAPI.openNewWindow('/common/member-lookup');
        }
    };

    useEffect(() => {
        // BUG FIX 19: window.electron.ipcRenderer.on (the bridge used below) strips the raw
        // Electron event before invoking its callback — it calls func(data), not func(event, data)
        // (see preload.ts's "legacy" electron.ipcRenderer.on, vs. the separate electronAPI.ipcRenderer.on
        // used elsewhere, which does preserve the event). This handler was written for the latter
        // convention, so `member` was always undefined and every selection crashed with
        // "Cannot read properties of undefined (reading 'memberNo')" — silently, since nothing
        // upstream surfaced the thrown error, so the form just looked like it wasn't responding.
        const handler = (member: any) => {
            if (!member) return;
            const mbno = String(member.memberNo || member.mbno || member.memberNumber || '');
            if (!mbno) return;
            updateField('memberNo', mbno);
            updateField('prefix', member.prefix || member.salutation || 'Mr.');
            // BUG FIX 20: /members/lookup only returns a single combined `memberName` string
            // (no separate firstName/middleName/lastName), so these always fell through to
            // empty. Best-effort split of the combined name into first/middle/last.
            const fullName = String(member.memberName || member.name || member.firstName || '').trim();
            const parts = fullName.split(/\s+/).filter(Boolean);
            updateField('firstName', member.firstName || member.fname || parts[0] || '');
            updateField('middleName', member.middleName || member.mname || (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''));
            updateField('lastName', member.lastName || member.lname || (parts.length > 1 ? parts[parts.length - 1] : ''));
        };

        const ipc = (window as any).electron?.ipcRenderer;
        if (ipc) {
            ipc.on('member-selected', handler);
            return () => { ipc.removeListener?.('member-selected', handler); };
        }
    }, [updateField]);

    const handleMemberKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'F2') { e.preventDefault(); openMemberLookup(); return; }
        if (e.key === ' ') {
            const now = Date.now();
            if (now - lastSpaceRef.current < 500) { e.preventDefault(); openMemberLookup(); return; }
            lastSpaceRef.current = now;
        }
    };

    const handleExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    };

    const nomineeColumns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Nominee Name</span>,
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: any) => (
                <Input
                    value={text}
                    onChange={(e) => updateNominee(record.id, 'name', e.target.value)}
                    className="h-6 fz-small font-semibold bg-white border-slate-300 rounded px-1.5"
                    placeholder="Full name"
                />
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Address</span>,
            dataIndex: 'address',
            key: 'address',
            render: (text: string, record: any) => (
                <Input
                    value={text}
                    onChange={(e) => updateNominee(record.id, 'address', e.target.value)}
                    className="h-6 fz-small font-semibold bg-white border-slate-300 rounded px-1.5"
                    placeholder="Address"
                />
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide text-center block">Age</span>,
            dataIndex: 'age',
            key: 'age',
            width: 70,
            align: 'center' as const,
            render: (text: string, record: any) => (
                <Input
                    value={text}
                    onChange={(e) => updateNominee(record.id, 'age', e.target.value)}
                    className="h-6 fz-small font-semibold bg-white border-slate-300 rounded text-center px-1"
                    placeholder="Age"
                />
            ),
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide text-center block">Relation</span>,
            dataIndex: 'relation',
            key: 'relation',
            width: 130,
            align: 'center' as const,
            render: (text: string, record: any) => (
                <Select
                    value={text || undefined}
                    onChange={(val) => updateNominee(record.id, 'relation', val)}
                    placeholder="Select"
                    size="small"
                    className="w-full"
                >
                    {RELATIONS.map(r => <Option key={r} value={r}>{r}</Option>)}
                </Select>
            ),
        },
        {
            title: '',
            key: 'action',
            width: 36,
            render: (_: any, record: any) => (
                <button
                    onClick={() => removeNominee(record.id)}
                    className="h-6 w-6 flex items-center justify-center rounded text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                    <Trash2 size={12} />
                </button>
            ),
        },
    ];

    usePageToolbarActions({
        onSave: save,
        saveLabel: 'Save',
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="sa-form h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <BookOpen size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Saving Account Opening</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> New Account Registration
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={reset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Purge
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
                    <div className="max-w-4xl mx-auto p-3 pb-4 space-y-2">

                        {/* ── Member Details ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <User size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member Details</span>
                                {(data.firstName || data.lastName) && (
                                    <span className="ml-auto fz-tiny font-black text-indigo-600">
                                        {[data.prefix, data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ')}
                                    </span>
                                )}
                            </div>
                            <div className="p-3 grid grid-cols-12 gap-x-3 gap-y-2">
                                {/* Member No */}
                                <div className="col-span-3">
                                    <label className={labelCls}>Member No.</label>
                                    <div className="flex gap-1">
                                        <div className="relative flex-1">
                                            <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                ref={memberInputRef}
                                                value={data.memberNo}
                                                onChange={(e) => updateField('memberNo', e.target.value.replace(/\D/g, ''))}
                                                onKeyDown={handleMemberKeyDown}
                                                onClick={openMemberLookup}
                                                placeholder="Member no..."
                                                className={`${inputCls} pl-6`}
                                            />
                                        </div>
                                        <button
                                            onClick={openMemberLookup}
                                            className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0"
                                        >
                                            <Search size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Account No */}
                                <div className="col-span-2">
                                    <label className={labelCls}>Account No.</label>
                                    <div className="relative">
                                        <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={data.accountNo}
                                            onChange={(e) => updateField('accountNo', e.target.value)}
                                            placeholder="Account no..."
                                            className={`${inputCls} pl-6 font-bold text-indigo-700`}
                                        />
                                    </div>
                                </div>

                                {/* Prefix */}
                                <div className="col-span-1">
                                    <label className={labelCls}>Prefix</label>
                                    <Select
                                        value={data.prefix}
                                        onChange={(val) => updateField('prefix', val)}
                                        className="w-full"
                                        style={{ height: 28 }}
                                    >
                                        <Option value="Mr.">Mr.</Option>
                                        <Option value="Mrs.">Mrs.</Option>
                                        <Option value="Ms.">Ms.</Option>
                                        <Option value="Dr.">Dr.</Option>
                                    </Select>
                                </div>

                                {/* Full Name */}
                                <div className="col-span-6">
                                    <label className={labelCls}>Full Name (First / Middle / Last)</label>
                                    <div className="flex gap-1">
                                        <Input
                                            value={data.firstName}
                                            onChange={(e) => updateField('firstName', e.target.value)}
                                            placeholder="First"
                                            className={inputCls}
                                        />
                                        <Input
                                            value={data.middleName}
                                            onChange={(e) => updateField('middleName', e.target.value)}
                                            placeholder="Middle"
                                            className={inputCls}
                                        />
                                        <Input
                                            value={data.lastName}
                                            onChange={(e) => updateField('lastName', e.target.value)}
                                            placeholder="Last"
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Account Details ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Landmark size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Account Details</span>
                            </div>
                            <div className="p-3 grid grid-cols-4 gap-x-4 gap-y-2">
                                <div>
                                    <label className={labelCls}>Opening Date</label>
                                    <DatePicker
                                        value={data.openingDate ? dayjs(data.openingDate) : null}
                                        onChange={(d) => updateField('openingDate', d ? d.format('YYYY-MM-DD') : '')}
                                        format="DD-MMM-YY"
                                        className="w-full h-7 fz-caption"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Opening Balance</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={data.openingBalance}
                                            onChange={(e) => updateField('openingBalance', numeric(e.target.value))}
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            className={`${inputCls} pl-6 text-right font-bold text-slate-700`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Ledger Group</label>
                                    <Select
                                        value={data.ledgerGroup}
                                        onChange={(val) => updateField('ledgerGroup', val)}
                                        className="w-full"
                                        style={{ height: 28 }}
                                    >
                                        <Option value="General">General Savings</Option>
                                        <Option value="Staff">Staff Savings</Option>
                                        <Option value="Institutional">Institutional</Option>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* ── Nominee Details ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Users size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Nominee Details</span>
                                </div>
                                <button
                                    onClick={addNominee}
                                    className="h-6 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded fz-tiny font-black uppercase tracking-wide flex items-center gap-1 transition-colors border border-indigo-200"
                                >
                                    <Plus size={9} /> Add Nominee
                                </button>
                            </div>
                            <div className="max-h-[160px] overflow-auto">
                                {data.nominees.length === 0 ? (
                                    <div className="py-6 text-center fz-tiny font-bold text-slate-400 uppercase tracking-wider">
                                        No nominees added — click Add Nominee
                                    </div>
                                ) : (
                                    <Table
                                        columns={nomineeColumns}
                                        dataSource={data.nominees}
                                        rowKey="id"
                                        pagination={false}
                                        size="small"
                                        className="sa-nominee-table"
                                        scroll={{ x: 'max-content' }}
                                        rowClassName={(_, index) => index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                                    />
                                )}
                            </div>
                        </div>

                        {/* ── Special Instructions ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                            <label className={labelCls + " flex items-center gap-1"}>
                                <Info size={9} /> Special Instructions
                            </label>
                            <TextArea
                                value={data.specialInstructions}
                                onChange={(e) => updateField('specialInstructions', e.target.value)}
                                rows={3}
                                placeholder="Additional notes or instructions…"
                                className="fz-small font-medium bg-slate-50 border-slate-200 rounded resize-none mt-1"
                            />
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Saving Account Registry</span>
                        <div className="w-px h-2.5 bg-slate-300" />
                        <span className="fz-mini font-black text-slate-400 uppercase tracking-wide">Authorized</span>
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500">
                        <Calendar size={9} />
                        <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            <style>{`
                .sa-nominee-table .ant-table-thead > tr > th {
                    background: #f8fafc !important;
                    padding: 4px 8px !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    font-size: 8px !important;
                }
                .sa-nominee-table .ant-table-tbody > tr > td {
                    padding: 3px 8px !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                }
                .ant-select-selector { font-size: 11px !important; }
                .ant-picker-input > input { font-size: 11px !important; font-weight: 600 !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }

                /* ── Dark mode: arbitrary bg hex + nominee table's own !important light styles ── */
                html.dark .sa-form { background-color: #0f172a !important; }
                html.dark .sa-nominee-table .ant-table-thead > tr > th {
                    background: #0f172a !important; color: #94a3b8 !important; border-bottom-color: #334155 !important;
                }
                html.dark .sa-nominee-table .ant-table-tbody > tr > td { border-bottom-color: #1e293b !important; }
                html.dark .sa-form .bg-indigo-50 { background-color: #312e81 !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default SavingAccountForm;
