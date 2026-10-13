// components/PassTransactionsTable.tsx

import React, { useState } from 'react';
import { RotateCcw, X, Search, CheckCircle2, Trash2, FileText, Download, Eye } from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';
import ReagreementDocumentActions from '@/components/shared/loan/ReagreementDocumentActions';
import { fmtMoney, fmtMonth } from '../../../../services/reagreementApi';
import { PassTransactionsHookReturn } from '../interface/PassTransactionsInterfaces';
import dayjs from 'dayjs';

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
    const [searchText, setSearchText] = useState('');
    const [detail, setDetail] = useState<any | null>(null);

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

    const getSpan = (record: any): { rowSpan: number } => {
        const group = voucherGroups[record.voucherNo];
        if (!group) return { rowSpan: 1 };
        if (record.key === group.firstKey) return { rowSpan: group.count };
        return { rowSpan: 0 };
    };

    const pendingCount = Object.keys(voucherGroups).length;

    const money = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Pass Transactions</h1>
                    <p className="aw-desc">Voucher Authorization Portal</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleRefresh} className="aw-btn aw-btn-secondary">
                        <RotateCcw size={13} className={isLoading ? 'aw-spin' : ''} /> Refresh
                    </button>
                    <button type="button" onClick={handleExport} className="aw-btn aw-btn-secondary"><Download size={13} /> Export</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <h2 className="aw-card-title">Pending Voucher Registry</h2>
                            {pendingCount > 0 && <span className="aw-pill tone-warning">{pendingCount} awaiting authorization</span>}
                            <span className="aw-meta">{filteredData.length} record(s)</span>
                            <div className="aw-input-wrap has-icon" style={{ marginLeft: 'auto', width: 280 }}>
                                <Search size={13} />
                                <input
                                    aria-label="Search vouchers"
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                    placeholder="Search voucher, member, case..."
                                    className="aw-input"
                                />
                            </div>
                        </div>

                        <div className="aw-table-wrap" style={{ maxHeight: 'calc(100vh - 300px)', minHeight: 200 }}>
                            <table className="aw-table" style={{ minWidth: 1500 }}>
                                <thead>
                                    <tr>
                                        <th>Tr. No.</th>
                                        <th>Vchr No.</th>
                                        <th>MB No.</th>
                                        <th>Name</th>
                                        <th className="is-center">Acc</th>
                                        <th>Head</th>
                                        <th>Trans Type</th>
                                        <th className="is-right">Trans Amount</th>
                                        <th className="is-center">Vchr Typ</th>
                                        <th>Cheque No.</th>
                                        <th>Cheque Date</th>
                                        <th className="is-right">Cheque Amt</th>
                                        <th>Bank</th>
                                        <th className="is-center">Pass Flag</th>
                                        <th>Narration</th>
                                        <th className="is-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading && dataWithKeys.length === 0 ? (
                                        <tr><td colSpan={16}><div className="aw-empty" style={{ padding: 28 }}><span className="aw-spin" /></div></td></tr>
                                    ) : dataWithKeys.length === 0 ? (
                                        <tr><td colSpan={16}>
                                            <div className="aw-empty" style={{ padding: 32 }}>
                                                <CheckCircle2 size={28} />
                                                <span className="aw-meta">All caught up — no pending transactions</span>
                                            </div>
                                        </td></tr>
                                    ) : dataWithKeys.map((record: any) => {
                                        const span = getSpan(record).rowSpan;
                                        return (
                                            <tr key={record.key}>
                                                <td className="is-muted" style={{ fontFamily: 'monospace' }}>{record.trNo || '—'}</td>
                                                {span > 0 && <td rowSpan={span} className="is-accent" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{record.voucherNo}</td>}
                                                {span > 0 && <td rowSpan={span} style={{ fontFamily: 'monospace', fontWeight: 700 }}>{record.memberNo}</td>}
                                                {span > 0 && <td rowSpan={span} style={{ fontWeight: 700, textTransform: 'uppercase' }} title={record.memberName}>{record.memberName}</td>}
                                                <td className="is-center">{record.noOfAcc}</td>
                                                <td className="is-accent" style={{ fontWeight: 700 }}>{record.kind === 'REAGREEMENT' ? <span className="aw-pill tone-warning">RE-AGREEMENT</span> : record.head}</td>
                                                <td className={record.transType === 'CR' ? 'is-success' : 'is-danger'} style={{ fontWeight: 700 }}>{record.transType}</td>
                                                <td className="is-right" style={{ fontWeight: 700 }}>{money(record.amount)}</td>
                                                <td className="is-center">{record.vchrType || 'P'}</td>
                                                <td className="is-muted" style={{ fontFamily: 'monospace' }}>{record.chequeNo || '—'}</td>
                                                <td className="is-muted" style={{ fontFamily: 'monospace' }}>{record.chequeDate ? dayjs(record.chequeDate).format('DD/MM/YY') : '—'}</td>
                                                <td className="is-right is-muted">{record.chequeAmount ? money(record.chequeAmount) : '—'}</td>
                                                <td className="is-muted" title={record.bankName}>{record.bankName || '—'}</td>
                                                <td className={`is-center ${record.passFlag === 'Y' ? 'is-success' : 'is-warning'}`} style={{ fontWeight: 700 }}>{record.passFlag || 'N'}</td>
                                                <td className="is-muted" title={record.narration} style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.narration || '—'}</td>
                                                {span > 0 && (
                                                    <td rowSpan={span} className="is-center">
                                                        <div className="aw-btn-row" style={{ justifyContent: 'center' }}>
                                                            {record.kind === 'REAGREEMENT' && (
                                                                <button type="button" onClick={() => setDetail(record)} className="aw-btn aw-btn-secondary aw-btn-sm">
                                                                    <Eye size={12} /> Details
                                                                </button>
                                                            )}
                                                            <button type="button" onClick={() => handleDelete(record.voucherNo)} disabled={busyVouchers.includes(record.voucherNo)} className="aw-btn aw-btn-danger aw-btn-sm">
                                                                <Trash2 size={12} /> Reject
                                                            </button>
                                                            <button type="button" onClick={() => handlePass(record.voucherNo)} disabled={busyVouchers.includes(record.voucherNo)} className="aw-btn aw-btn-primary aw-btn-sm">
                                                                <CheckCircle2 size={12} /> Pass
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Pass Transactions</span>
                <span>{dayjs().format('DD-MMM-YY')}</span>
            </div>

            <AwDialog open={!!detail} title={`Loan Re-agreement ${detail?.reagreement?.reagreementNo || ''}`} icon={<FileText size={14} />} onClose={() => setDetail(null)} maxWidth="42rem">
                {detail?.reagreement && (() => { const r = detail.reagreement; return (
                    <div className="aw-stack">
                        <p className="aw-meta">Member {r.mbno} · case #{r.oldLoanCaseNo} → new case <strong>#{r.newLoanCaseNo}</strong> · voucher {detail.voucherNo}. Passing makes the new case active and closes the old case; no principal moves.</p>
                        <div className="aw-table-wrap"><table className="aw-table">
                            <thead><tr><th>Terms</th><th className="is-right">Old</th><th className="is-right">New</th></tr></thead>
                            <tbody>
                                <tr><td>Rate (% p.a.)</td><td className="is-right">{Number(r.old.rate).toFixed(2)}</td><td className="is-right aw-strong">{Number(r.neu.rate).toFixed(2)}</td></tr>
                                <tr><td>Installments</td><td className="is-right">{r.old.installments}</td><td className="is-right aw-strong">{r.neu.installments}</td></tr>
                                <tr><td>Monthly principal</td><td className="is-right">{fmtMoney(r.old.monthlyPrincipal)}</td><td className="is-right">{fmtMoney(r.neu.monthlyPrincipal)}</td></tr>
                                <tr><td>Monthly interest</td><td className="is-right">{fmtMoney(r.old.monthlyInterest)}</td><td className="is-right">{fmtMoney(r.neu.monthlyInterest)}</td></tr>
                                <tr><td className="aw-strong">EMI</td><td className="is-right aw-strong">{fmtMoney(r.old.monthlyInstallment)}</td><td className="is-right aw-strong">{fmtMoney(r.neu.monthlyInstallment)}</td></tr>
                            </tbody>
                        </table></div>
                        <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                            <div><dt>Principal carried over</dt><dd>₹{fmtMoney(r.position.outstandingPrincipal)}</dd></div>
                            <div><dt>NR interest collected</dt><dd>₹{fmtMoney(r.position.nrInterest)}</dd></div>
                            <div><dt>Penalty collected</dt><dd>₹{fmtMoney(r.position.penaltyDue)}</dd></div>
                            <div><dt>Closure interest carried</dt><dd>₹{fmtMoney(r.position.apInterest)}</dd></div>
                            <div><dt>Total collected</dt><dd className="aw-strong">₹{fmtMoney(r.collect.total)}</dd></div>
                            <div><dt>First installment</dt><dd>{fmtMonth(r.firstDueMonth)}</dd></div>
                        </dl>
                        <div><span className="aw-meta">Draft agreement for signing:</span> <ReagreementDocumentActions id={r.id} draft baseName={r.reagreementNo} /></div>
                    </div>
                ); })()}
            </AwDialog>

            <AwDialog open={!!reagreementResult} title="Re-agreement passed" icon={<CheckCircle2 size={14} />} onClose={clearReagreementResult} maxWidth="40rem">
                {reagreementResult && (
                    <div className="aw-stack">
                        <p><strong>{reagreementResult.reagreementNo}</strong> is passed. Loan case <strong>#{reagreementResult.newLoanCaseNo}</strong> is now active and case #{reagreementResult.oldLoanCaseNo} is closed as re-agreed.</p>
                        <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                            <div><dt>Principal carried</dt><dd>₹{fmtMoney(reagreementResult.outstandingPrincipal)}</dd></div>
                            <div><dt>Collected now</dt><dd>₹{fmtMoney(reagreementResult.collected)}</dd></div>
                            <div><dt>New EMI</dt><dd className="aw-strong">₹{fmtMoney(reagreementResult.neu?.monthlyInstallment)}</dd></div>
                            <div><dt>Term</dt><dd>{reagreementResult.neu?.installments} @ {reagreementResult.neu?.rate}%</dd></div>
                            <div><dt>First installment</dt><dd>{fmtMonth(reagreementResult.neu?.firstDueMonth)}</dd></div>
                        </dl>
                        {reagreementResult.documentIssued
                            ? <div><span className="aw-meta">Saved agreement (with signatures):</span> <ReagreementDocumentActions id={reagreementResult.reagreementId} baseName={reagreementResult.reagreementNo} size="md" /></div>
                            : <p className="aw-meta" style={{ color: 'var(--aw-danger)' }}>The agreement document could not be fully generated ({reagreementResult.documentError || 'unknown error'}). Open Loan Re-agreement History to retry the PDF / image.</p>}
                        <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}><button type="button" className="aw-btn aw-btn-primary" onClick={clearReagreementResult}>Done</button></div>
                    </div>
                )}
            </AwDialog>
        </div>
    );
};

export default PassTransactionsTable;
