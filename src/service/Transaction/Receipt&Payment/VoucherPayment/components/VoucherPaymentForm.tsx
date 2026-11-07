// components/VoucherPaymentForm.tsx

import React, { useState, useEffect } from 'react';
import { Select, DatePicker } from 'antd';
import { Save, RotateCcw, X, Hash, Search, Plus, Trash2, FileText, Banknote } from 'lucide-react';
import dayjs from 'dayjs';
import { VoucherPaymentHookReturn, ReceiptRow } from '../interface/VoucherPaymentInterfaces';
import MemberLookupDialog from '@/components/shared/kit/MemberLookupDialog';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';

interface HeadCode { code: string; name: string; }

const VoucherPaymentForm: React.FC<VoucherPaymentHookReturn> = ({
    formData, totalAmount, bankAccounts, accountBalance, lastSaved,
    updateField, handleMemberSelect,
    addRow, updateRow, removeRow,
    handleSave, handleClear, handleExit,
    isLoading,
}) => {
  const { t } = useTranslation();
    const [showLookup, setShowLookup] = useState(false);
    const [headCodes, setHeadCodes] = useState<HeadCode[]>([]);
    const [loadingHeads, setLoadingHeads] = useState(false);

    useEffect(() => {
        const fetchHeadCodes = async () => {
            setLoadingHeads(true);
            try {
                const response = await apiService.getHeadList();
                if (response.success && response.data) setHeadCodes(response.data);
            } catch (error) {
                console.error('Failed to fetch head codes:', error);
            } finally {
                setLoadingHeads(false);
            }
        };
        fetchHeadCodes();
    }, []);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || member.mbno || '');
        const memberName = member.memberName || member.fullname || '';
        const officeNo = member.officeNo?.toString() || '';
        handleMemberSelect(memberNo, { memberNo, memberName, officeNo });
    };

    const paymentTypeButtons = [
        { value: 'payment', label: t('Payment') },
        { value: 'general', label: t('General Payment') },
    ];

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !isLoading,
    });

    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Voucher Payment')}</h1>
                    <p className="aw-desc">{t('Ledger Entry (D)')}{formData.memberName ? ` · ${formData.memberName}` : ''}</p>
                </div>
                <div className="aw-actions">
                    <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: formData.paymentType === 'general' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                        {paymentTypeButtons.map(btn => (
                            <button key={btn.value} type="button" role="tab" aria-selected={formData.paymentType === btn.value} onClick={() => updateField('paymentType', btn.value)}>
                                {btn.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> {t('Clear')}</button>
                    <button type="button" onClick={handleSave} disabled={isLoading} className="aw-btn aw-btn-primary">
                        {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isLoading ? t('Saving…') : t('Save')}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Exit')}</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    {lastSaved && (
                        <div className="aw-alert aw-alert-success aw-fade-in" style={{ alignItems: 'center' }} role="status">
                            <span style={{ flex: 1 }}>
                                {t('Saved — Voucher')} <strong>{lastSaved.voucherNo}</strong>  | 
                                {t('Member')} <strong>{lastSaved.memberNo}</strong>  | 
                                {t('Amount')} <strong>₹{fmt(lastSaved.total)}</strong>
                            </span>
                            <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary aw-btn-sm"><RotateCcw size={11} /> {t('New')}</button>
                        </div>
                    )}

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Hash size={14} /></span>
                            <h2 className="aw-card-title">{t('Voucher & Member')}</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'start' }}>
                            <div>
                                <label className="aw-label" htmlFor="vp-no">{t('Voucher No')}</label>
                                <input id="vp-no" value={formData.voucherNo} onChange={e => updateField('voucherNo', e.target.value)} placeholder={t('Auto...')} className="aw-input" style={{ fontFamily: 'monospace', fontWeight: 700 }} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="vp-date">{t('Trans Date')}</label>
                                <DatePicker id="vp-date" value={formData.transDate ? dayjs(formData.transDate) : null}
                                    onChange={d => updateField('transDate', d ? d.format('YYYY-MM-DD') : '')}
                                    format="DD-MMM-YY" allowClear={false} className="aw-picker" popupClassName="aw-select-popup" />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="vp-member">{t('Member No')} {formData.paymentType !== 'general' && <span style={{ color: 'var(--aw-danger)' }}>*</span>}</label>
                                <div className="aw-input-wrap has-action">
                                    <input id="vp-member" value={formData.memberNo} onChange={e => updateField('memberNo', e.target.value)}
                                        onKeyDown={e => { if (e.key === 'PageUp') { e.preventDefault(); setShowLookup(true); } }}
                                        placeholder={t('Member no…')} className="aw-input" style={{ fontFamily: 'monospace' }} />
                                    <button type="button" className="aw-input-action" onClick={() => setShowLookup(true)} aria-label={t('Member lookup')} data-tip={t('Member lookup')} data-tip-pos="top-end">
                                        <Search size={13} />
                                    </button>
                                </div>
                                {formData.memberName && <p className="aw-strong aw-fade-in" style={{ marginTop: 4, color: 'var(--aw-accent)' }}>{formData.memberName}</p>}
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="vp-sub">{t('Sub Division')} <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                <input id="vp-sub" value={formData.subDivision} onChange={e => updateField('subDivision', e.target.value)} placeholder={t('Office...')} className="aw-input" />
                            </div>
                        </div>
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Banknote size={14} /></span>
                            <h2 className="aw-card-title">{t('Mode of Payment')}</h2>
                            <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8, flexWrap: 'wrap' }}>
                                <span className="aw-pill">{t('Actual Amt ₹{{1}}', { 1: fmt(totalAmount) })}</span>
                                <span className={`aw-pill ${accountBalance < 0 ? 'tone-danger' : ''}`}>{formData.modeOfPay === 'bank' ? t('Bank Bal') : t('Cash Bal')} ₹{fmt(accountBalance)}</span>
                            </span>
                        </div>
                        <div className="aw-seg" role="tablist" style={{ maxWidth: 240, ['--seg-index' as any]: formData.modeOfPay === 'bank' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                            {['cash', 'bank'].map(mode => (
                                <button key={mode} type="button" role="tab" aria-selected={formData.modeOfPay === mode} onClick={() => updateField('modeOfPay', mode)}>
                                    {mode.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {formData.modeOfPay === 'bank' && (
                            <div className="aw-panel aw-fade-in">
                                <span className="aw-label">{t('Cheque Details')}</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--aw-gap)' }}>
                                    <div>
                                        <label className="aw-label" htmlFor="vp-into">{t('Receive Into A/C')}</label>
                                        <Select id="vp-into" value={formData.receiveIntoCode || 'A1001'} onChange={val => updateField('receiveIntoCode', val)}
                                            showSearch optionFilterProp="label" className="aw-select" popupClassName="aw-select-popup"
                                            options={bankAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name}` }))} />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="vp-cdate">{t('Cheque Date')}</label>
                                        <DatePicker id="vp-cdate" value={formData.chequeDate ? dayjs(formData.chequeDate) : null}
                                            onChange={d => updateField('chequeDate', d ? d.format('YYYY-MM-DD') : '')}
                                            format="DD-MMM-YY" allowClear={false} className="aw-picker" popupClassName="aw-select-popup" />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="vp-cno">{t('Cheque No')}</label>
                                        <input id="vp-cno" value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)} placeholder={t('Cheque No...')} className="aw-input" />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="vp-bank">{t('Drawee Bank')}</label>
                                        <input id="vp-bank" value={formData.bankName} onChange={e => updateField('bankName', e.target.value)} placeholder={t('Bank name...')} className="aw-input" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">{t('Transaction Breakdown')}</h2>
                            <button type="button" onClick={addRow} className="aw-btn aw-btn-secondary aw-btn-sm" style={{ marginLeft: 'auto' }}><Plus size={12} /> {t('Add Row')}</button>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: '38vh' }}>
                            <table className="aw-table" style={{ minWidth: 640 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 260 }}>{t('Code')}</th>
                                        <th>{t('Name / Description')}</th>
                                        <th className="is-right" style={{ width: 170 }}>{t('Amount')}</th>
                                        <th style={{ width: 44 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.rows.length === 0 ? (
                                        <tr><td colSpan={4}><div className="aw-empty" style={{ padding: 24 }}><span className="aw-meta">{t('Add rows using the button above')}</span></div></td></tr>
                                    ) : formData.rows.map((record: ReceiptRow) => (
                                        <tr key={record.id}>
                                            <td className="has-input">
                                                <Select
                                                    value={record.code || undefined}
                                                    onChange={(value?: string) => {
                                                        updateRow(record.id, 'code', value ?? '');
                                                        const head = headCodes.find(h => h.code === value);
                                                        if (head) updateRow(record.id, 'description', head.name);
                                                        // acc_type is derived authoritatively on the backend from ledger history.
                                                    }}
                                                    placeholder={t('Select...')}
                                                    showSearch
                                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                    loading={loadingHeads}
                                                    className="aw-select" popupClassName="aw-select-popup"
                                                    options={headCodes.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))}
                                                />
                                            </td>
                                            <td className="has-input"><input aria-label={t('Description')} value={record.description} onChange={e => updateRow(record.id, 'description', e.target.value)} placeholder={t('Description...')} className="aw-input" /></td>
                                            <td className="has-input"><input type="number" aria-label={t('Amount')} value={record.amount} onChange={e => updateRow(record.id, 'amount', e.target.value)} placeholder="0.00" className="aw-input is-right" /></td>
                                            <td className="is-center">
                                                <button type="button" onClick={() => removeRow(record.id)} className="aw-icon-btn is-sm is-danger" aria-label={t('Remove row')} data-tip={t('Remove row')} data-tip-pos="left">
                                                    <Trash2 size={14} />
                                                </button>
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
                <span>{t('Voucher Payment')}{formData.memberName && <> · <strong style={{ color: 'var(--aw-accent)' }}>{formData.memberName}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>

            <MemberLookupDialog open={showLookup} onClose={() => setShowLookup(false)} onSelect={onMemberSelected} />
        </div>
    );
};

export default VoucherPaymentForm;
