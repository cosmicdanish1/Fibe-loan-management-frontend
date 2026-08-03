import React, { useState } from 'react';
import { ConfigProvider, Select, message, Spin, theme as antdTheme } from 'antd';
import { Printer, User, Calendar, IndianRupee, FileText, RotateCcw, Hash, Percent, Search, Building, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import apiService from '../../../../../services/api';
import { getApiBaseUrl } from '../../../../../services/apiVersionConfig';

const { Option } = Select;

interface FormData {
  id?: number;
  memberNo: string;
  memberName: string;
  accountNumber: string;
  depositAmount: number;
  depositPeriod: string;
  interestRate: number;
  maturityDate: string;
  certificateNo: string;
}

const BLANK: FormData = {
  memberNo: '', memberName: '', accountNumber: '', depositAmount: 0,
  depositPeriod: '', interestRate: 0, maturityDate: '', certificateNo: '',
};

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10">{icon}</div>}
      {children}
    </div>
  </div>
);

const inputCls = (hasIcon = false) =>
  `w-full h-10 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors ${hasIcon ? 'pl-9' : 'px-3'}`;

const FixedDepositCertificatePrinting: React.FC = () => {
  const [form, setForm] = useState<FormData>(BLANK);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [fdAccounts, setFdAccounts] = useState<any[]>([]);

  const set = (field: keyof FormData, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSearch = async () => {
    if (!form.memberNo) { message.warning('Enter a member number first'); return; }
    setLoading(true);
    try {
      const resp = await apiService.getMemberDeposits(form.memberNo);
      if (resp.success) {
        const fds = resp.data?.fixedDeposits || [];
        setFdAccounts(fds);
        if (fds.length === 0) message.info('No active FD accounts found');
        else message.success(`${fds.length} FD account(s) found`);
      } else {
        message.error(resp.message || 'Member not found');
      }
    } catch { message.error('Server connection error'); }
    finally { setLoading(false); }
  };

  const handleAccountSelect = (accId: number) => {
    const acc = fdAccounts.find(a => a.id === accId);
    if (!acc) return;
    set('id', acc.id);
    setForm(prev => ({
      ...prev,
      id: acc.id,
      accountNumber: acc.accountNumber,
      depositAmount: Number(acc.principalAmount ?? acc.fdamount ?? 0),
      interestRate: Number(acc.interestRate ?? acc.rate ?? 0),
      depositPeriod: `${acc.tenureMonths ?? acc.depperiod ?? ''} Months`,
      maturityDate: acc.maturityDate ?? acc.matdate ?? '',
      certificateNo: (acc.accountNumber || '').replace('FD', 'CERT'),
    }));
  };

  const handlePrint = async () => {
    if (!form.id) { message.warning('Select an FD account first'); return; }
    setPrinting(true);
    try {
      const resp = await apiService.generateFDCertificate(form.id);
      if (resp.success) {
        message.success('Certificate generated');
        if (resp.data?.downloadUrl) {
          const base = (await getApiBaseUrl()).replace(/\/api\/v\d+$/, '');
          const a = document.createElement('a');
          a.href = `${base}${resp.data.downloadUrl}`;
          a.setAttribute('download', resp.data.fileName || 'fd-certificate.pdf');
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
      } else { message.error(resp.message || 'Print failed'); }
    } catch { message.error('Print error'); }
    finally { setPrinting(false); }
  };

  const handleClear = () => { setForm(BLANK); setFdAccounts([]); };

  return (
    <ConfigProvider theme={{ algorithm: antdTheme.darkAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 8, colorBgContainer: '#1e293b', colorBorder: '#334155' } }}>
      <div className="h-screen flex flex-col overflow-hidden bg-[#0f172a] text-slate-100 font-sans">

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30"><Printer size={18} className="text-white" /></div>
            <div>
              <h1 className="text-sm font-black text-white uppercase">Fixed Deposit Certificate Printing</h1>
              <p className="fz-small text-slate-400 mt-0.5">Search member, select FD account and print certificate</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClear}
              className="h-9 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 active:scale-95">
              <RotateCcw size={13} /> Clear
            </button>
            <button onClick={handlePrint} disabled={printing || !form.id}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
              <Printer size={13} /> {printing ? 'Generating…' : 'Print Certificate'}
            </button>
          </div>
        </motion.div>

        {/* Workspace */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-4">

          {/* Form Panel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="md:w-5/12 overflow-auto space-y-4 pr-1">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-700 flex items-center gap-2.5">
                <FileText size={15} className="text-indigo-400" />
                <h2 className="text-xs font-black text-white uppercase tracking-wider">Account Details</h2>
                {form.id && <span className="ml-auto fz-small bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold"><CheckCircle2 size={9} /> Ready</span>}
              </div>
              <div className="p-5 space-y-4">
                {/* Member search */}
                <Field label="Member Number" icon={<User size={14} />}>
                  <div className="flex gap-2">
                    <input value={form.memberNo} onChange={e => set('memberNo', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="e.g. 1234" className={`${inputCls(true)} flex-1`} />
                    <button onClick={handleSearch} disabled={loading}
                      className="h-10 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50">
                      {loading ? <Spin size="small" /> : <Search size={14} />}
                    </button>
                  </div>
                </Field>

                {/* FD Account Select */}
                <Field label="FD Account">
                  <Select value={form.id} onChange={handleAccountSelect} className="w-full"
                    style={{ height: 40 }} placeholder="Select FD account" loading={loading}>
                    {fdAccounts.map(acc => (
                      <Option key={acc.id} value={acc.id}>
                        {acc.accountNumber} — ₹{Number(acc.principalAmount ?? acc.fdamount ?? 0).toLocaleString('en-IN')}
                      </Option>
                    ))}
                  </Select>
                </Field>

                {/* Certificate No */}
                <Field label="Certificate Number" icon={<Hash size={14} />}>
                  <input value={form.certificateNo} onChange={e => set('certificateNo', e.target.value)}
                    placeholder="CERT-0000" className={inputCls(true)} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Principal (₹)" icon={<IndianRupee size={14} />}>
                    <input type="number" value={form.depositAmount} onChange={e => set('depositAmount', parseFloat(e.target.value) || 0)}
                      className={inputCls(true)} />
                  </Field>
                  <Field label="Interest Rate (%)" icon={<Percent size={14} />}>
                    <input type="number" value={form.interestRate} onChange={e => set('interestRate', parseFloat(e.target.value) || 0)}
                      className={`${inputCls(true)} text-right pr-3`} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tenure / Period">
                    <input value={form.depositPeriod} onChange={e => set('depositPeriod', e.target.value)}
                      placeholder="12 Months" className={inputCls()} />
                  </Field>
                  <Field label="Maturity Date" icon={<Calendar size={14} />}>
                    <input type="date" value={form.maturityDate} onChange={e => set('maturityDate', e.target.value)}
                      className={inputCls(true)} />
                  </Field>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Certificate Preview */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="md:w-7/12 flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/40">
            <p className="fz-small text-slate-500 uppercase tracking-widest mb-4 font-bold">Certificate Preview</p>
            <motion.div
              animate={{ y: form.id ? 0 : 4 }} transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-full max-w-sm bg-white shadow-2xl rounded-md overflow-hidden p-8 border-8 border-double border-slate-800 relative print:shadow-none">
              <div className="absolute inset-1 border border-slate-100 pointer-events-none opacity-40" />
              <div className="relative z-10 text-slate-900">
                <div className="text-center mb-5 pb-5 border-b border-slate-100">
                  <div className="bg-slate-900 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 shadow">
                    <Building size={18} className="text-white" />
                  </div>
                  <h1 className="text-base font-black tracking-widest uppercase text-slate-900">Deposit Certificate</h1>
                  <p className="fz-tiny text-slate-400 font-bold uppercase tracking-widest">Co-operative Credit Society</p>
                </div>
                <div className="grid grid-cols-2 gap-y-4 fz-caption">
                  <div>
                    <span className="fz-mini font-black text-slate-400 uppercase tracking-widest block">Cert No</span>
                    <p className="font-mono font-black text-slate-900">{form.certificateNo || '— —'}</p>
                  </div>
                  <div>
                    <span className="fz-mini font-black text-slate-400 uppercase tracking-widest block">Member</span>
                    <p className="font-bold text-slate-700">{form.memberNo || '— —'}</p>
                  </div>
                  <div className="col-span-2 border-t border-slate-100 pt-3">
                    <span className="fz-mini font-black text-slate-400 uppercase tracking-widest block">Principal Amount</span>
                    <p className="text-xl font-black text-indigo-600">₹ {form.depositAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className="fz-mini font-black text-slate-400 uppercase tracking-widest block">Rate</span>
                    <p className="font-black text-slate-900">{form.interestRate}%</p>
                  </div>
                  <div>
                    <span className="fz-mini font-black text-slate-400 uppercase tracking-widest block">Maturity</span>
                    <p className="font-black text-slate-900 uppercase fz-small">
                      {form.maturityDate ? dayjs(form.maturityDate).format('DD MMM YYYY') : '— —'}
                    </p>
                  </div>
                </div>
                <div className="mt-10 flex justify-between px-2">
                  <div className="text-center"><div className="w-20 h-px bg-slate-200 mb-1" /><span className="fz-mini font-black text-slate-400 uppercase">Secretary</span></div>
                  <div className="text-center"><div className="w-20 h-px bg-slate-800 mb-1" /><span className="fz-mini font-black text-slate-900 uppercase">Authorized</span></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default FixedDepositCertificatePrinting;
