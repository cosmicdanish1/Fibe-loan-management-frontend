// components/FdRdSbEntryForm.tsx

import React, { useEffect } from 'react';
import { Select, DatePicker } from 'antd';
import { Database, Save, RotateCcw, X, Users, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { FdRdSbEntryHookReturn } from '../interface/FdRdSbEntryInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';
import MemberField from '@/components/shared/kit/MemberField';

const ENTRY_TYPES = [
    { id: 'RD', label: 'Monthly Deposit (MD)',    accType: 'MD', code: 'L1002' },
    { id: 'SB', label: 'Monthly Deposit 2 (MD1)', accType: 'MD1', code: 'L1045' },
];

const FdRdSbEntryForm: React.FC<FdRdSbEntryHookReturn> = ({
    formData,
    updateField,
    handleMemberSelect,
    handleSave,
    handleClear,
    handleExit,
    isLoading,
}) => {
    useEffect(() => {
        // BUG FIX 19 (same as SavingAccountForm.tsx): window.electron.ipcRenderer.on strips the
        // raw Electron event before calling back — func(data), not func(event, data) — so the
        // two-parameter signature here always received `member === undefined` and crashed on
        // first property access. Same root cause, same fix.
        const handler = (member: any) => {
            if (!member) return;
            const no = String(member.memberNo || member.mbno || '');
            const name = member.memberName || member.fullname || '';
            if (no) handleMemberSelect(no, { memberNo: no, memberName: name });
        };
        const ipc = (window as any).electron?.ipcRenderer;
        if (ipc) {
            ipc.on('member-selected', handler);
            return () => ipc.removeListener?.('member-selected', handler);
        }
    }, [handleMemberSelect]);

    const onMemberPicked = (member: any) => {
        const no = String(member.memberNo || member.mbno || '');
        const name = member.memberName || member.fullname || '';
        if (no) handleMemberSelect(no, { memberNo: no, memberName: name });
    };

    const activeType = ENTRY_TYPES.find(t => t.id === formData.entryType) || ENTRY_TYPES[0]!;
    const typeIndex = Math.max(0, ENTRY_TYPES.findIndex(t => t.id === formData.entryType));

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !isLoading,
    });

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">FD / RD / SB Entry</h1>
                    <p className="aw-desc">Writes to ledger{formData.memberName ? ` · ${formData.memberName}` : ''}</p>
                </div>
                <div className="aw-actions">
                    <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: typeIndex, ['--seg-count' as any]: ENTRY_TYPES.length }}>
                        {ENTRY_TYPES.map(tab => (
                            <button key={tab.id} type="button" role="tab" aria-selected={formData.entryType === tab.id} onClick={() => updateField('entryType', tab.id)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Clear</button>
                    <button type="button" onClick={handleSave} disabled={isLoading} className="aw-btn aw-btn-primary">
                        {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack" style={{ maxWidth: 860 }}>
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Users size={14} /></span>
                            <h2 className="aw-card-title">Member</h2>
                            {formData.memberName && <span className="aw-strong" style={{ marginLeft: 'auto', color: 'var(--aw-accent)' }}>{formData.memberName}</span>}
                        </div>
                        <div style={{ maxWidth: 420 }}>
                            <span className="aw-label">Member No.</span>
                            <MemberField
                                value={formData.memberNo}
                                onChange={v => { updateField('memberNo', v); updateField('memberName', ''); }}
                                onSelect={onMemberPicked}
                                onSubmit={v => { if (v) handleMemberSelect(v); }}
                                placeholder="Click or press F2 to search…"
                                shortcuts
                                openOnClick
                            />
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Database size={14} /></span>
                            <h2 className="aw-card-title">Transaction Details</h2>
                            <span className="aw-pill tone-info" style={{ marginLeft: 'auto' }}>{activeType.accType} / {activeType.code}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--aw-gap)' }}>
                            <div>
                                <label className="aw-label" htmlFor="fd-date">Transaction Date</label>
                                <DatePicker id="fd-date" value={formData.transDate ? dayjs(formData.transDate) : null}
                                    onChange={d => updateField('transDate', d ? d.format('YYYY-MM-DD') : '')}
                                    format="DD-MMM-YY" className="aw-picker" popupClassName="aw-select-popup" />
                            </div>
                            <div>
                                <span className="aw-label">Transaction Type</span>
                                <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: formData.transType === 'DR' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                                    <button type="button" role="tab" aria-selected={formData.transType === 'CR'} onClick={() => updateField('transType', 'CR')}>
                                        <ArrowDownCircle size={13} /> CR
                                    </button>
                                    <button type="button" role="tab" aria-selected={formData.transType === 'DR'} onClick={() => updateField('transType', 'DR')}>
                                        <ArrowUpCircle size={13} /> DR
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="fd-amount">Amount</label>
                                <input id="fd-amount" type="number" value={formData.amount} onChange={e => updateField('amount', e.target.value)}
                                    placeholder="0.00" className="aw-input is-right" style={{ fontWeight: 700 }} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="fd-receipt">Receipt / Voucher No</label>
                                <input id="fd-receipt" value={formData.receiptVchrNo} onChange={e => updateField('receiptVchrNo', e.target.value)}
                                    placeholder="R001" className="aw-input" />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="fd-vtype">Voucher Type</label>
                                <Select id="fd-vtype" value={formData.vchrType} onChange={v => updateField('vchrType', v)}
                                    className="aw-select" popupClassName="aw-select-popup"
                                    options={[
                                        { value: 'R', label: 'Receipt (R)' },
                                        { value: 'P', label: 'Payment (P)' },
                                        { value: 'J', label: 'Journal (J)' },
                                        { value: 'C', label: 'Contra (C)' },
                                    ]} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="fd-mode">Mode of Payment</label>
                                <Select id="fd-mode" value={formData.modeOfPay} onChange={v => updateField('modeOfPay', v)}
                                    className="aw-select" popupClassName="aw-select-popup"
                                    options={[
                                        { value: 'C', label: 'Cash' },
                                        { value: 'Q', label: 'Cheque' },
                                        { value: 'T', label: 'Transfer' },
                                        { value: 'O', label: 'Online' },
                                    ]} />
                            </div>
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="fd-narr">Narration</label>
                            <textarea id="fd-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                                placeholder="Enter narration / remarks…" rows={2}
                                className="aw-input" style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>{activeType.label}{formData.memberName && <> · <strong style={{ color: 'var(--aw-accent)' }}>{formData.memberName}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>
        </div>
    );
};

export default FdRdSbEntryForm;
