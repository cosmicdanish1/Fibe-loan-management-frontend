import React, { useState } from 'react';
import { Select, Popover, Checkbox } from 'antd';
import { User, Printer, FileDown, Search, Landmark, Columns3, RefreshCw, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { useLoanStatement } from '../hooks/useLoanStatement';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useStatementSpec, ProBento, ProTerm, ProEd } from '../views/statementPro';
import { csvCell } from '@/utils/csv';

const LOAN_TYPE_LABEL: Record<string, string> = {
    RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against RD',
};
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmt = (n: number | string | null | undefined) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ColumnDef {
    key: string;
    label: string;
    align?: 'left' | 'right';
}

const ALL_COLUMNS: ColumnDef[] = [
    { key: 'date', label: 'Date' },
    { key: 'forMonth', label: 'For Month' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'monthsLate', label: 'Months Late', align: 'right' },
    { key: 'principal', label: 'Principal', align: 'right' },
    { key: 'interest', label: 'Interest', align: 'right' },
    { key: 'penal', label: 'Penal', align: 'right' },
    { key: 'totalPaid', label: 'Total Paid', align: 'right' },
    { key: 'balanceAfter', label: 'Balance After', align: 'right' },
    { key: 'receipt', label: 'Receipt' },
    { key: 'narration', label: 'Narration' },
];

const COLUMN_STORAGE_KEY = 'loanStatement.visibleColumns';

