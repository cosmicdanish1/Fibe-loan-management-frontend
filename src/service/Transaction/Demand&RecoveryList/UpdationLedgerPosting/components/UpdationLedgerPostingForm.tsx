// components/UpdationLedgerPostingForm.tsx

import React from 'react';
import { Select } from 'antd';
import { BookOpenCheck, RotateCcw, X, Send } from 'lucide-react';
import { UpdationLedgerPostingHookReturn } from '../interface/UpdationLedgerPostingInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const YEARS = Array.from({ length: 30 }, (_, i) => (2020 + i).toString());
const MODES = ['CASH', 'BANK', 'OTHER'] as const;

const UpdationLedgerPostingForm: React.FC<UpdationLedgerPostingHookReturn> = ({
    formData, memberGroups, branches, isLoading, isPosting,
    grandTotalSend, grandTotalReceived, grandTotalShort,
    updateField, handleLoad, handlePosting, handleReset, handleExit,
}) => {
    const totalsMatch = grandTotalSend > 0 && grandTotalSend === grandTotalReceived;
    const rowHead: React.CSSProperties = { fontWeight: 700 };

    usePageToolbarActions({
        onSave: handlePosting,
        saveLabel: isPosting ? 'Posting...' : 'Post',
        saveEnabled: !(isPosting || !totalsMatch),
    });

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Updation / Ledger Posting</h1>
                    <p className="aw-desc">Passing (Ledger Posting)</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handlePosting} disabled={isPosting || !totalsMatch} className="aw-btn aw-btn-primary">
                        {isPosting ? <RotateCcw size={13} className="aw-spin" /> : <Send size={13} />} {isPosting ? 'Posting...' : 'Post'}
                    </button>
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Reset</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><BookOpenCheck size={14} /></span>
                            <h2 className="aw-card-title">Posting Selection</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="ulp-month">Month</label>
                                <Select id="ulp-month" value={formData.month} onChange={v => updateField('month', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={MONTHS.map(m => ({ value: m, label: m }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="ulp-year">Year</label>
                                <Select id="ulp-year" value={formData.year} onChange={v => updateField('year', v)}
                                    className="aw-select" popupClassName="aw-select-popup" options={YEARS.map(y => ({ value: y, label: y }))} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className="aw-label" htmlFor="ulp-branch">Branch</label>
                                <Select id="ulp-branch" value={(formData.branch || undefined) as string} onChange={v => updateField('branch', v)}
                                    placeholder="Select" className="aw-select" popupClassName="aw-select-popup" showSearch allowClear
                                    optionFilterProp="label"
                                    options={branches.map(b => ({ value: String(b.officeno), label: `${b.officeno}-${b.office_name}` }))} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="ulp-from">From Member</label>
                                <input id="ulp-from" type="text" value={formData.fromMember} onChange={e => updateField('fromMember', e.target.value)}
                                    className="aw-input" style={{ fontFamily: 'monospace' }} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="ulp-to">To Member</label>
                                <input id="ulp-to" type="text" value={formData.toMember} onChange={e => updateField('toMember', e.target.value)}
                                    className="aw-input" style={{ fontFamily: 'monospace' }} />
                            </div>
                        </div>
                        <div className="aw-inline" style={{ gap: 'var(--aw-gap)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div>
                                <span className="aw-label">Mode of Receipt</span>
                                <div className="aw-seg" role="tablist" style={{ width: 280, ['--seg-index' as any]: Math.max(0, MODES.indexOf(formData.modeOfReceipt)), ['--seg-count' as any]: MODES.length }}>
                                    {MODES.map(m => (
                                        <button key={m} type="button" role="tab" aria-selected={formData.modeOfReceipt === m} onClick={() => updateField('modeOfReceipt', m)}>{m}</button>
                                    ))}
                                </div>
                            </div>
                            <button type="button" onClick={handleLoad} disabled={isLoading} className="aw-btn aw-btn-secondary">
                                {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <BookOpenCheck size={13} />} {isLoading ? 'Loading...' : 'Load Data'}
                            </button>
                        </div>

                        {memberGroups.length > 0 && (
                            <div className="aw-inline" style={{ gap: 8, flexWrap: 'wrap' }}>
                                <span className="aw-pill">{memberGroups.length} Member(s)</span>
                                <span className="aw-pill">Demand Send ₹{grandTotalSend.toLocaleString('en-IN')}</span>
                                <span className={`aw-pill ${grandTotalReceived === grandTotalSend ? 'tone-success' : 'tone-danger'}`}>Demand Received ₹{grandTotalReceived.toLocaleString('en-IN')}</span>
                                {grandTotalShort > 0 && <span className="aw-pill tone-danger">Short ₹{grandTotalShort.toLocaleString('en-IN')}</span>}
                                {totalsMatch && <span className="aw-pill tone-success">✓ Totals Match — Ready to Post</span>}
                                {grandTotalSend > 0 && !totalsMatch && <span className="aw-pill tone-danger">✗ Totals Do Not Match</span>}
                            </div>
                        )}
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><BookOpenCheck size={14} /></span>
                            <h2 className="aw-card-title">Demand Data</h2>
                        </div>
                        {isLoading ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <span className="aw-spin" />
                                <p className="aw-strong">Loading Demand Data...</p>
                            </div>
                        ) : memberGroups.length === 0 ? (
                            <div className="aw-empty" style={{ padding: 32 }}>
                                <BookOpenCheck size={32} />
                                <p className="aw-strong">No Data Loaded</p>
                                <span className="aw-meta">Select Month, Year, Branch and click "Load Data"</span>
                            </div>
                        ) : (
                            <div className="aw-table-wrap" style={{ maxHeight: 'calc(100vh - 470px)', minHeight: 200 }}>
                                <table className="aw-table" style={{ minWidth: 760 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 80 }}>Code</th>
                                            <th>Head Name</th>
                                            <th className="is-right" style={{ width: 120 }}>Balance</th>
                                            <th className="is-right" style={{ width: 140 }}>Demand Send</th>
                                            <th className="is-right is-accent" style={{ width: 150 }}>Demand Received</th>
                                            <th className="is-right is-danger" style={{ width: 150 }}>Short Recovery</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {memberGroups.map((group) => (
                                            <React.Fragment key={group.memberNo}>
                                                <tr>
                                                    <td colSpan={6} style={{ ...rowHead, background: 'var(--aw-surface-muted)' }}>
                                                        Member No : [{group.memberNo}] {group.memberName}
                                                    </td>
                                                </tr>
                                                {group.heads.map((head, idx) => (
                                                    <tr key={`${group.memberNo}-${head.code}-${idx}`}>
                                                        <td className="is-muted" style={rowHead}>{head.code}</td>
                                                        <td>{head.headName}</td>
                                                        <td className="is-right is-muted">{head.balance.toFixed(2)}</td>
                                                        <td className="is-right" style={rowHead}>{head.demandSend.toFixed(2)}</td>
                                                        <td className="is-right is-accent" style={rowHead}>{head.demandReceived.toFixed(2)}</td>
                                                        <td className="is-right is-danger" style={rowHead}>{head.shortRecovery.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan={3} className="is-right is-muted" style={rowHead}>Total</td>
                                                    <td className="is-right" style={rowHead}>{group.totalSend.toFixed(2)}</td>
                                                    <td className="is-right is-accent" style={rowHead}>{group.totalReceived.toFixed(2)}</td>
                                                    <td className="is-right is-danger" style={rowHead}>{group.totalShort.toFixed(2)}</td>
                                                </tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} className="is-right">Grand Total</td>
                                            <td className="is-right">{grandTotalSend.toFixed(2)}</td>
                                            <td className="is-right is-accent">{grandTotalReceived.toFixed(2)}</td>
                                            <td className="is-right is-danger">{grandTotalShort.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Demand Posting | {formData.modeOfReceipt}</span>
                <span>{formData.month}-{formData.year}</span>
            </div>
        </div>
    );
};

export default UpdationLedgerPostingForm;
