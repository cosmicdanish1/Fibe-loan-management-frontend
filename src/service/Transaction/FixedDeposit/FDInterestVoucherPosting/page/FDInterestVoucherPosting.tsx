import React, { useState } from 'react';
import { ConfigProvider, Input, Select, Table, message, Modal, DatePicker } from 'antd';
import {
    Landmark, RotateCcw, Save, X, ShieldCheck, Search,
    Calendar, FileText, IndianRupee, Hash, Building2,
} from 'lucide-react';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";
const roInputCls = "h-7 fz-caption font-semibold bg-slate-50 border-slate-200 rounded text-slate-600";

interface FDEntry {
    key: string;
    acNo: string;
    certNo: string;
    amount: number;
    rate: number;
    lastPayDate: string;
    interest: number;
}

const FDInterestVoucherPosting: React.FC = () => {
    const [voucherNo, setVoucherNo] = useState('');
    const [fdOption, setFdOption] = useState<'interest' | 'payment'>('interest');
    const [memberNo, setMemberNo] = useState('');
    const [certNo, setCertNo] = useState<string | undefined>(undefined);
    const [officeNo, setOfficeNo] = useState('');
    const [lastSaved, setLastSaved] = useState<{ voucherNo: string; amount: number } | null>(null);

    const [fdDetails, setFdDetails] = useState({
        certNo: '', depositDate: '', rate: '', depositUnit: '', depPer: '',
        maturityDate: '', fdInterest: '', lastIntPaidDate: '', fdAmount: '',
        interestPaid: '', intPaymentMode: '', maturityAmount: ''
    });

    const [applRate, setApplRate] = useState('');
    const [periodAsOnDate, setPeriodAsOnDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [transDate, setTransDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [calculatedIntt, setCalculatedIntt] = useState('');
    const [inttToPay, setInttToPay] = useState('');
    const [narration, setNarration] = useState('');

    // Interest from last-paid (or deposit) date up to the "as on" date, honouring simple/compound.
    const recompute = (fd: any, asOnDate: string, rateStr?: string) => {
        if (!fd) return;
        const principal = parseFloat(fd.fdAmount || 0);
        const rate = parseFloat(rateStr ?? fd.rate ?? 0);
        if (principal <= 0 || rate <= 0) { setCalculatedIntt('0.00'); setInttToPay('0.00'); return; }
        const fromDate = fd.lastIntPayDate ? dayjs(fd.lastIntPayDate) : (fd.depositDate ? dayjs(fd.depositDate) : dayjs());
        const asOn = asOnDate ? dayjs(asOnDate) : dayjs();
        let years = asOn.diff(fromDate, 'day') / 365;
        if (years < 0) years = 0;
        const isCompound = fd.intCalMethod === 2 || fd.intCalMethod === '2';
        const interest = isCompound
            ? principal * (Math.pow(1 + rate / 100, years) - 1)
            : principal * (rate / 100) * years;
        setCalculatedIntt(interest.toFixed(2));
        setInttToPay(Math.max(0, interest).toFixed(2));
    };

    const openFdWithdrawal = () => {
        if ((window as any).electronAPI?.openNewWindow) {
            (window as any).electronAPI.openNewWindow('/transaction/fixed-deposit/withdrawal-interest-payment');
        } else {
            message.info('FD Payment / Withdrawal is handled in the dedicated FD Withdrawal screen.');
        }
    };

    const [showLookupModal, setShowLookupModal] = useState(false);
    const [memberFDs, setMemberFDs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMemberFDs = async (mbNo: string) => {
        if (!mbNo) return;
        setLoading(true);
        try {
            const res = await apiService.getMemberActiveFDs(mbNo);
            if (res.success && Array.isArray(res.data)) {
                setMemberFDs(res.data);
                if (res.data.length === 0) message.info('No active FDs found for this member');
            } else {
                setMemberFDs([]);
                message.info('No active FDs found for this member');
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to fetch FDs');
        } finally {
            setLoading(false);
        }
    };

    const handleMemberSelect = (member: any) => {
        setMemberNo(member.memberNo.toString());
        fetchMemberFDs(member.memberNo.toString());
        setShowLookupModal(false);
    };

    const handleCertSelect = (val: string) => {
        setCertNo(val);
        if (val === 'all') return;
        const fd = memberFDs.find(f => f.certNo === val);
        if (fd) {
            setFdDetails({
                certNo: fd.certNo || '',
                depositDate: fd.depositDate ? dayjs(fd.depositDate).format('DD-MMM-YYYY') : '',
                rate: fd.rate?.toString() || '',
                depositUnit: fd.depositUnit === 1 ? 'Months' : fd.depositUnit === 2 ? 'Years' : '',
                depPer: fd.depositPeriod?.toString() || '',
                maturityDate: fd.maturityDate ? dayjs(fd.maturityDate).format('DD-MMM-YYYY') : '',
                fdInterest: fd.interestAmount?.toString() || '0',
                lastIntPaidDate: fd.lastIntPayDate ? dayjs(fd.lastIntPayDate).format('DD-MMM-YYYY') : '',
                fdAmount: fd.fdAmount?.toString() || '',
                interestPaid: fd.interestPaid?.toString() || '0',
                intPaymentMode: fd.intPaymentMode?.toString() || '',
                maturityAmount: fd.maturityAmount?.toString() || ''
            });
            const rateStr = fd.rate?.toString() || '';
            const asOn = dayjs().format('YYYY-MM-DD');
            setApplRate(rateStr);
            setPeriodAsOnDate(asOn);
            recompute(fd, asOn, rateStr);
        }
    };

    const handleReset = () => {
        setVoucherNo('');
        setMemberNo('');
        setCertNo(undefined);
        setOfficeNo('');
        setFdDetails({
            certNo: '', depositDate: '', rate: '', depositUnit: '', depPer: '',
            maturityDate: '', fdInterest: '', lastIntPaidDate: '', fdAmount: '',
            interestPaid: '', intPaymentMode: '', maturityAmount: ''
        });
        setApplRate('');
        setPeriodAsOnDate(dayjs().format('YYYY-MM-DD'));
        setTransDate(dayjs().format('YYYY-MM-DD'));
        setCalculatedIntt('');
        setInttToPay('');
        setNarration('');
        setMemberFDs([]);
    };

    const handleSave = async () => {
        if (!memberNo || !certNo) {
            message.error('Please select Member and Certificate');
            return;
        }
        const selectedFd = memberFDs.find(f => f.certNo === certNo);
        if (!selectedFd) { message.error('FD account not found'); return; }
        const interestAmt = parseFloat(inttToPay) || 0;
        if (interestAmt <= 0) { message.error('Please enter interest amount to pay'); return; }

        try {
            const payload = {
                memberNo: parseInt(memberNo),
                accountNumber: selectedFd.accountNumber,
                certNo: selectedFd.certNo,
                interestAmount: interestAmt,
                transDate: transDate || dayjs().format('YYYY-MM-DD'),
                narration: narration || `FD Interest Credit - ${selectedFd.certNo}`,
            };
            const res = await apiService.createInterestVoucher(payload);
            if (res.success) {
                const result = res.data;
                message.success(result?.message || `Interest voucher ${result?.voucherNo} posted`);
                setLastSaved({ voucherNo: result?.voucherNo || 'N/A', amount: interestAmt });
                handleReset();
            } else {
                message.error(res.message || 'Failed to post interest voucher');
            }
        } catch (e) {
            console.error(e);
            message.error('Error posting interest voucher');
        }
    };

    const data: FDEntry[] = memberFDs.map((fd, idx) => ({
        key: idx.toString(),
        acNo: fd.accountNumber?.toString() || '',
        certNo: fd.certNo || '',
        amount: parseFloat(fd.fdAmount || 0),
        rate: parseFloat(fd.rate || 0),
        lastPayDate: fd.lastIntPayDate ? dayjs(fd.lastIntPayDate).format('DD-MMM-YYYY') : '-',
        interest: parseFloat(fd.interestAmount || 0)
    }));

    const columns = [
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">AcNo</span>,
            dataIndex: 'acNo', key: 'acNo', width: '15%',
            render: (v: string) => <span className="fz-small font-mono font-bold text-slate-700">{v}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">CertNo</span>,
            dataIndex: 'certNo', key: 'certNo', width: '15%',
            render: (v: string) => <span className="fz-small font-mono font-bold text-indigo-700">{v}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Amount</span>,
            dataIndex: 'amount', key: 'amount', width: '18%', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-bold text-slate-700">₹{v.toFixed(2)}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Rate</span>,
            dataIndex: 'rate', key: 'rate', width: '12%', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-bold text-indigo-600">{v}%</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Last Pay Date</span>,
            dataIndex: 'lastPayDate', key: 'lastPayDate', width: '22%',
            render: (v: string) => <span className="fz-small font-mono text-slate-600">{v}</span>,
        },
        {
            title: <span className="fz-mini font-black text-slate-600 uppercase tracking-wide">Interest</span>,
            dataIndex: 'interest', key: 'interest', width: '18%', align: 'right' as const,
            render: (v: number) => <span className="fz-small font-black text-emerald-600">₹{v.toFixed(2)}</span>,
        },
    ];

    const fdDetailRows: [string, string][] = [
        ['Cert. No.', fdDetails.certNo],
        ['Deposit Date', fdDetails.depositDate],
        ['Rate', fdDetails.rate],
        ['Deposit Unit', fdDetails.depositUnit],
        ['Dep. Period', fdDetails.depPer],
        ['Maturity Date', fdDetails.maturityDate],
        ['FD Interest', fdDetails.fdInterest],
        ['Last Int Paid', fdDetails.lastIntPaidDate],
        ['FD Amount', fdDetails.fdAmount],
        ['Interest Paid', fdDetails.interestPaid],
        ['Int Pay Mode', fdDetails.intPaymentMode],
        ['Maturity Amt', fdDetails.maturityAmount],
    ];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-amber-400/50 bg-amber-600">
                            <Landmark size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">FD / Interest Voucher Posting</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> Fixed Deposit Settlement
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* FD Option pill tabs */}
                        <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/20 mr-2">
                            {(['interest', 'payment'] as const).map(opt => (
                                <button key={opt} onClick={() => opt === 'payment' ? openFdWithdrawal() : setFdOption(opt)}
                                    className={`h-6 px-3 rounded-md fz-mini font-black uppercase tracking-wide transition-all ${
                                        fdOption === opt ? 'bg-white text-slate-800 shadow' : 'text-white/70 hover:text-white'
                                    }`}>
                                    {opt === 'interest' ? 'FD Interest' : 'FD Payment'}
                                </button>
                            ))}
                        </div>
                        <button onClick={handleReset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Reset
                        </button>
                        <button onClick={handleSave} disabled={loading}
                            className={`h-7 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-amber-400 shadow-lg uppercase tracking-wide ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {loading ? <RotateCcw size={11} className="animate-spin" /> : <Save size={11} />}
                            {loading ? 'Saving…' : 'Post'}
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={() => window.close?.()} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-5xl mx-auto p-3 pb-4 space-y-2">

                        {/* Last saved banner */}
                        {lastSaved && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Save size={12} className="text-emerald-600" />
                                    <div>
                                        <span className="fz-mini font-black text-emerald-500 uppercase tracking-wide">Voucher Posted</span>
                                        <p className="fz-small font-black text-emerald-800">{lastSaved.voucherNo}</p>
                                    </div>
                                    <div>
                                        <span className="fz-mini font-black text-emerald-500 uppercase tracking-wide">Interest Amount</span>
                                        <p className="fz-small font-black text-emerald-800">₹{lastSaved.amount.toFixed(2)}</p>
                                    </div>
                                </div>
                                <button onClick={() => setLastSaved(null)} className="fz-mini font-black text-emerald-600 hover:text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                                    <X size={9} /> Dismiss
                                </button>
                            </div>
                        )}

                        {/* ── Top row: Voucher Scope + FD Details ── */}
                        <div className="grid grid-cols-2 gap-2">

                            {/* Voucher Scope */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Hash size={11} className="text-slate-400" />
                                        <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Voucher Scope</span>
                                    </div>
                                    <DatePicker value={transDate ? dayjs(transDate) : null}
                                        onChange={d => setTransDate(d ? d.format('YYYY-MM-DD') : '')}
                                        format="DD-MMM-YY" allowClear={false} size="small"
                                        suffixIcon={<Calendar size={9} className="text-indigo-400" />} style={{ width: 120 }} />
                                </div>
                                <div className="p-3 space-y-2">
                                    <div className="grid grid-cols-2 gap-x-3">
                                        <div>
                                            <label className={labelCls}>Voucher No.</label>
                                            <Input value={voucherNo} onChange={e => setVoucherNo(e.target.value)} placeholder="Auto..." className={`${inputCls} font-mono`} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Office No</label>
                                            <Input value={officeNo} onChange={e => setOfficeNo(e.target.value)} placeholder="Office..." className={inputCls} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Member No. <span className="text-rose-500">*</span></label>
                                        <div className="flex gap-1">
                                            <Input value={memberNo} onChange={e => setMemberNo(e.target.value)}
                                                onPressEnter={() => fetchMemberFDs(memberNo)}
                                                placeholder="Enter member no..." className={`${inputCls} font-mono flex-1`} />
                                            <button onClick={() => setShowLookupModal(true)}
                                                className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-500 rounded flex items-center justify-center transition-colors shrink-0">
                                                <Search size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Cert. No. <span className="text-rose-500">*</span></label>
                                        <Select value={certNo} onChange={handleCertSelect} className="w-full fdiv-sel" style={{ height: 28 }} placeholder="Select certificate..." allowClear>
                                            {memberFDs.map(fd => (
                                                <Option key={fd.certNo || fd.accountNumber} value={fd.certNo}>{fd.certNo}</Option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={async () => {
                                                if (!certNo) { message.warning('Select a certificate first'); return; }
                                                try {
                                                    await apiService.removeFDLien?.(certNo);
                                                    message.success(`Lien removed for certificate ${certNo}`);
                                                } catch (e: any) {
                                                    message.error(e?.message || 'Failed to remove lien');
                                                }
                                            }}
                                            className="h-7 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded fz-tiny font-black uppercase tracking-wide transition-colors"
                                        >
                                            Remove Lien
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* FD Details */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                    <FileText size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">FD Details</span>
                                </div>
                                <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-1">
                                    {fdDetailRows.map(([label, value]) => (
                                        <div key={label}>
                                            <label className={labelCls}>{label}</label>
                                            <Input value={value} readOnly className={roInputCls} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Interest Calculation ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <IndianRupee size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Interest Calculation</span>
                                </div>
                                {inttToPay && (
                                    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                        <span className="fz-mini font-black text-emerald-500 uppercase">To Pay</span>
                                        <span className="fz-small font-black text-emerald-700">₹{parseFloat(inttToPay).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 grid grid-cols-4 gap-x-4">
                                <div>
                                    <label className={labelCls}>Appl. Rate (%)</label>
                                    <Input value={applRate}
                                        onChange={e => { setApplRate(e.target.value); recompute(memberFDs.find(f => f.certNo === certNo), periodAsOnDate, e.target.value); }}
                                        placeholder="Rate..." className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Calculated Intt.</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={calculatedIntt} onChange={e => setCalculatedIntt(e.target.value)}
                                            placeholder="0.00" className={`${inputCls} pl-6 font-mono text-right`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Period As On Date</label>
                                    <DatePicker value={periodAsOnDate ? dayjs(periodAsOnDate) : null}
                                        onChange={d => {
                                            const v = d ? d.format('YYYY-MM-DD') : '';
                                            setPeriodAsOnDate(v);
                                            recompute(memberFDs.find(f => f.certNo === certNo), v, applRate);
                                        }}
                                        format="DD-MMM-YY" allowClear={false} className="w-full h-7 fz-caption"
                                        suffixIcon={<Calendar size={10} className="text-slate-400" />} />
                                </div>
                                <div>
                                    <label className={labelCls}>Intt. To Pay <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-400" />
                                        <Input value={inttToPay} onChange={e => setInttToPay(e.target.value)}
                                            placeholder="0.00" className={`${inputCls} pl-6 font-mono text-right font-black text-emerald-700 bg-emerald-50 border-emerald-200`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── FD Records Table ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Landmark size={11} className="text-slate-400" />
                                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member FD Records</span>
                                </div>
                                <span className="fz-mini font-black text-slate-400 uppercase">{data.length} record(s) — click row to select</span>
                            </div>
                            <Table
                                columns={columns}
                                dataSource={data}
                                pagination={false}
                                size="small"
                                className="fdiv-table"
                                rowKey="key"
                                loading={loading}
                                scroll={{ y: 180 }}
                                onRow={record => ({ onClick: () => handleCertSelect(record.certNo), className: 'cursor-pointer' })}
                                locale={{ emptyText: <span className="fz-tiny text-slate-400 py-4 block text-center font-bold uppercase">Enter member no to load FD records</span> }}
                                rowClassName={record => record.certNo === certNo ? 'fdiv-row-selected' : ''}
                            />
                        </div>

                        {/* ── Narration ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <FileText size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Narration</span>
                            </div>
                            <div className="p-3">
                                <TextArea value={narration} onChange={e => setNarration(e.target.value)}
                                    placeholder="Enter narration…" rows={2}
                                    className="fz-small font-medium bg-slate-50 border-slate-200 rounded resize-none" />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">FD Interest Voucher Posting</span>
                        {memberNo && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">Member: {memberNo}</span>
                            </>
                        )}
                        {certNo && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-amber-600">Cert: {certNo}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`fz-mini font-black uppercase tracking-wide px-2 py-0.5 rounded ${fdOption === 'interest' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {fdOption === 'interest' ? 'FD Interest' : 'FD Payment'}
                        </span>
                        <div className="flex items-center gap-1 text-indigo-500">
                            <Calendar size={9} />
                            <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Member Lookup Modal */}
            <Modal open={showLookupModal} onCancel={() => setShowLookupModal(false)} footer={null}
                width={1000} centered styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookupModal(false)} />
            </Modal>

            <style>{`
                .fdiv-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 10px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .fdiv-table .ant-table-tbody > tr > td { padding: 4px 10px !important; border-bottom: 1px solid #f1f5f9 !important; cursor: pointer; }
                .fdiv-table .ant-table-tbody > tr:hover > td { background: #eef2ff !important; }
                .fdiv-row-selected > td { background: #e0e7ff !important; }
                .fdiv-sel .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 11px !important; font-weight: 600 !important; }
                .fdiv-sel .ant-select-selection-item { line-height: 26px !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </ConfigProvider>
    );
};

export default FDInterestVoucherPosting;