const loadVisibleColumns = (): Record<string, boolean> => {
    const defaults = Object.fromEntries(ALL_COLUMNS.map(c => [c.key, true]));
    try {
        const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
        if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch { /* ignore malformed storage */ }
    return defaults;
};

// Legacy-print builder — plain monospace text (letterhead, dashed rules,
// TOTAL-free running ledger, closing summary block), fed into a hidden
// iframe by handlePrint. Not a clone of the on-screen colorful UI.
const LS_COL_WIDTH: Record<string, number> = {
    date: 9, forMonth: 8, dueDate: 9, monthsLate: 4, principal: 9, interest: 8,
    penal: 6, totalPaid: 9, balanceAfter: 11, receipt: 7, narration: 14,
};
// Abbreviated so the header text fits its (content-sized, not label-sized)
// column width — the on-screen labels ("Balance After") are too wide.
const LS_PRINT_HEADER: Record<string, string> = {
    date: 'Date', forMonth: 'ForMonth', dueDate: 'DueDate', monthsLate: 'Late',
    principal: 'Principal', interest: 'Interest', penal: 'Penal', totalPaid: 'TotalPaid',
    balanceAfter: 'Balance', receipt: 'Receipt', narration: 'Narration',
};
const lsPadL = (s: string, w: number) => s.padStart(w);
const lsPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const lsCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

const LS_CELL_TEXT: Record<string, (r: any) => string> = {
    date: r => dayjs(r.payment_date).format('DD-MMM-YY'),
    forMonth: r => `${MONTHS[r.payment_month]} ${r.payment_year}`,
    dueDate: r => r.due_date ? dayjs(r.due_date).format('DD-MMM-YY') : '-',
    monthsLate: r => String(r.months_overdue || 0),
    principal: r => fmt(r.principal_amount),
    interest: r => fmt(r.interest_amount),
    penal: r => fmt(r.penal_amount),
    totalPaid: r => fmt(r.payment_amount),
    balanceAfter: r => fmt(r.remaining_balance),
    receipt: r => r.receipt_no || '-',
    narration: r => r.narration || '',
};

function buildLoanStatementLines(
    rows: any[], columns: ColumnDef[], memberName: string, mbno: string,
    selectedLoan: any, loanTypeLabel: string,
): string[] {
    const lines: string[] = [];
    // A single-space gap between every column keeps headers/values from
    // running together (e.g. "For Month" butting straight into "Due Date").
    const lineW = columns.reduce((sum, c) => sum + (LS_COL_WIDTH[c.key] || 10), 0) + Math.max(0, columns.length - 1);
    const dash = '-'.repeat(lineW);
    const now = dayjs().format('DD-MMM-YYYY/h:mmA');

    lines.push(lsCenter('Espat Karmchari Co-Operative Credit Society Limited.', lineW));
    lines.push(lsCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', lineW));
    lines.push(lsCenter('Loan Account Statement', lineW));
    lines.push('');
    lines.push(`Member : ${memberName || mbno} (${mbno})`);
    if (selectedLoan) {
        lines.push(`Loan Case : ${selectedLoan.loancaseno} | Type: ${loanTypeLabel} | Loan Amount: ${fmt(selectedLoan.loan_amt)} | EMI: ${fmt(selectedLoan.instal_amt)} | Tenure: ${selectedLoan.no_of_instal} months`);
    }
    const printedStr = `Printed : ${now}`;
    const pageStr = 'Page Number :  1';
    lines.push(`${printedStr}${lsPadL(pageStr, Math.max(1, lineW - printedStr.length))}`);
    lines.push(dash);

    lines.push(columns.map(c => {
        const w = LS_COL_WIDTH[c.key] || 10;
        const label = LS_PRINT_HEADER[c.key] || c.label;
        return c.align === 'right' ? lsPadL(label, w) : lsPadR(label, w);
    }).join(' '));
    lines.push(dash);

    rows.forEach(r => {
        lines.push(columns.map(c => {
            const w = LS_COL_WIDTH[c.key] || 10;
            const text = LS_CELL_TEXT[c.key]?.(r) ?? '';
            return c.align === 'right' ? lsPadL(text, w) : lsPadR(text, w);
        }).join(' '));
    });

    lines.push(dash);
    lines.push('');
    lines.push(`* ${rows.length} transaction(s) shown, oldest first is at the top of each installment's history`);

    return lines;
}

const LoanStatement: React.FC = () => {
    const {
        mbno, memberName, activeLoans, selectedLoanCase, rows, summary, loading, message,
        fetchMemberLoans, selectLoanCase, reset,
    } = useLoanStatement();
    const [inputMbno, setInputMbno] = useState('');
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(loadVisibleColumns);

    const { interfaceMode } = useSelector((state: RootState) => state.theme);
    const isDark = interfaceMode === 'dark';
    const { enabled, view, setView } = useReportViews('monthly.loan-statement');

    const selectedLoan = activeLoans.find(l => l.loancaseno === selectedLoanCase);
    const shownColumns = ALL_COLUMNS.filter(c => visibleCols[c.key] !== false);

    const onMemberSelected = (member: any) => {
        const no = String(member.memberNo || '');
        const name = member.memberName || member.name || '';
        setInputMbno(no);
        fetchMemberLoans(no, name);
    };

    const handlePrint = () => {
        if (rows.length === 0) return;
        const lines = buildLoanStatementLines(
            rows, shownColumns, memberName, mbno, selectedLoan,
            selectedLoan ? (LOAN_TYPE_LABEL[selectedLoan.loantype] || selectedLoan.loantype) : '',
        );
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`<!DOCTYPE html><html><head><title>Loan Account Statement</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; white-space: pre; width: fit-content; margin: 0 auto; }
</style></head><body><pre>${lines.join('\n')}</pre></body></html>`);
            doc.close();
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 300);
        }
    };

    const toggleColumn = (key: string) => {
        setVisibleCols(prev => {
            const next = { ...prev, [key]: prev[key] === false };
            localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const CELL_VALUE: Record<string, (r: (typeof rows)[number]) => string | number> = {
        date: r => dayjs(r.payment_date).format('DD-MM-YYYY'),
        forMonth: r => `${MONTHS[r.payment_month]} ${r.payment_year}`,
        dueDate: r => r.due_date ? dayjs(r.due_date).format('DD-MM-YYYY') : '',
        monthsLate: r => r.months_overdue || 0,
        principal: r => r.principal_amount,
        interest: r => r.interest_amount,
        penal: r => r.penal_amount,
        totalPaid: r => r.payment_amount,
        balanceAfter: r => r.remaining_balance,
        receipt: r => r.receipt_no || '',
        narration: r => r.narration,
    };

    const CELL_CLASS: Record<string, string> = {
        forMonth: 'text-slate-600',
        interest: 'text-amber-700',
        totalPaid: 'font-bold text-slate-800',
        balanceAfter: 'font-semibold text-indigo-700',
        receipt: 'text-slate-500',
        narration: 'text-slate-500',
    };

    const CELL_RENDER: Record<string, (r: (typeof rows)[number]) => React.ReactNode> = {
        date: r => dayjs(r.payment_date).format('DD-MM-YYYY'),
        forMonth: r => `${MONTHS[r.payment_month]} ${r.payment_year}`,
        dueDate: r => r.due_date ? dayjs(r.due_date).format('DD-MM-YYYY') : '—',
        monthsLate: r => r.months_overdue > 0
            ? <span className="text-red-600 font-semibold">{r.months_overdue}</span>
            : '—',
        principal: r => `₹${fmt(r.principal_amount)}`,
        interest: r => `₹${fmt(r.interest_amount)}`,
        penal: r => r.penal_amount > 0
            ? <span className="text-red-600 font-semibold">₹{fmt(r.penal_amount)}</span>
            : '—',
        totalPaid: r => `₹${fmt(r.payment_amount)}`,
        balanceAfter: r => `₹${fmt(r.remaining_balance)}`,
        receipt: r => r.receipt_no || '—',
        narration: r => r.narration,
    };

    const exportCsv = () => {
        if (rows.length === 0) return;
        const headers = shownColumns.map(c => c.label);
        const csvRows = rows.map(r => shownColumns.map(c => CELL_VALUE[c.key]?.(r) ?? ''));
        const csv = [headers, ...csvRows].map(row => row.map(c => csvCell(c)).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `loan_statement_${mbno}_${selectedLoanCase}.csv`;
        link.click();
    };

    const who = selectedLoan ? `${memberName || mbno} · #${selectedLoan.loancaseno}` : (memberName || mbno);
    const spec = useStatementSpec(rows, summary, who);
    const hasData = rows.length > 0;

    return (
        <ReportShell
            className="loan-stmt-page"
            title="Loan Account Statement"
            desc="Installment-by-installment record for one loan at a time"
            asideWidth={280}
            switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
            actions={
                <>
                    <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { reset(); setInputMbno(''); }}><RefreshCw size={14} /> Reset</button>
                    <button type="button" className="aw-btn aw-btn-secondary" onClick={exportCsv} disabled={!hasData}><FileDown size={14} /> CSV</button>
                    <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
                </>
            }
            aside={
                <>
                    <ParamCard title="Member" icon={<User size={14} />}>
                        <div>
                            <label className="aw-label" htmlFor="ls-member">Member no</label>
                            <MemberField id="ls-member" value={inputMbno} onChange={setInputMbno} onSelect={onMemberSelected} onSubmit={v => fetchMemberLoans(v, '')} />
                            {memberName && <span className="aw-meta">{memberName} — #{mbno}</span>}
                        </div>
                        <button type="button" className="aw-btn aw-btn-primary" onClick={() => fetchMemberLoans(inputMbno, '')} disabled={loading || !inputMbno} style={{ width: '100%' }}>
                            <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : "Load member's loans"}
                        </button>
                    </ParamCard>
                    {activeLoans.length > 0 && (
                        <ParamCard title={`Select loan (${activeLoans.length})`} icon={<Landmark size={14} />}>
                            <Select
                                {...(selectedLoanCase ? { value: selectedLoanCase } : {})}
                                onChange={(v: string) => { selectLoanCase(v); }}
                                className="aw-select" popupClassName="aw-select-popup"
                                placeholder="Choose a loan case..."
                                aria-label="Loan case"
                                options={activeLoans.map(l => ({ value: l.loancaseno, label: `#${l.loancaseno} — ${LOAN_TYPE_LABEL[l.loantype] || l.loantype} (₹${fmt(l.balance)})` }))}
                            />
                        </ParamCard>
                    )}
                    {summary && <StatCards items={[
                        { label: 'Current balance', value: `₹${fmt(summary.current_balance)}`, tone: 'info' },
                        { label: 'Principal paid', value: `₹${fmt(summary.total_principal_paid)}`, tone: 'success' },
                        { label: 'Interest paid', value: `₹${fmt(summary.total_interest_paid)}`, tone: 'warning' },
                        { label: 'Penal paid', value: `₹${fmt(summary.total_penal_paid)}`, tone: 'danger' },
                        { label: 'Payments', value: String(summary.payments_made), tone: 'muted' },
                    ]} />}
                    {message && <div className={`aw-alert ${message.type === 'error' ? 'aw-alert-danger' : 'aw-alert-success'}`}>{message.text}</div>}
                </>
            }
            footerLeft="Loan Account Statement"
            footerRight={selectedLoanCase ? `Loan #${selectedLoanCase}` : 'Select a member and loan case'}
        >
            {hasData && view === 'bento' && <ProBento spec={spec} />}
            {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><ProTerm spec={spec} /></div>}
            {hasData && view === 'editorial' && <ProEd spec={spec} subtitle={who} />}

            {view === 'legacy' && (
                <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="aw-main-head">
                        <span className="aw-card-title">Statement</span>
                        <span className="aw-meta">{selectedLoanCase ? `Loan #${selectedLoanCase}` : 'Select a member and loan case'}</span>
                        <Popover
                            trigger="click"
                            placement="bottomRight"
                            content={
                                <div className="flex flex-col gap-1 w-40">
                                    {ALL_COLUMNS.map(c => (
                                        <Checkbox key={c.key} checked={visibleCols[c.key] !== false} onChange={() => toggleColumn(c.key)}>{c.label}</Checkbox>
                                    ))}
                                </div>
                            }
                        >
                            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm"><Columns3 size={13} /> Columns</button>
                        </Popover>
                    </div>
                    <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
                        {loading ? (
                            <p className="aw-meta">Loading…</p>
                        ) : rows.length === 0 ? (
                            <ReportEmpty icon={<FileText size={34} />} title="No Transactions" hint={selectedLoanCase ? 'No repayments recorded yet for this loan.' : 'Choose a member and loan case on the left.'} />
                        ) : (
                                    <div className="print-area">
                                        <div className="text-center mb-4 border-b border-dashed border-slate-300 pb-3">
                                            <div className="fz-body font-bold text-slate-800">Espat Karmchari Co-Operative Credit Society Limited</div>
                                            <div className="fz-caption text-slate-500">Loan Account Statement — Generated {dayjs().format('DD-MMM-YYYY h:mmA')}</div>
                                        </div>

                                        {selectedLoan && (
                                            <div className="flex flex-wrap gap-x-8 gap-y-1 mb-4 fz-caption text-slate-600">
                                                <span>Member: <b>{memberName || mbno}</b></span>
                                                <span>Loan Type: <b>{LOAN_TYPE_LABEL[selectedLoan.loantype] || selectedLoan.loantype}</b></span>
                                                <span>Loan Amount: <b>₹{fmt(selectedLoan.loan_amt)}</b></span>
                                                <span>EMI: <b>₹{fmt(selectedLoan.instal_amt)}</b></span>
                                                <span>Tenure: <b>{selectedLoan.no_of_instal} months</b></span>
                                            </div>
                                        )}

                                        <table className="loan-stmt-table w-full fz-caption border-collapse">
                                            <thead>
                                                <tr className={`border-b-2 border-slate-400 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                                    {shownColumns.map(c => (
                                                        <th
                                                            key={c.key}
                                                            className={`${c.align === 'right' ? 'text-right' : 'text-left'} py-2 px-2 font-bold text-slate-700`}
                                                        >
                                                            {c.label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map(r => (
                                                    <tr key={r.id} className="border-b border-slate-100 hover:bg-indigo-50/30">
                                                        {shownColumns.map(c => (
                                                            <td
                                                                key={c.key}
                                                                className={`py-1.5 px-2 ${c.align === 'right' ? 'text-right' : ''} ${CELL_CLASS[c.key] || 'text-slate-700'}`}
                                                            >
                                                                {CELL_RENDER[c.key]?.(r)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div className="mt-4 fz-caption text-slate-400 italic text-center">
                                            * {rows.length} transaction(s) shown, oldest first is at the top of each installment's history
                                        </div>
                                    </div>
                        )}
                    </div>
                </section>
            )}
            {view !== 'legacy' && !hasData && (
                <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Transactions'} hint={selectedLoanCase ? 'No repayments recorded yet for this loan.' : 'Choose a member and loan case on the left.'} />
            )}

            <style>{`
                html.dark .loan-stmt-table thead tr { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.07) !important; }
                html.dark .loan-stmt-table th { color: #8e8e93 !important; }
                html.dark .loan-stmt-table td { border-color: rgba(255,255,255,.07) !important; color: #f5f5f7 !important; }
                html.dark .loan-stmt-table tr.border-slate-100 { border-color: rgba(255,255,255,.07) !important; }
                html.dark .loan-stmt-table tr:hover { background-color: rgba(255,255,255,.05) !important; }
                html.dark .loan-stmt-table .text-slate-600,
                html.dark .loan-stmt-table .text-slate-500,
                html.dark .loan-stmt-table .text-slate-700 { color: #f5f5f7 !important; }
                html.dark .loan-stmt-table .text-slate-800 { color: #ffffff !important; }
                html.dark .loan-stmt-page .print-area .text-slate-700,
                html.dark .loan-stmt-page .print-area .text-slate-800 { color: #f5f5f7 !important; }
                html.dark .loan-stmt-page .print-area .text-slate-500,
                html.dark .loan-stmt-page .print-area .text-slate-400 { color: #8e8e93 !important; }
                html.dark .loan-stmt-page .print-area .border-dashed { border-color: rgba(255,255,255,.07) !important; }
            `}</style>
        </ReportShell>
    );
};

export default LoanStatement;
