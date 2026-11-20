import React from 'react';
import { Select } from 'antd';
import { LayoutGrid, RotateCcw, Save, X, ArrowRightLeft, IndianRupee, FileText } from 'lucide-react';
import { CompulsoryDepositHookReturn } from '../interface/CompulsoryDepositInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

/**
 * ES-514: an amount typed into a box. Digits and one decimal point only, at most 2 decimals and 9 whole digits
 * (up to 99 crore), so words, minus signs and 11-digit numbers cannot be entered.
 */
const cleanAmount = (raw: string): string => {
    let s = raw.replace(/[^0-9.]/g, '');
    const dot = s.indexOf('.');
    if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
    const [whole, frac] = s.split('.');
    const w = (whole ?? '').slice(0, 9);
    return frac !== undefined ? `${w}.${frac.slice(0, 2)}` : w;
};

interface MemberRowProps {
    memberNo: number;
    memberName: string;
    currentBalance: number;
    postAmount: string | number;
    onChange: (memberNo: number, amount: string) => void;
}

/**
 * ES-514: one grid row. Memoised, so typing in one member's box redraws only that row - not all ~7,500 (before, each
 * keystroke redrew every row and took over a second).
 */
const MemberRow = React.memo(({ memberNo, memberName, currentBalance, postAmount, onChange }: MemberRowProps) => {
    // translated here, not in the parent: the parent would otherwise run it for every row on every keystroke
    const { t } = useTranslation();
    const ariaLabel = t('Post amount for member {{1}}', { 1: memberNo });
    return (
    <tr>
        <td className="is-accent" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{memberNo}</td>
        <td title={memberName}>{memberName}</td>
        <td className="is-right is-success">₹{Number(currentBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td className="has-input">
            <input aria-label={ariaLabel} value={postAmount} inputMode="decimal" maxLength={12}
                onChange={e => onChange(memberNo, cleanAmount(e.target.value))}
                placeholder="0.00" className="aw-input is-right" style={{ fontWeight: 700 }} />
        </td>
    </tr>
    );
});

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
  const { t } = useTranslation();
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
                    <h1 className="aw-title">{t('RD/CD Transaction')}</h1>
                    <p className="aw-desc">{t('Bulk CD Posting')}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={distributeEqually} disabled={isLoading || isPosting} className="aw-btn aw-btn-secondary">
                        <ArrowRightLeft size={13} /> {t('Distribute')}
                    </button>
                    <button type="button" onClick={handleReset} disabled={isPosting} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> {t('Clear')}</button>
                    <button type="button" onClick={handleSave} disabled={isPosting || isLoading} className="aw-btn aw-btn-primary">
                        {isPosting ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isPosting ? t('Posting…') : t('Post')}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Exit')}</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">{t('Deposit Configuration')}</h2>
                            <span className="aw-meta" style={{ marginLeft: 'auto' }}>{t('{{1}} member(s)', { 1: members.length })}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 0.6fr) minmax(220px, 1fr) minmax(220px, 1fr)', gap: 'var(--aw-gap)', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="cd-amount">{t('Amount (₹)')} <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <div className="aw-input-wrap has-icon">
                                    <IndianRupee size={13} />
                                    <input id="cd-amount" value={formData.amount} inputMode="decimal" maxLength={12} onChange={e => updateField('amount', cleanAmount(e.target.value))}
                                        placeholder="0.00" className="aw-input is-right" style={{ fontWeight: 700 }} />
                                </div>
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="cd-head">{t('Income Head')} <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <Select
                                    id="cd-head"
                                    value={(formData.incomeHead || undefined) as string}
                                    onChange={val => updateField('incomeHead', val)}
                                    className="aw-select" popupClassName="aw-select-popup"
                                    placeholder={t('Select GL Head...')}
                                    loading={isLoading}
                                    showSearch
                                    optionFilterProp="label"
                                    options={incomeHeads.map(head => ({ value: head.code, label: `${head.code} – ${head.name}` }))}
                                />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="cd-narr">{t('Narration')}</label>
                                <input id="cd-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                                    placeholder={t('Enter narration...')} className="aw-input" />
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><LayoutGrid size={14} /></span>
                            <h2 className="aw-card-title">{t('Member Distribution Matrix')}</h2>
                            <span className="aw-pill" style={{ marginLeft: 'auto' }}>{t('Distributed ₹{{1}}', { 1: distributedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}</span>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 180 }}>
                            <table className="aw-table" style={{ minWidth: 640 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 120 }}>MBNO</th>
                                        <th>{t('Name')}</th>
                                        <th className="is-right" style={{ width: 200 }}>{t('Current CD Balance')}</th>
                                        <th className="is-right" style={{ width: 170 }}>{t('Post Amount')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading && members.length === 0 ? (
                                        <tr><td colSpan={4}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-spin" /></div></td></tr>
                                    ) : members.length === 0 ? (
                                        <tr><td colSpan={4}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">{t('No active members found')}</span></div></td></tr>
                                    ) : members.map((m, idx) => (
                                        <MemberRow key={`${m.memberNo}-${idx}`}
                                            memberNo={m.memberNo} memberName={m.memberName} currentBalance={m.currentBalance}
                                            postAmount={m.postAmount} onChange={updateMemberAmount} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>{t('RD/CD Transaction')}{formData.amount && <> · <strong style={{ color: 'var(--aw-accent)' }}>{t('Amount: ₹{{1}}', { 1: formData.amount })}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>
        </div>
    );
};

export default CompulsoryDepositForm;
