// components/PassTransactionsTable.tsx

import React, { useState } from 'react';
import { RotateCcw, X, Search, CheckCircle2, Trash2, FileText, Download, Eye } from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';
import ReagreementDocumentActions from '@/components/shared/loan/ReagreementDocumentActions';
import { fmtMoney, fmtMonth } from '../../../../services/reagreementApi';
import { PassTransactionsHookReturn } from '../interface/PassTransactionsInterfaces';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const PassTransactionsTable: React.FC<PassTransactionsHookReturn> = ({
    transactionData,
    isLoading,
    busyVouchers,
    handleRefresh,
    handlePass,
    handleDelete,
    handleExport,
    handleExit,
    reagreementResult,
    clearReagreementResult,
}) => {
  const { t } = useTranslation();
    const [searchText, setSearchText] = useState('');
    const [detail, setDetail] = useState<any | null>(null);
    // ES-512: the lines of any voucher (what Pass will post), for the approver
    const [linesOf, setLinesOf] = useState<any | null>(null);

    const filteredData = transactionData.filter(item =>
        item.voucherNo.toLowerCase().includes(searchText.toLowerCase()) ||
        item.memberName.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.loanCaseNo || '').toLowerCase().includes(searchText.toLowerCase())
    );

    // Give each row a stable unique key and compute rowSpan per voucher group
    const dataWithKeys = filteredData.map((row, idx) => ({ ...row, _idx: idx, key: `${row.voucherNo}-${row.trNo}-${row.head}-${idx}` }));

    const voucherGroups: Record<string, { count: number; firstKey: string }> = {};
    dataWithKeys.forEach(row => {
        let group = voucherGroups[row.voucherNo];
        if (!group) {
            group = { count: 0, firstKey: row.key };
            voucherGroups[row.voucherNo] = group;
        }
        group.count++;
    });

    const pendingCount = Object.keys(voucherGroups).length;

    // One block per voucher: its header (who / how paid / actions) and its posting lines underneath
    const groups: { voucherNo: string; head: any; rows: any[] }[] = [];
    dataWithKeys.forEach((row: any) => {
        const last = groups[groups.length - 1];
        if (last && last.voucherNo === row.voucherNo) last.rows.push(row);
        else groups.push({ voucherNo: row.voucherNo, head: row, rows: [row] });
    });

    const money = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    return (
        <div className="app-window aw-calm">
            <style>{`
.pt-list { display: flex; flex-direction: column; gap: 12px; padding: 12px; max-height: calc(100vh - 280px); min-height: 200px; overflow: auto; }
.pt-voucher { border: 1px solid var(--aw-border); border-radius: 12px; background: var(--aw-surface, transparent); overflow: hidden; flex: none; }
.pt-voucher.is-reagreement { border-color: color-mix(in srgb, var(--aw-warning, #b86e00) 45%, var(--aw-border)); }
.pt-vhead { display: grid; grid-template-columns: minmax(180px, 1.1fr) minmax(160px, 1.2fr) minmax(170px, 1.2fr) auto auto; align-items: center; gap: 16px; padding: 12px 16px; background: color-mix(in srgb, var(--aw-text) 3%, transparent); border-bottom: 1px solid var(--aw-border); }
.pt-id { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pt-vno { font-family: monospace; font-weight: 600; font-size: var(--type-body-size); color: var(--aw-accent); }
.pt-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pt-chip { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 10px; font-size: var(--type-supporting-size); border: 1px solid var(--aw-border); color: var(--aw-muted); }
.pt-chip.is-ok { color: var(--aw-success); border-color: color-mix(in srgb, var(--aw-success) 40%, transparent); }
.pt-chip.is-wait { color: var(--aw-warning); border-color: color-mix(in srgb, var(--aw-warning) 40%, transparent); }
.pt-who { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pt-who strong { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-who span, .pt-cheque { font-size: var(--type-supporting-size); color: var(--aw-muted); }
.pt-cheque { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pt-cheque span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-cheque b { color: var(--aw-text); font-weight: 600; font-family: monospace; }
.pt-total { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.pt-total span { font-size: var(--type-supporting-size); color: var(--aw-muted); }
.pt-total b { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.pt-actions { display: flex; gap: 8px; justify-content: flex-end; }
.pt-lines { width: 100%; }
.pt-lines td:last-child { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-drcr { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 20px; padding: 0 8px; border-radius: 10px; font-size: var(--type-supporting-size); font-weight: 600; }
.pt-drcr.is-cr { color: var(--aw-success); background: color-mix(in srgb, var(--aw-success) 12%, transparent); }
.pt-drcr.is-dr { color: var(--aw-danger); background: color-mix(in srgb, var(--aw-danger) 12%, transparent); }
@media (max-width: 1100px) { .pt-vhead { grid-template-columns: 1fr 1fr; } .pt-total, .pt-actions { align-items: flex-start; justify-content: flex-start; } }
            `}</style>
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Pass Transactions')}</h1>
                    <p className="aw-desc">{t('Voucher Authorization Portal')}</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleRefresh} className="aw-btn aw-btn-secondary">
                        <RotateCcw size={13} className={isLoading ? 'aw-spin' : ''} /> {t('Refresh')}
                    </button>
                    <button type="button" onClick={handleExport} className="aw-btn aw-btn-secondary"><Download size={13} /> {t('Export')}</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Exit')}</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">{t('Pending voucher registry')}</h2>
                            {pendingCount > 0 && <span className="aw-pill tone-warning">{pendingCount} {t('awaiting authorization')}</span>}
                            <span className="aw-meta">{t('{{1}} record(s)', { 1: filteredData.length })}</span>
                            <div className="aw-input-wrap has-icon" style={{ marginLeft: 'auto', width: 280 }}>
                                <Search size={13} />
                                <input
                                    aria-label={t('Search vouchers')}
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                    placeholder={t('Search voucher, member, case...')}
                                    className="aw-input"
                                />
                            </div>
                        </div>

                        <div className="pt-list">
                            {isLoading && groups.length === 0 ? (
                                <div className="aw-empty" style={{ padding: 28 }}><span className="aw-spin" /></div>
                            ) : groups.length === 0 ? (
                                <div className="aw-empty" style={{ padding: 32 }}>
                                    <CheckCircle2 size={28} />
                                    <span className="aw-meta">{t('All caught up — no pending transactions')}</span>
                                </div>
                            ) : groups.map(({ voucherNo, head, rows }) => {
                                const busy = busyVouchers.includes(voucherNo);
                                const isRa = head.kind === 'REAGREEMENT';
                                return (
                                    <article key={voucherNo} className={`pt-voucher${isRa ? ' is-reagreement' : ''}`}>
                                        <header className="pt-vhead">
                                            <div className="pt-id">
                                                <span className="pt-vno">{voucherNo}</span>
                                                <span className="pt-chips">
                                                    {isRa && <span className="aw-pill tone-warning">RE-AGREEMENT</span>}
                                                    <span className="pt-chip" title={t('Vchr Typ')}>{head.vchrType || 'P'}</span>
                                                    <span className={`pt-chip ${head.passFlag === 'Y' ? 'is-ok' : 'is-wait'}`} title={t('Pass Flag')}>{t('Pass Flag')} {head.passFlag || 'N'}</span>
                                                </span>
                                            </div>
                                            <div className="pt-who">
                                                <strong title={head.memberName}>{head.memberName || '—'}</strong>
                                                <span>{t('MB No.')} {head.memberNo || '—'}</span>
                                            </div>
                                            <div className="pt-cheque">
                                                {head.chequeNo || head.bankName ? (
                                                    <>
                                                        <span>{t('Cheque No.')} <b>{head.chequeNo || '—'}</b></span>
                                                        <span>{head.chequeDate ? dayjs(head.chequeDate).format('DD/MM/YY') : '—'}{head.chequeAmount ? ` · ${money(head.chequeAmount)}` : ''}</span>
                                                        <span title={head.bankName}>{head.bankName || '—'}</span>
                                                    </>
                                                ) : <span className="is-muted">—</span>}
                                            </div>
                                            <div className="pt-total">
                                                <span>{t('Trans Amount')}</span>
                                                <b>{money(Number(head.voucherAmount ?? rows.reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0)))}</b>
                                            </div>
                                            <div className="pt-actions">
                                                <button type="button" onClick={() => (isRa ? setDetail(head) : setLinesOf(head))} className="aw-btn aw-btn-secondary aw-btn-sm">
                                                    <Eye size={12} /> {t('Details')}
                                                </button>
                                                <button type="button" onClick={() => handleDelete(voucherNo)} disabled={busy} className="aw-btn aw-btn-danger aw-btn-sm">
                                                    <Trash2 size={12} /> {t('Reject')}
                                                </button>
                                                <button type="button" onClick={() => handlePass(voucherNo)} disabled={busy} className="aw-btn aw-btn-primary aw-btn-sm">
                                                    <CheckCircle2 size={12} /> {t('Pass')}
                                                </button>
                                            </div>
                                        </header>
                                        <table className="aw-table pt-lines">
                                            <thead>
                                                <tr>
                                                    <th>{t('Tr. No.')}</th>
                                                    <th>{t('Head')}</th>
                                                    <th className="is-center">{t('Acc')}</th>
                                                    <th className="is-center">{t('Trans Type')}</th>
                                                    <th className="is-right">{t('Trans Amount')}</th>
                                                    <th>{t('Narration')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((record: any) => (
                                                    <tr key={record.key}>
                                                        <td className="is-muted" style={{ fontFamily: 'monospace' }}>{record.trNo || '—'}</td>
                                                        <td className="is-accent" style={{ fontWeight: 600 }}>{record.head}</td>
                                                        <td className="is-center is-muted">{record.noOfAcc || '—'}</td>
                                                        <td className="is-center"><span className={`pt-drcr ${record.transType === 'CR' ? 'is-cr' : 'is-dr'}`}>{record.transType}</span></td>
                                                        <td className="is-right" style={{ fontWeight: 600 }}>{money(record.amount)}</td>
                                                        <td className="is-muted" title={record.narration}>{record.narration || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>{t('Pass Transactions')}</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>

            <AwDialog open={!!detail} title={t('Loan Re-agreement {{1}}', { 1: detail?.reagreement?.reagreementNo || '' })} icon={<FileText size={14} />} onClose={() => setDetail(null)} maxWidth="42rem">
                {detail?.reagreement && (() => { const r = detail.reagreement; return (
                    <div className="aw-stack">
                        <p className="aw-meta">{t('Member')} {r.mbno} · case #{r.oldLoanCaseNo} → {t('new case')} <strong>#{r.newLoanCaseNo}</strong> · voucher {detail.voucherNo}. Passing makes the new case active and closes the old case; no principal moves.</p>
                        <div className="aw-table-wrap"><table className="aw-table">
                            <thead><tr><th>{t('Terms')}</th><th className="is-right">{t('Old')}</th><th className="is-right">{t('New')}</th></tr></thead>
                            <tbody>
                                <tr><td>{t('Rate (% p.a.)')}</td><td className="is-right">{Number(r.old.rate).toFixed(2)}</td><td className="is-right aw-strong">{Number(r.neu.rate).toFixed(2)}</td></tr>
                                <tr><td>{t('Installments')}</td><td className="is-right">{r.old.installments}</td><td className="is-right aw-strong">{r.neu.installments}</td></tr>
                                <tr><td>{t('Monthly principal')}</td><td className="is-right">{fmtMoney(r.old.monthlyPrincipal)}</td><td className="is-right">{fmtMoney(r.neu.monthlyPrincipal)}</td></tr>
                                <tr><td>{t('Monthly interest')}</td><td className="is-right">{fmtMoney(r.old.monthlyInterest)}</td><td className="is-right">{fmtMoney(r.neu.monthlyInterest)}</td></tr>
                                <tr><td className="aw-strong">EMI</td><td className="is-right aw-strong">{fmtMoney(r.old.monthlyInstallment)}</td><td className="is-right aw-strong">{fmtMoney(r.neu.monthlyInstallment)}</td></tr>
                            </tbody>
                        </table></div>
                        <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                            <div><dt>{t('Principal carried over')}</dt><dd>₹{fmtMoney(r.position.outstandingPrincipal)}</dd></div>
                            <div><dt>{t('NR interest collected')}</dt><dd>₹{fmtMoney(r.position.nrInterest)}</dd></div>
                            <div><dt>{t('Penalty collected')}</dt><dd>₹{fmtMoney(r.position.penaltyDue)}</dd></div>
                            <div><dt>{t('Closure interest carried')}</dt><dd>₹{fmtMoney(r.position.apInterest)}</dd></div>
                            <div><dt>{t('Total collected')}</dt><dd className="aw-strong">₹{fmtMoney(r.collect.total)}</dd></div>
                            <div><dt>{t('First installment')}</dt><dd>{fmtMonth(r.firstDueMonth)}</dd></div>
                        </dl>
                        <div><span className="aw-meta">{t('Draft agreement for signing:')}</span> <ReagreementDocumentActions id={r.id} draft baseName={r.reagreementNo} /></div>
                    </div>
                ); })()}
            </AwDialog>

            <AwDialog open={!!linesOf} title={t('Voucher {{1}}', { 1: linesOf?.voucherNo || '' })} icon={<FileText size={14} />} onClose={() => setLinesOf(null)} maxWidth="48rem">
                {linesOf && (
                    <div className="aw-stack">
                        <p className="aw-meta">
                            {linesOf.vchrType} · {t('Member')} {linesOf.memberNo || '—'} {linesOf.memberName ? `(${linesOf.memberName})` : ''}
                            {linesOf.loanCaseNo ? ` · case #${linesOf.loanCaseNo}` : ''} · {linesOf.paymentMode === 'bank' ? t('Bank') : t('Cash')}
                        </p>
                        {linesOf.narration && <p className="aw-meta">{linesOf.narration}</p>}
                        <div className="aw-table-wrap"><table className="aw-table">
                            <thead><tr>
                                <th>#</th><th>{t('Tr. No.')}</th><th>{t('Head')}</th><th>{t('Trans Type')}</th>
                                <th>{t('Acc')}</th><th>{t('Narration')}</th><th className="is-right">{t('Amount')}</th>
                            </tr></thead>
                            <tbody>
                                {(linesOf.breakdown || []).map((l: any, i: number) => {
                                    const cr = ['CR', 'DR'].includes(String(l.transType || '').toUpperCase()) ? String(l.transType).toUpperCase() === 'CR' : l.rp === 'R';
                                    return (
                                        <tr key={i}>
                                            <td className="is-muted">{l.srNo}</td>
                                            <td className="is-muted" style={{ fontFamily: 'monospace' }}>{l.trNo || '—'}</td>
                                            <td className="is-accent" style={{ fontWeight: 600 }}>{[l.code, l.headName].filter(Boolean).join(' - ') || '—'}</td>
                                            <td className={cr ? 'is-success' : 'is-danger'} style={{ fontWeight: 600 }}>{cr ? 'CR' : 'DR'}</td>
                                            <td className="is-muted">{[l.accType, l.accNo].filter(Boolean).join(' ') || '—'}</td>
                                            <td className="is-muted">{l.name || '—'}</td>
                                            <td className="is-right" style={{ fontWeight: 600 }}>{money(Number(l.amount) || 0)}</td>
                                        </tr>
                                    );
                                })}
                                {(!linesOf.breakdown || linesOf.breakdown.length === 0) && (
                                    <tr><td colSpan={7} className="is-muted" style={{ textAlign: 'center' }}>{t('This voucher has no posting lines yet.')}</td></tr>
                                )}
                            </tbody>
                        </table></div>
                        <p className="aw-strong" style={{ textAlign: 'right' }}>{t('Voucher total')}: {money(Number(linesOf.voucherAmount ?? 0))}</p>
                    </div>
                )}
            </AwDialog>

            <AwDialog open={!!reagreementResult} title={t('Re-agreement passed')} icon={<CheckCircle2 size={14} />} onClose={clearReagreementResult} maxWidth="40rem">
                {reagreementResult && (
                    <div className="aw-stack">
                        <p><strong>{reagreementResult.reagreementNo}</strong> {t('is passed. Loan case')} <strong>#{reagreementResult.newLoanCaseNo}</strong> is now active and case #{reagreementResult.oldLoanCaseNo} {t('is closed as re-agreed.')}</p>
                        <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                            <div><dt>{t('Principal carried')}</dt><dd>₹{fmtMoney(reagreementResult.outstandingPrincipal)}</dd></div>
                            <div><dt>{t('Collected now')}</dt><dd>₹{fmtMoney(reagreementResult.collected)}</dd></div>
                            <div><dt>{t('New EMI')}</dt><dd className="aw-strong">₹{fmtMoney(reagreementResult.neu?.monthlyInstallment)}</dd></div>
                            <div><dt>{t('Term')}</dt><dd>{reagreementResult.neu?.installments} @ {reagreementResult.neu?.rate}%</dd></div>
                            <div><dt>{t('First installment')}</dt><dd>{fmtMonth(reagreementResult.neu?.firstDueMonth)}</dd></div>
                        </dl>
                        {reagreementResult.documentIssued
                            ? <div><span className="aw-meta">{t('Saved agreement (with signatures):')}</span> <ReagreementDocumentActions id={reagreementResult.reagreementId} baseName={reagreementResult.reagreementNo} size="md" /></div>
                            : <p className="aw-meta" style={{ color: 'var(--aw-danger)' }}>{t('The agreement document could not be fully generated ({{1}}). Open Loan Re-agreement History to retry the PDF / image.', { 1: reagreementResult.documentError || t('unknown error') })}</p>}
                        <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}><button type="button" className="aw-btn aw-btn-primary" onClick={clearReagreementResult}>{t('Done')}</button></div>
                    </div>
                )}
            </AwDialog>
        </div>
    );
};

export default PassTransactionsTable;
