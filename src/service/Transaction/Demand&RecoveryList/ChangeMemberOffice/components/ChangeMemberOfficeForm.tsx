// components/ChangeMemberOfficeForm.tsx

import React from 'react';
import { Select } from 'antd';
import { ArrowRightLeft, UserCheck, RotateCcw, X, CalendarDays, User } from 'lucide-react';
import { ChangeMemberOfficeHookReturn } from '../interface/ChangeMemberOfficeInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const YEARS = ['2024','2025','2026'];

const ChangeMemberOfficeForm: React.FC<ChangeMemberOfficeHookReturn> = ({
    formData, updateField, handleTransfer, handleCancel, handleExit, isProcessing, offices,
}) => {
    usePageToolbarActions({
        onSave: handleTransfer,
        saveLabel: isProcessing ? 'Processing...' : 'Save',
        saveEnabled: !isProcessing,
    });

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Change Member Office</h1>
                    <p className="aw-desc">Demand &amp; Recovery</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleCancel} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Reset</button>
                    <button type="button" onClick={handleTransfer} disabled={isProcessing} className="aw-btn aw-btn-primary">
                        {isProcessing ? <RotateCcw size={13} className="aw-spin" /> : <UserCheck size={13} />} {isProcessing ? 'Processing...' : 'Save'}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack" style={{ maxWidth: 820 }}>
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><CalendarDays size={14} /></span>
                            <h2 className="aw-card-title">Period</h2>
                        </div>
                        <div className="aw-inline" style={{ gap: 'var(--aw-gap)', flexWrap: 'wrap' }}>
                            <div style={{ width: 150 }}>
                                <label className="aw-label" htmlFor="cmo-month">Month</label>
                                <Select id="cmo-month" value={formData.month} onChange={(v) => updateField('month', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={MONTHS.map(m => ({ value: m, label: m }))} />
                            </div>
                            <div style={{ width: 120 }}>
                                <label className="aw-label" htmlFor="cmo-year">Year</label>
                                <Select id="cmo-year" value={formData.year} onChange={(v) => updateField('year', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={YEARS.map(y => ({ value: y, label: y }))} />
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><User size={14} /></span>
                            <h2 className="aw-card-title">Member</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--aw-gap)' }}>
                            <div>
                                <label className="aw-label" htmlFor="cmo-member">Memb. No.</label>
                                <input id="cmo-member" value={formData.memberNo} onChange={(e) => updateField('memberNo', e.target.value)}
                                    className="aw-input" placeholder="Enter Member Number..." style={{ fontFamily: 'monospace' }} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="cmo-current">Branch No (Current)</label>
                                <input id="cmo-current" value={formData.currentBranchNo} readOnly className="aw-input" placeholder="Auto-filled..." />
                            </div>
                        </div>
                    </section>

                    <section className="aw-card aw-panel-accent">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><ArrowRightLeft size={14} /></span>
                            <h2 className="aw-card-title">Change To New Branch</h2>
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="cmo-new">New Branch</label>
                            <Select id="cmo-new" value={(formData.newBranchNo || undefined) as string} onChange={(v) => updateField('newBranchNo', v)}
                                className="aw-select" popupClassName="aw-select-popup" placeholder="Select New Branch..."
                                options={offices.map(o => ({ value: o.officeId, label: `${o.officeName} (${o.officeId})` }))} />
                        </div>
                    </section>

                    <p className="aw-meta" style={{ textAlign: 'center', fontStyle: 'italic' }}>Total Divisions &amp; Branches (N) &nbsp; 1 &nbsp; 1 &nbsp; 1</p>
                </div>
            </div>

            <div className="aw-footer">
                <span>HR &amp; Admin</span>
                <span>Edit Mode</span>
            </div>
        </div>
    );
};

export default ChangeMemberOfficeForm;
