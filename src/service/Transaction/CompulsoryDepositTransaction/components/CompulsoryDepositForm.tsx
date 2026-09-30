import React from 'react';
import { Select } from 'antd';
import { LayoutGrid, RotateCcw, Save, X, ArrowRightLeft, IndianRupee, FileText } from 'lucide-react';
import { CompulsoryDepositHookReturn } from '../interface/CompulsoryDepositInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';

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

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: 'Save',
        saveEnabled: !(isPosting || isLoading),
    });

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Compulsory Deposit Transaction</h1>
                    <p className="aw-desc">Bulk CD Posting</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={distributeEqually} disabled={isLoading || isPosting} className="aw-btn aw-btn-secondary">
                        <ArrowRightLeft size={13} /> Distribute
                    </button>
                    <button type="button" onClick={handleReset} disabled={isPosting} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Clear</button>
                    <button type="button" onClick={handleSave} disabled={isPosting || isLoading} className="aw-btn aw-btn-primary">
                        {isPosting ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isPosting ? 'Posting…' : 'Post'}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">Deposit Configuration</h2>
                            <span className="aw-meta" style={{ marginLeft: 'auto' }}>{members.length} member(s)</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 0.6fr) minmax(220px, 1fr) minmax(220px, 1fr)', gap: 'var(--aw-gap)', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="cd-amount">Amount (₹) <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <div className="aw-input-wrap has-icon">
                                    <IndianRupee size={13} />
                                    <input id="cd-amount" value={formData.amount} onChange={e => updateField('amount', e.target.value)}
                                        placeholder="0.00" className="aw-input is-right" style={{ fontWeight: 700 }} />
                                </div>
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="cd-head">Income Head <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <Select
                                    id="cd-head"
                                    value={(formData.incomeHead || undefined) as string}
                                    onChange={val => updateField('incomeHead', val)}
                                    className="aw-select" popupClassName="aw-select-popup"
                                    placeholder="Select GL Head..."
                                    loading={isLoading}
                                    showSearch
                                    optionFilterProp="label"
                                    options={incomeHeads.map(head => ({ value: head.code, label: `${head.code} – ${head.name}` }))}
                                />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="cd-narr">Narration</label>
                                <input id="cd-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                                    placeholder="Enter narration..." className="aw-input" />
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><LayoutGrid size={14} /></span>
                            <h2 className="aw-card-title">Member Distribution Matrix</h2>
                            <span className="aw-pill" style={{ marginLeft: 'auto' }}>
                                Distributed ₹{distributedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 180 }}>
                            <table className="aw-table" style={{ minWidth: 640 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 120 }}>MBNO</th>
                                        <th>Name</th>
                                        <th className="is-right" style={{ width: 200 }}>Current CD Balance</th>
                                        <th className="is-right" style={{ width: 170 }}>Post Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading && members.length === 0 ? (
                                        <tr><td colSpan={4}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-spin" /></div></td></tr>
                                    ) : members.length === 0 ? (
                                        <tr><td colSpan={4}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">No active members found</span></div></td></tr>
                                    ) : members.map(m => (
                                        <tr key={m.memberNo}>
                                            <td className="is-accent" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{m.memberNo}</td>
                                            <td title={m.memberName}>{m.memberName}</td>
                                            <td className="is-right is-success">₹{Number(m.currentBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td className="has-input">
                                                <input aria-label={`Post amount for member ${m.memberNo}`} value={m.postAmount}
                                                    onChange={e => updateMemberAmount(m.memberNo, e.target.value)}
                                                    placeholder="0.00" className="aw-input is-right" style={{ fontWeight: 700 }} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Compulsory Deposit Transaction{formData.amount && <> · <strong style={{ color: 'var(--aw-accent)' }}>Amount: ₹{formData.amount}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>
        </div>
    );
};

export default CompulsoryDepositForm;
