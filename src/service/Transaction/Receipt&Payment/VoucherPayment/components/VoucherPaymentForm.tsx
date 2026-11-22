// components/VoucherPaymentForm.tsx
// Voucher Payment: the cashier picks a payment voucher from the drop-down, chooses cash or bank and saves it.
// Sign (as in the legacy window) only shows the member's signature for checking.

import React from 'react';
import { Select, DatePicker } from 'antd';
import AwDialog from '@/components/shared/kit/AwDialog';
import { PenLine, Save, RotateCcw, X, FileText, Banknote, User, Trash2, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import type { VoucherPaymentHookReturn } from '../interface/VoucherPaymentInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';

const VoucherPaymentForm: React.FC<VoucherPaymentHookReturn> = ({
    vouchers, isLoadingList, selectedNo, detail, isLoadingDetail, signature, signatureOpen, form, bankAccounts, accountBalance, isSigning,
    updateForm, selectVoucher, handleSave, openSignature, closeSignature, handleDelete, handleRefresh, handleClear, handleExit,
}) => {
    const { t } = useTranslation();
    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const canSave = !!detail && !isSigning && !isLoadingDetail;

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isSigning ? 'Saving…' : 'Save',
        saveEnabled: canSave,
    });

    return (
        <div className="app-window aw-calm aw-voucher">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Voucher Payment')}</h1>
                    <p className="aw-desc">{detail ? `${detail.voucherNo}${detail.isGeneral ? '' : ` · ${detail.memberName}`}` : t('Pick a voucher, choose cash or bank and save it')}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> {t('Clear')}</button>
                    <button type="button" onClick={openSignature} disabled={!detail} className="aw-btn aw-btn-secondary"
                        data-tip={t("Show the member's signature")} data-tip-pos="bottom">
                        <PenLine size={13} /> {t('Sign')}
                    </button>
                    <button type="button" onClick={handleSave} disabled={!canSave} className="aw-btn aw-btn-primary">
                        {isSigning ? <RotateCcw size={13} className="aw-spin" /> : <Save size={13} />}
                        {isSigning ? t('Saving…') : t('Save')}
                    </button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Exit')}</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">{t('Voucher')}</h2>
                            <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8 }}>
                                <span className="aw-pill">{t('{{1}} waiting', { 1: vouchers.length })}</span>
                                <button type="button" onClick={handleRefresh} className="aw-icon-btn is-sm" aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="left">
                                    <RefreshCw size={13} className={isLoadingList ? 'aw-spin' : ''} />
                                </button>
                            </span>
                        </div>
                        <div className="aw-split-fields" style={{ gridTemplateColumns: 'minmax(260px, 420px) 1fr', alignItems: 'end' }}>
                            <div>
                                <label className="aw-label" htmlFor="vp-no">{t('Voucher No')}</label>
                                <Select
                                    id="vp-no"
                                    showSearch
                                    allowClear
                                    value={selectedNo || undefined}
                                    onChange={(v) => selectVoucher(v ?? '')}
                                    loading={isLoadingList}
                                    placeholder={vouchers.length === 0 ? t('No vouchers waiting') : t('Select a voucher…')}
                                    optionFilterProp="label"
                                    className="aw-select"
                                    popupClassName="aw-select-popup"
                                    listHeight={360}
                                    options={vouchers.map(v => ({
                                        value: v.voucherNo,
                                        label: `${v.voucherNo} — ${Number(v.memberNo) ? v.memberName : t('General')} — ₹${fmt(v.total)}`,
                                    }))}
                                />
                            </div>
                            <div className="aw-inline" style={{ gap: 8, flexWrap: 'wrap', minHeight: 'var(--aw-control-h)', alignItems: 'center' }}>
                                {detail && <span className="aw-pill">{t('Date')} {dayjs(detail.voucherDate).format('DD-MMM-YY')}</span>}
                                {detail && <span className="aw-pill tone-info">{detail.isGeneral ? t('General Payment') : t('Payment')}</span>}
                            </div>
                        </div>
                    </section>

                    {!detail && (
                        <section className="aw-card">
                            <div className="aw-empty" style={{ padding: 24 }}>
                                <FileText size={28} />
                                <strong className="aw-strong">{isLoadingDetail ? t('Loading…') : t('No voucher selected')}</strong>
                                <span className="aw-meta">{t('Vouchers created in Voucher Creation appear in the list until they are saved here.')}</span>
                            </div>
                        </section>
                    )}

                    {detail && (
                        <>
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><User size={14} /></span>
                                    <h2 className="aw-card-title">{t('Member')}</h2>
                                </div>
                                {detail.isGeneral ? (
                                    <p className="aw-meta">{t('General payment: not for a member.')}</p>
                                ) : (
                                    <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                                        <div><dt>{t('Member No.')}</dt><dd style={{ fontFamily: 'monospace' }}>{detail.memberNo}</dd></div>
                                        <div><dt>{t('Name')}</dt><dd>{detail.memberName || '—'}</dd></div>
                                        <div><dt>{t('Office')}</dt><dd>{detail.officeNo || '—'}</dd></div>
                                    </dl>
                                )}
                            </section>

                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><Banknote size={14} /></span>
                                    <h2 className="aw-card-title">{t('Mode of payment')}</h2>
                                    <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8, flexWrap: 'wrap' }}>
                                        <span className="aw-pill">{t('Actual Amt ₹{{1}}', { 1: fmt(detail.total) })}</span>
                                        <span className={`aw-pill ${accountBalance < detail.total ? 'tone-danger' : ''}`}>{form.modeOfPay === 'bank' ? t('Bank Bal') : t('Cash Bal')} ₹{fmt(accountBalance)}</span>
                                    </span>
                                </div>
                                <div className="aw-seg" role="tablist" style={{ maxWidth: 240, ['--seg-index' as any]: form.modeOfPay === 'bank' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                                    {(['cash', 'bank'] as const).map(mode => (
                                        <button key={mode} type="button" role="tab" aria-selected={form.modeOfPay === mode} onClick={() => updateForm('modeOfPay', mode)}>
                                            {mode.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                {form.modeOfPay === 'bank' && (
                                    <div className="aw-panel aw-fade-in" style={{ marginTop: 'var(--aw-gap)' }}>
                                        <span className="aw-label">{t('Cheque Details')}</span>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--aw-gap)' }}>
                                            <div>
                                                <label className="aw-label" htmlFor="vp-from">{t('Pay From A/C')} <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                                <Select id="vp-from" value={form.bankCode || undefined} onChange={(val?: string) => updateForm('bankCode', val ?? '')}
                                                    placeholder={t('Select bank account…')} showSearch optionFilterProp="label" className="aw-select" popupClassName="aw-select-popup"
                                                    options={bankAccounts.map(a => ({ value: a.code, label: `${a.code} - ${a.name}` }))} />
                                            </div>
                                            <div>
                                                <label className="aw-label" htmlFor="vp-cdate">{t('Cheque Date')}</label>
                                                <DatePicker id="vp-cdate" value={form.chequeDate ? dayjs(form.chequeDate) : null}
                                                    onChange={d => updateForm('chequeDate', d ? d.format('YYYY-MM-DD') : '')}
                                                    format="DD-MMM-YY" allowClear={false} className="aw-picker" popupClassName="aw-select-popup" />
                                            </div>
                                            <div>
                                                <label className="aw-label" htmlFor="vp-cno">{t('Cheque No')} <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                                <input id="vp-cno" value={form.chequeNo} onChange={e => updateForm('chequeNo', e.target.value)} placeholder={t('Cheque No...')} className="aw-input" />
                                            </div>
                                            <div>
                                                <label className="aw-label" htmlFor="vp-bank">{t("Customer's Bank Name")}</label>
                                                <input id="vp-bank" value={form.bankName} maxLength={50} onChange={e => updateForm('bankName', e.target.value)} placeholder={t('Bank name...')} className="aw-input" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><FileText size={14} /></span>
                                    <h2 className="aw-card-title">{t('Transaction breakdown')}</h2>
                                    <span className="aw-meta" style={{ marginLeft: 'auto' }}>{t('{{1}} row(s)', { 1: detail.rows.length })}</span>
                                </div>
                                <div className="aw-table-wrap" style={{ maxHeight: '34vh' }}>
                                    <table className="aw-table">
                                        <thead>
                                            <tr><th style={{ width: 120 }}>{t('Code')}</th><th>{t('Name')}</th><th className="is-right" style={{ width: 160 }}>{t('Amount')}</th><th style={{ width: 120 }}>{t('RD Sr.No')}</th></tr>
                                        </thead>
                                        <tbody>
                                            {detail.rows.map((r, i) => (
                                                <tr key={`${r.code}-${i}`}>
                                                    <td style={{ fontFamily: 'monospace' }}>{r.code}</td>
                                                    <td>{r.name}</td>
                                                    <td className="is-right">{fmt(r.amount)}</td>
                                                    <td className="is-muted">{r.rdSrNo || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr><td colSpan={2} className="aw-strong">{t('Total')}</td><td className="is-right aw-strong">{fmt(detail.total)}</td><td /></tr>
                                        </tfoot>
                                    </table>
                                </div>
                                {detail.narration && (
                                    <p className="aw-meta" style={{ marginTop: 8 }}><strong>{t('Narration')}:</strong> {detail.narration}</p>
                                )}
                                <div className="aw-btn-row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                                    <button type="button" onClick={handleDelete} className="aw-btn aw-btn-danger aw-btn-sm" style={{ flex: 'none' }}><Trash2 size={12} /> {t('Delete voucher')}</button>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>

            <div className="aw-footer">
                <span>{t('Voucher Payment')}{detail && <> · <strong style={{ color: 'var(--aw-accent)' }}>{detail.voucherNo}</strong></>}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>

            {/* Sign (legacy): only shows the member's signature, for the cashier to check */}
            <AwDialog open={signatureOpen} title={t('Member signature')} icon={<PenLine size={14} />} onClose={closeSignature} maxWidth="34rem" compact>
                {detail && (
                    <div className="aw-stack">
                        <p className="aw-meta">{detail.isGeneral ? t('General payment') : `${detail.memberNo} · ${detail.memberName}`}</p>
                        {signature.state === 'ready' ? (
                            <img src={signature.url} alt={t('Member signature')}
                                style={{ width: '100%', maxHeight: 260, objectFit: 'contain', background: '#fff', borderRadius: 6, border: '1px solid var(--aw-border)', padding: 8 }} />
                        ) : (
                            <div className="aw-empty" style={{ padding: 24 }}>
                                <span className="aw-meta">
                                    {signature.state === 'loading' ? t('Loading…') : t('No signature available for display')}
                                </span>
                            </div>
                        )}
                        <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="aw-btn aw-btn-secondary" style={{ flex: 'none' }} onClick={closeSignature}>{t('Close')}</button>
                        </div>
                    </div>
                )}
            </AwDialog>
        </div>
    );
};

export default VoucherPaymentForm;
