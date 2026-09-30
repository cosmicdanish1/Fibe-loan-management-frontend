// components/ModifyBalanceForm.tsx

import React from 'react';
import { Select } from 'antd';
import {
    Building2, ChevronsLeft, ChevronLeft, ChevronRight,
    ChevronsRight, RotateCcw, Save,
    Users, X, Calendar, IndianRupee, TrendingDown
} from 'lucide-react';
import dayjs from 'dayjs';
import type { MemberBalanceHookReturn, MemberBalanceData } from '../interfaces/interface';
import MemberLookupInput from '../../../../components/shared/MemberLookup/MemberLookupInput';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

// Amount box: rupee icon, right-aligned figures.
const AmtInput: React.FC<{
    value: string;
    onChange: (val: string) => void;
    label: string;
    placeholder?: string;
    accent?: boolean;
}> = ({ value, onChange, label, placeholder = '0.00', accent }) => (
    <div className="aw-input-wrap has-icon">
        <IndianRupee size={13} />
        <input
            type="number"
            inputMode="decimal"
            aria-label={label}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (['e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
            onWheel={e => (e.target as HTMLInputElement).blur()}
            placeholder={placeholder}
            className={`aw-input is-right ${accent ? 'is-accent' : ''}`}
        />
    </div>
);

const ModifyBalanceForm: React.FC<MemberBalanceHookReturn> = ({
    formData, setFormData,
    wing, setWing, wings,
    memberNo, memberName,
    memberIndex, memberTotal,
    handleMemberSelect,
    navigateMember,
    save, reset,
}) => {
    const handleExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    };

    const upd = (key: keyof MemberBalanceData) => (val: string) =>
        setFormData(prev => ({ ...prev, [key]: val }));

    usePageToolbarActions({
        onSave: save,
        saveLabel: 'Save',
    });

    const rows: { label: string; dot: string; op: keyof MemberBalanceData; amt?: keyof MemberBalanceData; muted?: boolean }[] = [
        { label: 'Shares', dot: 'var(--aw-accent)', op: 'shareOpBal', amt: 'shareAmt' },
        { label: 'Monthly Contribution', dot: 'var(--aw-success)', op: 'mdOpBal', amt: 'mdAmt' },
        { label: 'Compulsory Deposit', dot: 'var(--aw-warning)', op: 'cdOpBal', amt: 'cdAmt' },
        { label: 'Loan Exec. Receipt', dot: 'var(--aw-muted)', op: 'lnExecRec', muted: true },
    ];

    return (
        <div className="app-window">

            {/* Header */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Modify Member Balance</h1>
                    <p className="aw-desc">fundsmaster — Edit Balances</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={reset} className="aw-btn aw-btn-secondary" data-tip="Undo changes and reload this member" data-tip-pos="bottom-end">
                        <RotateCcw size={13} /> Revert
                    </button>
                    <button type="button" onClick={save} className="aw-btn aw-btn-primary">
                        <Save size={13} /> Save
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost" data-tip="Close this window" data-tip-pos="bottom-end">
                        <X size={13} /> Exit
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="aw-content">
                <div className="aw-stack aw-narrow" style={{ maxWidth: 880 }}>

                    {/* ── Member Selection ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Users size={14} /></span>
                            <h2 className="aw-card-title">Member Selection</h2>
                            {memberTotal > 0 && (
                                <span className="aw-pill" style={{ marginLeft: 'auto' }}>
                                    {memberIndex > 0 ? `${memberIndex} / ${memberTotal}` : `${memberTotal} members`}
                                </span>
                            )}
                        </div>
                        <div className="aw-form-3">
                            {/* Wing */}
                            <div>
                                <label className="aw-label" htmlFor="mmb-wing">Select Wing</label>
                                <Select
                                    id="mmb-wing"
                                    value={wing || null}
                                    onChange={(v) => setWing(v as string)}
                                    placeholder="Select wing..."
                                    className="aw-select"
                                    popupClassName="aw-select-popup"
                                    allowClear
                                    options={wings.map(w => ({ value: w.id, label: w.name }))}
                                />
                            </div>

                            {/* Member No with navigation */}
                            <div className="aw-span-2">
                                <label className="aw-label" htmlFor="mmb-member">Member No</label>
                                <div className="aw-inline" style={{ alignItems: 'center' }}>
                                    <div className="aw-btn-group">
                                        <button type="button" onClick={() => navigateMember('first')} className="aw-btn aw-btn-secondary"
                                            aria-label="First member" data-tip="First member" data-tip-pos="top-start">
                                            <ChevronsLeft size={14} />
                                        </button>
                                        <button type="button" onClick={() => navigateMember('prev')} className="aw-btn aw-btn-secondary"
                                            aria-label="Previous member" data-tip="Previous member">
                                            <ChevronLeft size={14} />
                                        </button>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <MemberLookupInput
                                            variant="kit"
                                            value={memberNo}
                                            onChange={handleMemberSelect}
                                            placeholder="Enter member no or search..."
                                            showLookupButton={true}
                                            autoSearch={true}
                                        />
                                    </div>
                                    <div className="aw-btn-group">
                                        <button type="button" onClick={() => navigateMember('next')} className="aw-btn aw-btn-secondary"
                                            aria-label="Next member" data-tip="Next member">
                                            <ChevronRight size={14} />
                                        </button>
                                        <button type="button" onClick={() => navigateMember('last')} className="aw-btn aw-btn-secondary"
                                            aria-label="Last member" data-tip="Last member" data-tip-pos="top-end">
                                            <ChevronsRight size={14} />
                                        </button>
                                    </div>
                                </div>
                                {memberName && (
                                    <div className="aw-strong aw-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--aw-accent)' }}>
                                        <Users size={13} /> {memberName}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ── Main Balances ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><IndianRupee size={14} /></span>
                            <h2 className="aw-card-title">Balances</h2>
                        </div>

                        <div className="aw-bal-grid" style={{ marginBottom: 4 }}>
                            <div />
                            <span className="aw-label is-right" style={{ textAlign: 'right', margin: 0 }}>Opening Balance</span>
                            <span className="aw-label is-right" style={{ textAlign: 'right', margin: 0 }}>Install / Contri Amt</span>
                        </div>
                        <div className="aw-bal-grid">
                            {rows.map(r => (
                                <React.Fragment key={r.label}>
                                    <div className="aw-bal-label" style={r.muted ? { color: 'var(--aw-muted)' } : undefined}>
                                        <span className="aw-bal-dot" style={{ background: r.dot }} />{r.label}
                                    </div>
                                    <AmtInput value={formData[r.op]} onChange={upd(r.op)} label={`${r.label} opening balance`} />
                                    {r.amt ? <AmtInput value={formData[r.amt]} onChange={upd(r.amt)} label={`${r.label} installment amount`} /> : <div />}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Suspense Balance — full-width highlight */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--aw-border)' }}>
                            <div className="aw-bal-label" style={{ color: 'var(--aw-danger)' }}>
                                <span className="aw-bal-dot" style={{ background: 'var(--aw-danger)' }} />Suspense Balance
                            </div>
                            <div style={{ width: 170 }}>
                                <AmtInput value={formData.suspBal} onChange={upd('suspBal')} label="Suspense balance" accent />
                            </div>
                        </div>
                    </section>

                    {/* ── Loans ── */}
                    <div className="aw-two">
                        {[
                            { title: 'Regular Loan', op: 'rlnOpBal' as const, amt: 'rlnAmt' as const },
                            { title: 'Emergency Loan', op: 'elnOpBal' as const, amt: 'elnAmt' as const },
                        ].map(l => (
                            <section key={l.title} className="aw-card">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><TrendingDown size={14} /></span>
                                    <h2 className="aw-card-title">{l.title}</h2>
                                </div>
                                <div className="aw-two" style={{ gap: 10 }}>
                                    <div>
                                        <label className="aw-label">Op. Balance</label>
                                        <AmtInput value={formData[l.op]} onChange={upd(l.op)} label={`${l.title} opening balance`} />
                                    </div>
                                    <div>
                                        <label className="aw-label">Inst. Amount</label>
                                        <AmtInput value={formData[l.amt]} onChange={upd(l.amt)} label={`${l.title} installment amount`} />
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div className="aw-footer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={12} /> Modify Balance Registry
                    {memberName && <span style={{ color: 'var(--aw-accent)' }}>· {memberName}</span>}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--aw-accent)' }}><Calendar size={12} /> {dayjs().format('DD-MMM-YY')}</span>
            </div>

        </div>
    );
};

export default ModifyBalanceForm;
