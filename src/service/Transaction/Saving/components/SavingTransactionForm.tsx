// components/SavingTransactionForm.tsx

import React from 'react';
import { Select, DatePicker, AutoComplete } from 'antd';
import { RotateCcw, Save, X, Building2, Banknote, Hash, FileText, IndianRupee } from 'lucide-react';
import { SavingTransactionHookReturn, TransactionHistoryRow } from '../interface/SavingTransactionInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';

const SavingTransactionForm: React.FC<SavingTransactionHookReturn> = ({
    formData,
    bankAccounts,
    sbAccounts,
    transactionHistory,
    isLoading,
    isLoadingAccount,
    lastSaved,
    updateField,
    handleAccountNoChange,
    handleSave,
    handleReset,
    handleExit,
}) => {
    const onExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        } else {
            handleExit();
        }
    };

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !isLoading,
    });

    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const isDeposit = formData.transactionType === 'deposit';

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Saving Voucher</h1>
                    <p className="aw-desc">Deposit / Withdrawal{formData.accountNo ? ` · A/C ${formData.accountNo}` : ''}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Reset</button>
                    <button type="button" onClick={handleSave} disabled={isLoading} className="aw-btn aw-btn-primary">
                        {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={onExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    {lastSaved && (
                        <div className="aw-alert aw-alert-success aw-fade-in" style={{ alignItems: 'center' }} role="status">
                            <span style={{ flex: 1 }}>
                                Saved — {lastSaved.type === 'deposit' ? 'Deposit' : 'Withdrawal'} <strong>{lastSaved.voucherNo}</strong> &nbsp;|&nbsp;
                                A/C No <strong>{lastSaved.accountNo}</strong> &nbsp;|&nbsp;
                                Amount <strong>₹{fmt(lastSaved.amount)}</strong>
                            </span>
                            <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary aw-btn-sm"><RotateCcw size={11} /> New</button>
                        </div>
                    )}

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Hash size={14} /></span>
                            <h2 className="aw-card-title">Account</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 3fr) minmax(170px, 1fr)', gap: 'var(--aw-gap)', alignItems: 'start' }}>
                            <div>
                                <label className="aw-label" htmlFor="sv-acc">A/C No <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                {/* BUG FIX 21: was a plain text box — you had to already know the exact
                                    account number by heart, no way to browse or search. Now an
                                    AutoComplete: type to filter by account no or member no, pick from
                                    the list, or still just type the full number directly like before. */}
                                <div className="aw-input-wrap has-action">
                                    <AutoComplete
                                        value={formData.accountNo}
                                        options={sbAccounts.map(a => ({
                                            value: a.accountNo,
                                            label: `${a.accountNo} — Member ${a.memberNo} — ₹${a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                                        }))}
                                        filterOption={(input, option) =>
                                            (option?.value as string ?? '').toLowerCase().includes(input.toLowerCase()) ||
                                            (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        onChange={value => {
                                            updateField('accountNo', value);
                                            if (value.length >= 3) handleAccountNoChange(value);
                                        }}
                                        onSelect={value => handleAccountNoChange(String(value))}
                                        className="aw-select"
                                        popupClassName="aw-select-popup"
                                        popupMatchSelectWidth={360}
                                    >
                                        <input id="sv-acc" placeholder="Enter or pick an account number..." style={{ fontFamily: 'monospace', fontWeight: 700 }} />
                                    </AutoComplete>
                                    {isLoadingAccount && <span className="aw-input-action" aria-hidden><span className="aw-spin" /></span>}
                                </div>
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="sv-date">Trans Date</label>
                                <DatePicker id="sv-date" value={formData.transDate ? dayjs(formData.transDate) : null}
                                    onChange={d => updateField('transDate', d)}
                                    className="aw-picker" popupClassName="aw-select-popup" format="DD-MMM-YY" />
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><IndianRupee size={14} /></span>
                            <h2 className="aw-card-title">Account Balances</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--aw-gap)' }}>
                            {[
                                { label: 'Current Balance', val: formData.currentBalance, tone: '' },
                                { label: 'Minimum Balance', val: formData.minimumBalance, tone: '' },
                                { label: 'Unpass Cr.', val: formData.unpassCr, tone: 'var(--aw-success)' },
                                { label: 'Unpass Dr.', val: formData.unpassDr, tone: 'var(--aw-danger)' },
                                { label: 'Available Bal', val: formData.availableBalance, tone: 'var(--aw-accent)' },
                                { label: 'Withdrawable', val: formData.withdrawableBalance, tone: 'var(--aw-accent)' },
                            ].map(item => (
                                <div key={item.label} className="aw-panel" style={{ textAlign: 'center', padding: '10px 8px' }}>
                                    <span className="aw-label" style={{ marginBottom: 4 }}>{item.label}</span>
                                    <p className="aw-strong" style={item.tone ? { color: item.tone } : undefined}>₹{item.val.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">Transaction</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--aw-gap)' }}>
                            <div>
                                <label className="aw-label" htmlFor="sv-type">Transaction Type</label>
                                <Select id="sv-type" value={formData.transactionType} onChange={v => updateField('transactionType', v)}
                                    className="aw-select" popupClassName="aw-select-popup"
                                    options={[
                                        { value: 'deposit', label: 'Deposit (Receipt)' },
                                        { value: 'withdrawal', label: 'Withdrawal (Payment)' },
                                    ]} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="sv-amt">Amount (₹) <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <input id="sv-amt" type="number" value={formData.amount} onChange={e => updateField('amount', e.target.value)}
                                    placeholder="0.00" className="aw-input is-right"
                                    style={{ fontWeight: 700, color: isDeposit ? 'var(--aw-success)' : 'var(--aw-danger)' }} />
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Banknote size={14} /></span>
                            <h2 className="aw-card-title">Mode of Payment</h2>
                            <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8, flexWrap: 'wrap' }}>
                                <span className="aw-pill">Actual Amt ₹{formData.actualAmount.toFixed(2)}</span>
                                <span className={`aw-pill ${formData.bankBal < 0 ? 'tone-danger' : ''}`}>{formData.paymentMode === 'bank' ? 'Bank Bal' : 'Cash Bal'} ₹{fmt(formData.bankBal)}</span>
                            </span>
                        </div>
                        <div className="aw-seg" role="tablist" style={{ maxWidth: 240, ['--seg-index' as any]: formData.paymentMode === 'bank' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                            {['cash', 'bank'].map(mode => (
                                <button key={mode} type="button" role="tab" aria-selected={formData.paymentMode === mode} onClick={() => updateField('paymentMode', mode)}>
                                    {mode.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {formData.paymentMode === 'bank' && (
                            <div className="aw-panel aw-fade-in">
                                <span className="aw-label">Cheque Details</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--aw-gap)' }}>
                                    <div>
                                        <label className="aw-label" htmlFor="sv-bank">Bank A/C</label>
                                        <Select id="sv-bank" value={(formData.bankCode || undefined) as string} onChange={v => updateField('bankCode', v)}
                                            className="aw-select" popupClassName="aw-select-popup" placeholder="Select bank..."
                                            showSearch optionFilterProp="label"
                                            options={bankAccounts.map(b => ({ value: b.code, label: `${b.code} — ${b.name}` }))} />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="sv-cdate">Cheque Date</label>
                                        <DatePicker id="sv-cdate" value={formData.chequeDate ? dayjs(formData.chequeDate) : null}
                                            onChange={d => updateField('chequeDate', d)}
                                            className="aw-picker" popupClassName="aw-select-popup" format="DD-MMM-YY" />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="sv-cno">Cheque No</label>
                                        <input id="sv-cno" value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)} placeholder="Cheque No..." className="aw-input" />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="sv-dbank">Drawee Bank</label>
                                        <input id="sv-dbank" value={formData.bankName} onChange={e => updateField('bankName', e.target.value)} placeholder="Bank name..." className="aw-input" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">Transaction History</h2>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: '30vh' }}>
                            <table className="aw-table">
                                <thead>
                                    <tr>
                                        <th>Trans Date</th>
                                        <th>Voucher No</th>
                                        <th>Acc Type</th>
                                        <th>Trans Type</th>
                                        <th className="is-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingAccount && transactionHistory.length === 0 ? (
                                        <tr><td colSpan={5}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-spin" /></div></td></tr>
                                    ) : transactionHistory.length === 0 ? (
                                        <tr><td colSpan={5}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">Enter A/C No to view history</span></div></td></tr>
                                    ) : transactionHistory.map((r: TransactionHistoryRow, i: number) => (
                                        <tr key={`${r.voucherNo}-${i}`}>
                                            <td style={{ fontFamily: 'monospace' }}>{r.transDate}</td>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.voucherNo}</td>
                                            <td className="is-muted" style={{ fontFamily: 'monospace' }}>{r.accType}</td>
                                            <td className={r.transType === 'CR' ? 'is-success' : 'is-danger'} style={{ fontWeight: 700 }}>{r.transType}</td>
                                            <td className="is-right">₹{r.amount.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {(formData.modeOfOperation || formData.operators) && (
                        <section className="aw-card">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><Building2 size={14} /></span>
                                <h2 className="aw-card-title">Account Operations</h2>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--aw-gap)' }}>
                                <div>
                                    <span className="aw-label">Mode of Operation</span>
                                    <p className="aw-strong">{formData.modeOfOperation || '—'}</p>
                                </div>
                                <div>
                                    <span className="aw-label">Operators</span>
                                    <p className="aw-strong">{formData.operators || '—'}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="aw-card">
                        <label className="aw-label" htmlFor="sv-narr">Narration <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                        <textarea id="sv-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                            placeholder="Enter narration…" rows={2}
                            className="aw-input" style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Saving Voucher{formData.accountNo && <> · <strong style={{ color: 'var(--aw-accent)' }}>A/C: {formData.accountNo}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>
        </div>
    );
};

export default SavingTransactionForm;
