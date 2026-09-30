// components/SavingAccountForm.tsx

import React, { useEffect } from 'react';
import { Select, DatePicker } from 'antd';
import {
    User, Landmark, Calendar, IndianRupee, Users,
    Save, RotateCcw, Building2,
    Info, X, Hash, Plus, Trash2
} from 'lucide-react';
import dayjs from 'dayjs';
import { SavingAccountHookReturn } from '../interfaces/interface';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import MemberField from '../../../../components/shared/kit/MemberField';

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
    // Fill the member fields from a chosen member. The combined name is split into first / middle / last
    // because the member lookup only returns a single combined `memberName`.
    const applyMember = (member: any) => {
        if (!member) return;
        const mbno = String(member.memberNo || member.mbno || member.memberNumber || '');
        if (!mbno) return;
        updateField('memberNo', mbno);
        updateField('prefix', member.prefix || member.salutation || 'Mr.');
        const fullName = String(member.memberName || member.name || member.firstName || '').trim();
        const parts = fullName.split(/\s+/).filter(Boolean);
        updateField('firstName', member.firstName || member.fname || parts[0] || '');
        updateField('middleName', member.middleName || member.mname || (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''));
        updateField('lastName', member.lastName || member.lname || (parts.length > 1 ? parts[parts.length - 1] : ''));
    };

    useEffect(() => {
        // Kept for a member chosen in the separate lookup window: window.electron.ipcRenderer.on
        // strips the raw Electron event, so the callback receives the member directly.
        const ipc = (window as any).electron?.ipcRenderer;
        if (ipc) {
            ipc.on('member-selected', applyMember);
            return () => { ipc.removeListener?.('member-selected', applyMember); };
        }
    }, [updateField]);

    const handleExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    };

    usePageToolbarActions({
        onSave: save,
        saveLabel: 'Save',
    });

    return (
        <div className="app-window">

            {/* Header */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Saving Account Opening</h1>
                    <p className="aw-desc">New Account Registration</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={reset} className="aw-btn aw-btn-secondary" data-tip="Clear the whole form" data-tip-pos="bottom-end">
                        <RotateCcw size={13} /> Purge
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
                <div className="aw-stack aw-narrow" style={{ maxWidth: 900 }}>

                    {/* ── Member Details ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><User size={14} /></span>
                            <h2 className="aw-card-title">Member Details</h2>
                            {(data.firstName || data.lastName) && (
                                <span className="aw-strong" style={{ marginLeft: 'auto', color: 'var(--aw-accent)' }}>
                                    {[data.prefix, data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ')}
                                </span>
                            )}
                        </div>
                        <div className="aw-form-12">
                            <div className="aw-c-4">
                                <label className="aw-label" htmlFor="sa-member">Member No.</label>
                                <MemberField id="sa-member" value={data.memberNo} onChange={v => updateField('memberNo', v)} onSelect={applyMember}
                                    placeholder="Member no..." digitsOnly shortcuts openOnClick />
                            </div>

                            <div className="aw-c-4">
                                <label className="aw-label" htmlFor="sa-account">Account No.</label>
                                <div className="aw-input-wrap has-icon">
                                    <Hash size={13} />
                                    <input id="sa-account" value={data.accountNo}
                                        onChange={(e) => updateField('accountNo', e.target.value.replace(/\D/g, ''))}
                                        placeholder="Account no..." className="aw-input" />
                                </div>
                            </div>

                            <div className="aw-c-4">
                                <label className="aw-label" htmlFor="sa-prefix">Prefix</label>
                                <Select id="sa-prefix" value={data.prefix} onChange={(val) => updateField('prefix', val)}
                                    className="aw-select" popupClassName="aw-select-popup"
                                    options={['Mr.', 'Mrs.', 'Ms.', 'Dr.'].map(p => ({ value: p, label: p }))} />
                            </div>

                            <div className="aw-c-12">
                                <span className="aw-label" id="sa-name-label">Full Name (First / Middle / Last)</span>
                                <div className="aw-inline" role="group" aria-labelledby="sa-name-label">
                                    <input value={data.firstName} onChange={(e) => updateField('firstName', e.target.value)} placeholder="First" aria-label="First name" className="aw-input" />
                                    <input value={data.middleName} onChange={(e) => updateField('middleName', e.target.value)} placeholder="Middle" aria-label="Middle name" className="aw-input" />
                                    <input value={data.lastName} onChange={(e) => updateField('lastName', e.target.value)} placeholder="Last" aria-label="Last name" className="aw-input" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Account Details ── */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Landmark size={14} /></span>
                            <h2 className="aw-card-title">Account Details</h2>
                        </div>
                        <div className="aw-form-3">
                            <div>
                                <label className="aw-label" htmlFor="sa-opening-date">Opening Date</label>
                                <DatePicker id="sa-opening-date"
                                    value={data.openingDate ? dayjs(data.openingDate) : null}
                                    onChange={(d) => updateField('openingDate', d ? d.format('YYYY-MM-DD') : '')}
                                    format="DD-MMM-YY" className="aw-picker" popupClassName="aw-select-popup"
                                    suffixIcon={<Calendar size={13} />} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="sa-opening-balance">Opening Balance</label>
                                <div className="aw-input-wrap has-icon">
                                    <IndianRupee size={13} />
                                    <input id="sa-opening-balance" value={data.openingBalance}
                                        onChange={(e) => updateField('openingBalance', numeric(e.target.value))}
                                        inputMode="decimal" placeholder="0.00" className="aw-input is-right" />
                                </div>
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="sa-ledger">Ledger Group</label>
                                <Select id="sa-ledger" value={data.ledgerGroup} onChange={(val) => updateField('ledgerGroup', val)}
                                    className="aw-select" popupClassName="aw-select-popup"
                                    options={[
                                        { value: 'General', label: 'General Savings' },
                                        { value: 'Staff', label: 'Staff Savings' },
                                        { value: 'Institutional', label: 'Institutional' },
                                    ]} />
                            </div>
                        </div>
                    </section>

                    {/* ── Nominee Details ── */}
                    <section className="aw-card aw-main">
                        <div className="aw-main-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <span className="aw-card-icon"><Users size={14} /></span>
                                <h2 className="aw-card-title">Nominee Details</h2>
                            </div>
                            <button type="button" onClick={addNominee} className="aw-btn aw-btn-secondary aw-btn-sm">
                                <Plus size={12} /> Add Nominee
                            </button>
                        </div>
                        <div className="aw-main-body" style={{ padding: 0, maxHeight: 280 }}>
                            {data.nominees.length === 0 ? (
                                <div className="aw-empty">
                                    <Users size={30} />
                                    <span>No nominees added — click Add Nominee</span>
                                </div>
                            ) : (
                                <table className="aw-table">
                                    <thead>
                                        <tr>
                                            <th>Nominee Name</th>
                                            <th>Address</th>
                                            <th className="is-center" style={{ width: 90 }}>Age</th>
                                            <th className="is-center" style={{ width: 170 }}>Relation</th>
                                            <th style={{ width: 44 }} aria-label="Remove" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.nominees.map((n, i) => (
                                            <tr key={n.id}>
                                                <td className="has-input">
                                                    <input value={n.name} onChange={(e) => updateNominee(n.id, 'name', e.target.value)}
                                                        placeholder="Full name" aria-label={`Nominee ${i + 1} name`} className="aw-input" />
                                                </td>
                                                <td className="has-input">
                                                    <input value={n.address} onChange={(e) => updateNominee(n.id, 'address', e.target.value)}
                                                        placeholder="Address" aria-label={`Nominee ${i + 1} address`} className="aw-input" />
                                                </td>
                                                <td className="has-input">
                                                    <input value={n.age} onChange={(e) => updateNominee(n.id, 'age', e.target.value)}
                                                        placeholder="Age" aria-label={`Nominee ${i + 1} age`} className="aw-input" style={{ textAlign: 'center' }} />
                                                </td>
                                                <td className="has-input">
                                                    <Select value={n.relation || null} onChange={(val) => updateNominee(n.id, 'relation', val as string)}
                                                        placeholder="Select" aria-label={`Nominee ${i + 1} relation`} className="aw-select" popupClassName="aw-select-popup"
                                                        options={RELATIONS.map(r => ({ value: r, label: r }))} />
                                                </td>
                                                <td className="is-center">
                                                    <button type="button" onClick={() => removeNominee(n.id)} className="aw-icon-btn is-sm is-danger"
                                                        aria-label={`Remove nominee ${i + 1}`} data-tip="Remove nominee" data-tip-pos="left">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>

                    {/* ── Special Instructions ── */}
                    <section className="aw-card">
                        <label className="aw-label" htmlFor="sa-instructions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Info size={12} /> Special Instructions
                        </label>
                        <textarea id="sa-instructions" value={data.specialInstructions}
                            onChange={(e) => updateField('specialInstructions', e.target.value)}
                            rows={3} placeholder="Additional notes or instructions…" className="aw-input" />
                    </section>

                </div>
            </div>

            {/* Footer */}
            <div className="aw-footer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={12} /> Saving Account Registry
                    <span style={{ opacity: .5 }}>·</span> Authorized
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--aw-accent)' }}><Calendar size={12} /> {dayjs().format('DD-MMM-YY')}</span>
            </div>

        </div>
    );
};

export default SavingAccountForm;
