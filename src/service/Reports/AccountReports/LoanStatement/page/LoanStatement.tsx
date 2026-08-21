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
    RLN: 'Regular Loan', ELN: 'Emergency Loan', ALN: 'Additional Loan',
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

const LoanStatement: React.FC = () => {
    const {
        mbno, memberName, activeLoans, selectedLoanCase, rows, summary, loading, message,
        fetchMemberLoans, selectLoanCase, reset,
    } = useLoanStatement();
    const [inputMbno, setInputMbno] = useState('');
    const [showLookup, setShowLookup] = useState(false);
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(loadVisibleColumns);

    const { interfaceMode } = useSelector((state: RootState) => state.theme);
    const isDark = interfaceMode === 'dark' ||
        (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const selectedLoan = activeLoans.find(l => l.loancaseno === selectedLoanCase);
    const shownColumns = ALL_COLUMNS.filter(c => visibleCols[c.key] !== false);

    const onMemberSelected = (member: any) => {
        const no = String(member.memberNo || '');
        const name = member.memberName || member.name || '';
        setInputMbno(no);
        fetchMemberLoans(no, name);
        setShowLookup(false);
    };

    const handlePrint = () => window.print();

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
            <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <div className="bg-gradient-to-r from-slate-900 to-slate-900 px-4 py-2 flex items-center justify-between shrink-0 shadow-lg border-b border-white/5 no-print">
                    <div>
                        <h1 className="fz-label font-black text-white tracking-tight uppercase">Loan Account Statement</h1>
                        <p className="fz-caption text-slate-400">Installment-by-installment record for one loan at a time</p>
                    </div>
                    <button onClick={reset} className="fz-caption px-3 py-1.5 border border-white/20 rounded text-slate-200 hover:bg-white/10">Reset</button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className={`w-[300px] border-r flex flex-col shrink-0 overflow-y-auto no-print ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="p-4 space-y-4">
                            <div className={`rounded-xl overflow-hidden border shadow-sm ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
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
                                <div className={`rounded-xl overflow-hidden border shadow-sm ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
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

                            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                                <Button icon={<Printer size={14} />} onClick={handlePrint} disabled={rows.length === 0} block>Print</Button>
                                <Button icon={<FileDown size={14} />} onClick={exportCsv} disabled={rows.length === 0} block>Export CSV</Button>
                            </div>

                            {message && (
                                <div className={`p-2 rounded text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                    {message.text}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main statement */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className={`flex-1 rounded-xl shadow-sm flex flex-col overflow-hidden m-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
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

                                        <table className="w-full fz-caption border-collapse">
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
                @media print {
                    .no-print { display: none !important; }
                    .w-\\[300px\\] { display: none !important; }
                    body { margin: 0; padding: 16px; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; }
                    thead { display: table-header-group; }
                }
            `}</style>
        </ConfigProvider>
    );
};

export default LoanStatement;
