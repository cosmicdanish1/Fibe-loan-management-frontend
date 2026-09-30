import React, { useState } from 'react';
import { ConfigProvider, Select, Button, Modal, Popover, Checkbox, theme as antdTheme } from 'antd';
import { User, CreditCard, Printer, FileDown, Search, Landmark, Columns3 } from 'lucide-react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { useLoanStatement } from '../hooks/useLoanStatement';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

const { Option } = Select;

const LOAN_TYPE_LABEL: Record<string, string> = {
    RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against Recovery',
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
    const [showLookup, setShowLookup] = useState(false);
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(loadVisibleColumns);

    const { interfaceMode } = useSelector((state: RootState) => state.theme);
    const isDark = interfaceMode === 'dark';

    const selectedLoan = activeLoans.find(l => l.loancaseno === selectedLoanCase);
    const shownColumns = ALL_COLUMNS.filter(c => visibleCols[c.key] !== false);

    const onMemberSelected = (member: any) => {
        const no = String(member.memberNo || '');
        const name = member.memberName || member.name || '';
        setInputMbno(no);
        fetchMemberLoans(no, name);
        setShowLookup(false);
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
        const csv = [headers, ...csvRows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `loan_statement_${mbno}_${selectedLoanCase}.csv`;
        link.click();
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: { colorPrimary: '#4f46e5', borderRadius: 8, colorBgContainer: isDark ? '#1e293b' : '#ffffff', colorBorder: isDark ? '#334155' : '#e2e8f0' },
            }}
        >
            <div className={`loan-stmt-page h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <div className="loan-stmt-header bg-gradient-to-r from-slate-900 to-slate-900 px-4 py-2 flex items-center justify-between shrink-0 shadow-lg border-b border-white/5 no-print">
                    <div>
                        <h1 className="fz-label font-black text-white tracking-tight uppercase">Loan Account Statement</h1>
                        <p className="fz-caption text-slate-400">Installment-by-installment record for one loan at a time</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            icon={<Printer size={13} />}
                            size="small"
                            className="h-8 px-3 rounded-lg fz-caption font-bold uppercase tracking-wide"
                            onClick={handlePrint}
                            disabled={rows.length === 0}
                        >
                            Print
                        </Button>
                        <Button
                            type="primary"
                            icon={<FileDown size={13} />}
                            size="small"
                            className="h-8 px-3 rounded-lg fz-caption font-bold uppercase tracking-wide bg-gradient-to-r from-emerald-600 to-emerald-700"
                            onClick={exportCsv}
                            disabled={rows.length === 0}
                        >
                            CSV
                        </Button>
                        <button onClick={reset} className="fz-caption px-3 py-1.5 border border-white/20 rounded text-slate-200 hover:bg-white/10">Reset</button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className={`loan-stmt-sidebar w-[300px] border-r flex flex-col shrink-0 overflow-y-auto no-print ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="p-4 space-y-4">
                            <div className={`loan-stmt-card rounded-xl overflow-hidden border shadow-sm ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                                <div className={`px-3 py-2 flex items-center gap-2 border-b ${isDark ? 'bg-slate-600/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                                    <User size={12} className="text-indigo-600" />
                                    <span className="fz-caption font-black uppercase tracking-wider text-slate-600">Member</span>
                                </div>
                                <div className="p-3 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Member No."
                                            value={inputMbno}
                                            onChange={e => setInputMbno(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && fetchMemberLoans(inputMbno, '')}
                                            className="fz-body border border-slate-300 rounded px-2 py-1.5 w-full focus:outline-none focus:border-indigo-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLookup(true)}
                                            className="fz-button px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-indigo-600 hover:text-white transition-colors shrink-0"
                                        >
                                            <Search size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => fetchMemberLoans(inputMbno, '')}
                                        disabled={loading || !inputMbno}
                                        className="w-full fz-caption font-bold py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        Load Member's Loans
                                    </button>
                                    {memberName && <div className="fz-caption text-indigo-600 font-semibold">{memberName} — #{mbno}</div>}
                                </div>
                            </div>

                            {activeLoans.length > 0 && (
                                <div className={`loan-stmt-card rounded-xl overflow-hidden border shadow-sm ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                                    <div className={`px-3 py-2 flex items-center gap-2 border-b ${isDark ? 'bg-slate-600/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                                        <Landmark size={12} className="text-indigo-600" />
                                        <span className="fz-caption font-black uppercase tracking-wider text-slate-600">
                                            Select Loan ({activeLoans.length})
                                        </span>
                                    </div>
                                    <div className="p-3">
                                        <Select
                                            value={selectedLoanCase}
                                            onChange={(v: string) => { selectLoanCase(v); }}
                                            className="w-full"
                                            placeholder="Choose a loan case..."
                                            size="middle"
                                        >
                                            {activeLoans.map(loan => (
                                                <Option key={loan.loancaseno} value={loan.loancaseno}>
                                                    #{loan.loancaseno} — {LOAN_TYPE_LABEL[loan.loantype] || loan.loantype} (₹{fmt(loan.balance)})
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {summary && (
                                <div className="space-y-2">
                                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-3 text-white shadow-md">
                                        <div className="fz-caption font-bold uppercase tracking-wide opacity-90 mb-1">Current Balance</div>
                                        <div className="fz-heading font-black font-mono">₹{fmt(summary.current_balance)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-900/40' : 'bg-emerald-50'}`}>
                                            <div className="fz-caption font-bold uppercase text-emerald-600">Principal Paid</div>
                                            <div className="fz-body font-black text-emerald-700">₹{fmt(summary.total_principal_paid)}</div>
                                        </div>
                                        <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-900/40' : 'bg-amber-50'}`}>
                                            <div className="fz-caption font-bold uppercase text-amber-600">Interest Paid</div>
                                            <div className="fz-body font-black text-amber-700">₹{fmt(summary.total_interest_paid)}</div>
                                        </div>
                                        <div className={`p-2 rounded-lg ${isDark ? 'bg-rose-900/40' : 'bg-rose-50'}`}>
                                            <div className="fz-caption font-bold uppercase text-rose-600">Penal Paid</div>
                                            <div className="fz-body font-black text-rose-700">₹{fmt(summary.total_penal_paid)}</div>
                                        </div>
                                        <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-600' : 'bg-slate-100'}`}>
                                            <div className="fz-caption font-bold uppercase text-slate-500">Payments</div>
                                            <div className="fz-body font-black text-slate-700">{summary.payments_made}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {message && (
                                <div className={`p-2 rounded text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                    {message.text}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main statement */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className={`loan-stmt-panel flex-1 rounded-xl shadow-sm flex flex-col overflow-hidden m-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 no-print ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-indigo-50/50 border-slate-100'}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-100'}`}>
                                        <CreditCard size={14} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="fz-caption font-extrabold uppercase tracking-wide text-slate-700">Statement</h3>
                                        <p className="fz-caption font-semibold text-slate-400">
                                            {selectedLoanCase ? `Loan #${selectedLoanCase}` : 'Select a member and loan case'}
                                        </p>
                                    </div>
                                </div>
                                <Popover
                                    trigger="click"
                                    placement="bottomRight"
                                    content={
                                        <div className="flex flex-col gap-1 w-40">
                                            {ALL_COLUMNS.map(c => (
                                                <Checkbox
                                                    key={c.key}
                                                    checked={visibleCols[c.key] !== false}
                                                    onChange={() => toggleColumn(c.key)}
                                                >
                                                    {c.label}
                                                </Checkbox>
                                            ))}
                                        </div>
                                    }
                                >
                                    <Button size="small" icon={<Columns3 size={13} />}>Columns</Button>
                                </Popover>
                            </div>

                            <div className={`flex-1 overflow-auto p-4 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 fz-body">Loading...</div>
                                ) : rows.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                                        <Search size={56} className="text-slate-300 mb-4" />
                                        <h3 className="fz-body font-bold text-slate-400 uppercase tracking-wide">No Transactions</h3>
                                        <p className="fz-caption text-slate-300 mt-1">
                                            {selectedLoanCase ? 'No repayments recorded yet for this loan.' : 'Choose a member and loan case on the left.'}
                                        </p>
                                    </div>
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
                        </div>
                    </div>
                </div>
            </div>

            <Modal open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={800} styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal onSelect={onMemberSelected} onClose={() => setShowLookup(false)} />
            </Modal>

            <style>{`
                /* Printing now goes through a hidden iframe (see handlePrint) that
                   renders a plain monospace layout built from the report's own data
                   — no @media print rule is needed on this live page anymore;
                   window.print() is no longer called on it. */

                /* ── Loan Account Statement — dark mode ── */
                html.dark .loan-stmt-page { background-color: #000000 !important; color: #f5f5f7 !important; }
                html.dark .loan-stmt-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .loan-stmt-sidebar { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .loan-stmt-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .loan-stmt-card .text-slate-600 { color: #8e8e93 !important; }
                html.dark .loan-stmt-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .loan-stmt-page .bg-slate-900\\/40 { background-color: rgba(255,255,255,.03) !important; }
                html.dark .loan-stmt-page .bg-white { background-color: #1c1c1e !important; }
                html.dark .loan-stmt-page .text-slate-700 { color: #f5f5f7 !important; }
                html.dark .loan-stmt-page .text-slate-800 { color: #f5f5f7 !important; }
                html.dark .loan-stmt-page .text-slate-500 { color: #8e8e93 !important; }
                html.dark .loan-stmt-page .text-slate-400 { color: #8e8e93 !important; }
                html.dark .loan-stmt-page .text-slate-300 { color: #71717a !important; }
                html.dark .loan-stmt-page input {
                    background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .loan-stmt-page .ant-select-selector {
                    background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .loan-stmt-page .ant-select-selection-item { color: #f5f5f7 !important; }
                html.dark .loan-stmt-page .ant-btn:not(.ant-btn-primary) {
                    background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important;
                }
                /* Statement table */
                html.dark .loan-stmt-table thead tr { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.07) !important; }
                html.dark .loan-stmt-table th { color: #8e8e93 !important; }
                html.dark .loan-stmt-table td { border-color: rgba(255,255,255,.07) !important; color: #f5f5f7 !important; }
                html.dark .loan-stmt-table tr.border-slate-100 { border-color: rgba(255,255,255,.07) !important; }
                html.dark .loan-stmt-table tr:hover { background-color: rgba(255,255,255,.05) !important; }
                html.dark .loan-stmt-table .text-slate-600,
                html.dark .loan-stmt-table .text-slate-500,
                html.dark .loan-stmt-table .text-slate-700 { color: #f5f5f7 !important; }
                html.dark .loan-stmt-table .text-slate-800 { color: #ffffff !important; }
                html.dark .loan-stmt-page .border-dashed { border-color: rgba(255,255,255,.07) !important; }
                html.dark .ant-modal-content, html.dark .ant-modal-header {
                    background-color: #1c1c1e !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
                }
            `}</style>
        </ConfigProvider>
    );
};

export default LoanStatement;
