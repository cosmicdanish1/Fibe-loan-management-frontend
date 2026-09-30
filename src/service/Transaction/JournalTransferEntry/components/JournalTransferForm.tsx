import React, { useState } from 'react';
import { Select } from 'antd';
import { FileText, Plus, RotateCcw, Save, Trash2, X, Hash } from 'lucide-react';
import { JournalTransferHookReturn, JournalEntry } from '../interface/JournalTransferInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import MemberLookupDialog from '@/components/shared/kit/MemberLookupDialog';
import dayjs from 'dayjs';

const JournalTransferForm: React.FC<JournalTransferHookReturn> = ({
    formData,
    totalDebit,
    totalCredit,
    data,
    isLoading,
    voucherList,
    headList,
    updateField,
    updateRow,
    addRow,
    removeRow,
    handleVoucherSelect,
    handleSave,
    handleReset,
    handleExit,
}) => {
    const [showLookupModal, setShowLookupModal] = useState(false);
    const [lookupRowKey, setLookupRowKey] = useState<string | null>(null);

    const imbalance = totalDebit - totalCredit;
    const isBalanced = Math.abs(imbalance) < 0.01;

    const getMemberDisplayName = (member: any) => (
        member?.memberName ||
        member?.fullname ||
        member?.name ||
        [member?.firstName, member?.middleName, member?.lastName].filter(Boolean).join(' ') ||
        [member?.f_name, member?.m_name, member?.l_name].filter(Boolean).join(' ') ||
        ''
    ).trim();

    const handleMemberSelect = (member: any) => {
        if (!lookupRowKey) return;
        updateRow(lookupRowKey, 'mbno', member.memberNo.toString());
        updateRow(lookupRowKey, 'name', getMemberDisplayName(member));
        setLookupRowKey(null);
    };

    const isMemberMode = formData.transferType === 'memberToMember';

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: 'Post',
        saveEnabled: !(isLoading || !isBalanced || totalDebit <= 0),
    });

    const canPost = !(isLoading || !isBalanced || totalDebit <= 0);
    const closeLookup = () => { setShowLookupModal(false); setLookupRowKey(null); };

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Journal / Transfer Entry</h1>
                    <p className="aw-desc">Double Entry Ledger{formData.voucherNo ? ` · Voucher ${formData.voucherNo}` : ''}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleReset} disabled={isLoading} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Clear</button>
                    <button type="button" onClick={handleSave} disabled={!canPost} className="aw-btn aw-btn-primary">
                        {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isLoading ? 'Posting…' : 'Post'}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Hash size={14} /></span>
                            <h2 className="aw-card-title">Journal Entry</h2>
                            <span className="aw-meta" style={{ marginLeft: 'auto' }}>{dayjs().format('DD-MMM-YY')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.2fr) repeat(3, minmax(130px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="jt-voucher">Voucher No.</label>
                                <Select
                                    id="jt-voucher"
                                    showSearch
                                    allowClear
                                    value={formData.voucherNo || undefined}
                                    onChange={v => handleVoucherSelect(v || '')}
                                    placeholder="Select existing voucher..."
                                    className="aw-select" popupClassName="aw-select-popup"
                                    optionFilterProp="label"
                                    options={voucherList.map(v => ({
                                        value: v.voucherNo,
                                        label: `${v.voucherNo} — ${v.memberName || 'N/A'} | ₹${v.amount?.toLocaleString('en-IN') || '0'}`,
                                    }))}
                                />
                            </div>
                            <div className="aw-panel" style={{ padding: '6px 10px' }}>
                                <span className="aw-label" style={{ margin: 0 }}>Total Debit</span>
                                <p className="aw-strong" style={{ color: 'var(--aw-danger)', fontFamily: 'monospace' }}>₹{totalDebit.toFixed(2)}</p>
                            </div>
                            <div className="aw-panel" style={{ padding: '6px 10px' }}>
                                <span className="aw-label" style={{ margin: 0 }}>Total Credit</span>
                                <p className="aw-strong" style={{ color: 'var(--aw-success)', fontFamily: 'monospace' }}>₹{totalCredit.toFixed(2)}</p>
                            </div>
                            <div>
                                <span className={`aw-pill ${isBalanced ? 'tone-success' : 'tone-danger'}`} style={{ display: 'inline-flex', height: 34, alignItems: 'center' }}>
                                    {isBalanced ? '✓ Balanced' : `Diff ₹${Math.abs(imbalance).toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                        <div>
                            <span className="aw-label">Transfer Type</span>
                            <div className="aw-seg" role="tablist" style={{ maxWidth: 480, ['--seg-index' as any]: formData.transferType === 'memberToMember' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                                {([
                                    { val: 'headToHead', label: 'Head-To-Head Transfer' },
                                    { val: 'memberToMember', label: 'Member-To-Member Transfer' },
                                ] as const).map(opt => (
                                    <button key={opt.val} type="button" role="tab" aria-selected={formData.transferType === opt.val} onClick={() => updateField('transferType', opt.val)}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">Ledger Matrix</h2>
                            <span className="aw-meta">{data.length} row(s)</span>
                            <button type="button" onClick={addRow} className="aw-btn aw-btn-secondary aw-btn-sm" style={{ marginLeft: 'auto' }}><Plus size={12} /> Add Row</button>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: 'calc(100vh - 470px)', minHeight: 160 }}>
                            <table className="aw-table" style={{ minWidth: isMemberMode ? 980 : 760 }}>
                                <thead>
                                    <tr>
                                        {isMemberMode && <th style={{ width: 110 }}>MBNO</th>}
                                        {isMemberMode && <th style={{ width: 170 }}>Name</th>}
                                        <th style={{ width: 130 }}>Code</th>
                                        <th>Name</th>
                                        <th className="is-right is-danger" style={{ width: 130 }}>Debit</th>
                                        <th className="is-right is-success" style={{ width: 130 }}>Credit</th>
                                        <th style={{ width: 150 }}>RD / SD Sr No</th>
                                        <th style={{ width: 44 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length === 0 ? (
                                        <tr><td colSpan={8}>
                                            <div className="aw-empty" style={{ padding: 24 }}>
                                                <span className="aw-meta">No rows yet</span>
                                                <button type="button" onClick={addRow} className="aw-btn aw-btn-secondary aw-btn-sm"><Plus size={12} /> Add First Row</button>
                                            </div>
                                        </td></tr>
                                    ) : data.map((record: JournalEntry) => (
                                        <tr key={record.key}>
                                            {isMemberMode && <td className="is-accent" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{record.mbno || '—'}</td>}
                                            {isMemberMode && <td className="is-muted" title={record.name}>{record.name || '—'}</td>}
                                            <td className="has-input">
                                                <Select
                                                    showSearch
                                                    value={(record.code || undefined) as string}
                                                    onChange={(val: string) => updateRow(record.key, 'code', val)}
                                                    placeholder="Code"
                                                    className="aw-select" popupClassName="aw-select-popup"
                                                    optionFilterProp="label"
                                                    optionLabelProp="value"
                                                    options={headList.map(h => ({ value: h.code, label: `${h.code} ${h.name}` }))}
                                                />
                                            </td>
                                            <td className="has-input">
                                                <Select
                                                    showSearch
                                                    value={(record.code || undefined) as string}
                                                    onChange={(val: string) => updateRow(record.key, 'code', val)}
                                                    placeholder="Account name..."
                                                    className="aw-select" popupClassName="aw-select-popup"
                                                    optionFilterProp="label"
                                                    optionLabelProp="name"
                                                    options={headList.map(h => ({ value: h.code, name: h.name, label: `${h.name} [${h.code}]` } as any))}
                                                />
                                            </td>
                                            <td className="has-input"><input aria-label="Debit" value={record.debit} onChange={e => updateRow(record.key, 'debit', e.target.value)} placeholder="0.00" className="aw-input is-right" /></td>
                                            <td className="has-input"><input aria-label="Credit" value={record.credit} onChange={e => updateRow(record.key, 'credit', e.target.value)} placeholder="0.00" className="aw-input is-right" /></td>
                                            <td className="has-input"><input aria-label="RD / SD Sr No" value={record.rdSdSrNo} onChange={e => updateRow(record.key, 'rdSdSrNo', e.target.value)} placeholder="Ref..." className="aw-input" style={{ fontFamily: 'monospace' }} /></td>
                                            <td className="is-center">
                                                <button type="button" onClick={() => removeRow(record.key)} className="aw-icon-btn is-sm is-danger" aria-label="Remove row" data-tip="Remove row" data-tip-pos="left">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">Narration & Cheque</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 220px', gap: 'var(--aw-gap)', alignItems: 'start' }}>
                            <div>
                                <label className="aw-label" htmlFor="jt-narr">Narration</label>
                                <textarea id="jt-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                                    placeholder="Enter narration…" rows={2}
                                    className="aw-input" style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="jt-cheque">Cheque No.</label>
                                <input id="jt-cheque" value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)}
                                    placeholder="Cheque no..." className="aw-input" style={{ fontFamily: 'monospace' }} />
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Journal / Transfer Entry{formData.voucherNo && <> · <strong style={{ color: 'var(--aw-accent)' }}>Voucher: {formData.voucherNo}</strong></>}</span>
                <span>{isBalanced ? 'Balanced' : 'Pending Balance'} · {formData.transferType === 'headToHead' ? 'Head-To-Head' : 'Member-To-Member'}</span>
            </div>

            <MemberLookupDialog open={showLookupModal} onClose={closeLookup} onSelect={handleMemberSelect} />
        </div>
    );
};

export default JournalTransferForm;
