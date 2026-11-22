// components/PaymentVoucherForm.tsx

import React, { useState, useEffect } from 'react';
import { Select } from 'antd';
import { RotateCcw, Save, X, Search, Plus, Trash2, FileText, User } from 'lucide-react';
import dayjs from 'dayjs';
import { PaymentVoucherHookReturn, RowData } from '../interface/PaymentVoucherInterfaces';
import MemberLookupDialog from '@/components/shared/kit/MemberLookupDialog';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';

interface HeadCode { code: string; name: string; }

const PaymentVoucherForm: React.FC<PaymentVoucherHookReturn> = ({
    formData, rows, totalAmount,
    updateField, handleMemberSelect,
    addRow, updateRow, removeRow,
    handleSave, handleClear, handleExit,
    isLoading, lastSaved,
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

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !isLoading,
    });

    return (
        <div className="app-window aw-calm aw-voucher">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Voucher Creation')}</h1>
                    <p className="aw-desc">{t('Payment voucher · completed in Voucher Payment')}{formData.memberName ? ` · ${formData.memberName}` : ''}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary">
                        <RotateCcw size={13} /> {t('Clear')}
                    </button>
                    <button type="button" onClick={handleSave} disabled={isLoading} className="aw-btn aw-btn-primary">
                        {isLoading ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isLoading ? t('Saving…') : t('Save')}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost">
                        <X size={13} /> {t('Exit')}
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">

                    {/* Saved success banner */}
                    {lastSaved && (
                        <div className="aw-alert aw-alert-success aw-fade-in" style={{ marginBottom: 0, alignItems: 'center' }} role="status">
                            <span style={{ flex: 1 }}>
                                {t('Saved — Voucher')} <strong>{lastSaved.voucherNo}</strong>  | 
                                {t('Member')} <strong>{lastSaved.memberNo}</strong>  | 
                                {t('Amount')} <strong>₹{lastSaved.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            </span>
                            <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary aw-btn-sm"><RotateCcw size={11} /> {t('New')}</button>
                        </div>
                    )}

                    {/* Voucher details */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">{t('Voucher')}</h2>
                        </div>
                        <div className="aw-split-fields" style={{ gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 1fr) minmax(280px, 340px)', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="pvc-no">{t('Voucher No.')}</label>
                                <input id="pvc-no" value={formData.voucherNo} onChange={e => updateField('voucherNo', e.target.value)} placeholder={t('Auto...')} className="aw-input" style={{ fontFamily: 'monospace', fontWeight: 600 }} />
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="pvc-date">{t('Voucher Date')}</label>
                                {/* the voucher is dated on the Day-End working date; it can not be changed here */}
                                <input id="pvc-date" readOnly disabled value={formData.transDate ? dayjs(formData.transDate).format('DD-MMM-YYYY') : ''}
                                    title={t('The voucher is dated by the Date setting of this window (Day End > Date settings)')} className="aw-input" style={{ fontWeight: 600 }} />
                            </div>
                            <div>
                                <span className="aw-label">{t('Payment Type')}</span>
                                <div className="aw-seg" role="tablist" style={{ width: '100%', ['--seg-index' as any]: formData.paymentType === 'general' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                                    {[
                                        { value: 'payment', label: t('Payment') },
                                        { value: 'general', label: t('General Payment') },
                                    ].map(opt => (
                                        <button key={opt.value} type="button" role="tab" aria-selected={formData.paymentType === opt.value} onClick={() => updateField('paymentType', opt.value)}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Member */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><User size={14} /></span>
                            <h2 className="aw-card-title">{t('Member')}</h2>
                        </div>
                        <div className="aw-split-fields" style={{ gridTemplateColumns: 'minmax(240px, 1.2fr) minmax(140px, 0.5fr) minmax(0, 1.4fr)' }}>
                            <div>
                                <label className="aw-label" htmlFor="pvc-member">{t('Member No.')} {formData.paymentType !== 'general' && <span style={{ color: 'var(--aw-danger)' }}>*</span>}</label>
                                <div className="aw-input-wrap has-action">
                                    <input id="pvc-member" value={formData.memberNo} onChange={e => updateField('memberNo', e.target.value)} disabled={formData.paymentType === 'general'} placeholder={formData.paymentType === 'general' ? '0' : t('Member no… (PgUp for list)')}
                                        onKeyDown={e => { if (e.key === 'PageUp' && formData.paymentType !== 'general') { e.preventDefault(); setShowLookup(true); } }}
                                        className="aw-input" style={{ fontFamily: 'monospace', fontWeight: 600 }} />
                                    <button type="button" className="aw-input-action" disabled={formData.paymentType === 'general'} onClick={() => formData.paymentType !== 'general' && setShowLookup(true)} aria-label={t('Member lookup')} data-tip={t('Member lookup')} data-tip-pos="top-end">
                                        <Search size={13} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="aw-label" htmlFor="pvc-office">{t('Office No')}</label>
                                <input id="pvc-office" value={formData.officeNo} onChange={e => updateField('officeNo', e.target.value)} disabled={formData.paymentType === 'general'} className="aw-input" />
                            </div>
                            <div style={{ alignSelf: 'end', minHeight: 'var(--aw-control-h)', display: 'flex', alignItems: 'center' }}>
                                {formData.memberName && formData.paymentType !== 'general'
                                    ? <p className="aw-strong aw-fade-in" style={{ color: 'var(--aw-accent)', margin: 0 }}>{formData.memberName}</p>
                                    : <p className="aw-meta" style={{ margin: 0 }}>{formData.paymentType === 'general' ? t('General payment: no member') : t('Pick the member to see the name')}</p>}
                            </div>
                        </div>
                    </section>

                    {/* Transaction rows */}
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Plus size={14} /></span>
                            <h2 className="aw-card-title">{t('Transactions')}</h2>
                            <span className="aw-inline" style={{ marginLeft: 'auto', gap: 12 }}>
                                <span className="aw-pill">{t('Total Amount')} {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                <button type="button" onClick={addRow} className="aw-btn aw-btn-secondary aw-btn-sm"><Plus size={12} /> {t('Add Row')}</button>
                            </span>
                        </div>
                        <div className="aw-table-wrap" style={{ maxHeight: '38vh' }}>
                            <table className="aw-table" style={{ minWidth: 720 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 260 }}>{t('Code')}</th>
                                        <th>{t('Name')}</th>
                                        <th className="is-right" style={{ width: 160 }}>{t('Amount')}</th>
                                        <th style={{ width: 150 }}>{t('RD Sr.No')}</th>
                                        <th style={{ width: 44 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr><td colSpan={5}><div className="aw-empty"><span className="aw-meta">{t('No rows — click Add Row')}</span></div></td></tr>
                                    ) : rows.map((record: RowData) => (
                                        <tr key={record.id}>
                                            <td className="has-input">
                                                <Select
                                                    value={record.code || undefined}
                                                    onChange={(value?: string) => {
                                                        updateRow(record.id, 'code', value ?? '');
                                                        const head = headCodes.find(h => h.code === value);
                                                        if (head) updateRow(record.id, 'name', head.name);
                                                    }}
                                                    placeholder={t('Select...')}
                                                    showSearch
                                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                    loading={loadingHeads}
                                                    className="aw-select" popupClassName="aw-select-popup"
                                                    options={headCodes.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))}
                                                />
                                            </td>
                                            <td className="has-input"><input aria-label={t('Name')} value={record.name} onChange={e => updateRow(record.id, 'name', e.target.value)} placeholder={t('Description...')} className="aw-input" /></td>
                                            <td className="has-input"><input type="number" aria-label={t('Amount')} value={record.amount} onChange={e => updateRow(record.id, 'amount', e.target.value)} placeholder="0.00" className="aw-input is-right" /></td>
                                            <td className="has-input"><input aria-label={t('RD Sr.No')} value={record.rdSrNo} onChange={e => updateRow(record.id, 'rdSrNo', e.target.value)} placeholder={t('RD ref...')} className="aw-input" /></td>
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

                    {/* Narration */}
                    <section className="aw-card">
                        <label className="aw-label" htmlFor="pvc-narr">{t('Narration')}</label>
                        <textarea id="pvc-narr" value={formData.narration} onChange={e => updateField('narration', e.target.value)} rows={2} maxLength={100}
                            className="aw-input" style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>{t('Payment Voucher')}{formData.memberName && <> · <strong style={{ color: 'var(--aw-accent)' }}>{formData.memberName}</strong></>}</span>
                <span>{dayjs(formData.transDate).format('DD-MMM-YYYY')}</span>
            </div>

            <MemberLookupDialog open={showLookup} onClose={() => setShowLookup(false)} onSelect={onMemberSelected} />
        </div>
    );
};

export default PaymentVoucherForm;
