import React, { useState } from 'react';
import { ConfigProvider, message, Spin, theme as antdTheme } from 'antd';
import { Printer, User, Calendar, IndianRupee, RotateCcw, Hash, Share2, ArrowRightLeft, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import apiService from '../../../../../services/api';

interface ShareCertificateForm {
  memberNo: string;
  transactionDate: string;
  certificateDate: string;
  shareAmount: number;
  shareValue: number;
  noOfShares: number;
  certificateNo: string;
  distFromNo: string;
  distUptoNo: string;
}

const BLANK: ShareCertificateForm = {
  memberNo: '', transactionDate: '', certificateDate: '',
  shareAmount: 0, shareValue: 0, noOfShares: 0,
  certificateNo: '', distFromNo: '', distUptoNo: '',
};

const inputCls = (hasIcon = false) =>
  `w-full h-10 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors ${hasIcon ? 'pl-9 pr-3' : 'px-3'}`;

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10">{icon}</div>}
      {children}
    </div>
  </div>
);

const ShareCertificatePrinting: React.FC = () => {
  const [form, setForm] = useState<ShareCertificateForm>(BLANK);
  const [memberName, setMemberName] = useState('');
  const [fetching, setFetching] = useState(false);

  const set = (field: keyof ShareCertificateForm, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const fetchMemberData = async () => {
    if (!form.memberNo.trim()) return;
    setFetching(true);
    try {
      const resp = await apiService.getShareCertificate({ memberNo: form.memberNo.trim(), certificateNo: form.certificateNo || undefined });
      if (resp.success && resp.data) {
        const d = resp.data as any;
        setMemberName(d.memberName || '');
        if (d.shareBalance != null) set('shareAmount', d.shareBalance);
      } else {
        message.warning('Member not found');
        setMemberName('');
      }
    } catch { message.error('Failed to fetch member data'); }
    finally { setFetching(false); }
  };

  const handlePrint = () => {
    if (!form.memberNo.trim() || !memberName) {
      message.warning('Search for a member before printing');
      return;
    }
    window.print();
  };

  const handleClear = () => { setForm(BLANK); setMemberName(''); };

  return (
    <ConfigProvider theme={{ algorithm: antdTheme.darkAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 8, colorBgContainer: '#1e293b', colorBorder: '#334155' } }}>
      <div className="scp-app h-screen flex flex-col overflow-hidden bg-[#0f172a] text-slate-100 font-sans print:bg-white">

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="scp-header print:hidden px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-500/30"><Share2 size={18} className="text-white" /></div>
            <div>
              <h1 className="text-sm font-black text-white uppercase">Share Certificate Printing</h1>
              <p className="fz-small text-slate-400 mt-0.5">Enter share details and print the share certificate</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClear}
              className="h-9 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 active:scale-95">
              <RotateCcw size={13} /> Clear
            </button>
            <button onClick={handlePrint}
              className="h-9 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95">
              <Printer size={13} /> Print Certificate
            </button>
          </div>
        </motion.div>

        {/* Workspace */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-4 print:p-0">

          {/* Form Panel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="print:hidden md:w-[42%] overflow-auto space-y-4 pr-1">
            <div className="scp-card rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-700 flex items-center gap-2.5">
                <Share2 size={15} className="text-emerald-400" />
                <h2 className="text-xs font-black text-white uppercase tracking-wider">Share Details</h2>
              </div>
              <div className="p-5 space-y-4">

                {/* Member No */}
                <Field label="Member Number" icon={<User size={14} />}>
                  <input value={form.memberNo} onChange={e => set('memberNo', e.target.value)}
                    onBlur={fetchMemberData}
                    suffix={fetching ? <Spin size="small" /> : undefined}
                    placeholder="e.g. 1234" className={inputCls(true)} />
                  {fetching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spin size="small" /></div>}
                  {memberName && <p className="text-xs font-bold text-emerald-400 mt-1.5">{memberName}</p>}
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Transaction Date" icon={<Calendar size={14} />}>
                    <input type="date" value={form.transactionDate} onChange={e => set('transactionDate', e.target.value)}
                      className={inputCls(true)} />
                  </Field>
                  <Field label="Certificate Date" icon={<Calendar size={14} />}>
                    <input type="date" value={form.certificateDate} onChange={e => set('certificateDate', e.target.value)}
                      className={inputCls(true)} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Share Amount (₹)" icon={<IndianRupee size={14} />}>
                    <input type="number" value={form.shareAmount} onChange={e => set('shareAmount', parseFloat(e.target.value) || 0)}
                      className={inputCls(true)} />
                  </Field>
                  <Field label="Face Value / Share (₹)" icon={<IndianRupee size={14} />}>
                    <input type="number" value={form.shareValue} onChange={e => set('shareValue', parseFloat(e.target.value) || 0)}
                      className={`${inputCls(true)} text-center`} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="No. of Shares">
                    <input type="number" value={form.noOfShares} onChange={e => set('noOfShares', parseFloat(e.target.value) || 0)}
                      className={`${inputCls()} text-center`} />
                  </Field>
                  <Field label="Certificate No." icon={<Hash size={14} />}>
                    <input value={form.certificateNo} onChange={e => set('certificateNo', e.target.value)}
                      className={`${inputCls(true)} font-mono text-emerald-300`} />
                  </Field>
                </div>

                <div className="pt-3 border-t border-slate-700 border-dashed">
                  <p className="text-xs text-slate-500 mb-3 font-semibold">Share Sequence Range</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="From No.">
                      <input value={form.distFromNo} onChange={e => set('distFromNo', e.target.value)}
                        className={inputCls()} placeholder="001" />
                    </Field>
                    <Field label="Upto No.">
                      <input value={form.distUptoNo} onChange={e => set('distUptoNo', e.target.value)}
                        className={inputCls()} placeholder="100" />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Certificate Preview */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="scp-preview-wrap print:hidden md:w-[58%] flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/40">
            <p className="fz-small text-slate-500 uppercase tracking-widest mb-4 font-bold">Certificate Preview</p>
            <div className="w-full max-w-md bg-white shadow-2xl rounded-sm overflow-hidden p-10 border-8 border-double border-slate-800 relative">
              <div className="absolute inset-2 border border-slate-100 pointer-events-none opacity-40" />
              <div className="relative z-10 text-slate-900">
                <div className="text-center mb-7 pb-7 border-b border-slate-100">
                  <div className="bg-slate-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl">
                    <Building size={22} className="text-white" />
                  </div>
                  <h1 className="text-lg font-black tracking-widest uppercase">Share Certificate</h1>
                  <p className="fz-tiny font-black text-slate-400 uppercase tracking-widest">Co-operative Credit Society</p>
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-8 fz-caption">
                  <div className="col-span-2 flex justify-between items-end border-b border-slate-100 pb-3">
                    <div>
                      <span className="fz-tiny font-black text-slate-400 uppercase tracking-widest block">Serial Number</span>
                      <p className="font-mono text-lg font-black text-slate-900">{form.certificateNo || 'SH-REF-000'}</p>
                    </div>
                    <div className="text-right">
                      <span className="fz-tiny font-black text-slate-400 uppercase tracking-widest block">Member</span>
                      <p className="font-black text-indigo-600 italic">{form.memberNo || '—'}</p>
                      {memberName && <p className="fz-small font-bold text-slate-600">{memberName}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="fz-tiny font-black text-slate-400 uppercase tracking-widest block">Total Capital</span>
                      <p className="text-2xl font-black text-slate-900">₹ {form.shareAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex gap-5">
                      <div>
                        <span className="fz-tiny font-black text-slate-400 uppercase tracking-widest block">Units</span>
                        <p className="font-black text-slate-900 text-base">{form.noOfShares || '—'}</p>
                      </div>
                      <div>
                        <span className="fz-tiny font-black text-slate-400 uppercase tracking-widest block">Face Value</span>
                        <p className="font-black text-slate-900 text-base">₹ {form.shareValue}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pl-6 border-l border-slate-100">
                    <div>
                      <span className="fz-tiny font-black text-slate-400 uppercase tracking-widest block">Share Range</span>
                      <div className="flex items-center gap-2 font-black text-indigo-600">
                        {form.distFromNo || '000'} <ArrowRightLeft size={12} /> {form.distUptoNo || '000'}
                      </div>
                    </div>
                    <div>
                      <span className="fz-tiny font-black text-slate-400 uppercase tracking-widest block">Certified On</span>
                      <p className="font-black text-slate-900 fz-small uppercase">
                        {form.certificateDate ? dayjs(form.certificateDate).format('DD MMM YYYY') : 'PENDING'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-14 flex justify-between px-3">
                  <div className="text-center"><div className="w-28 h-px bg-slate-200 mb-1.5" /><span className="fz-mini font-black text-slate-400 uppercase">Official Seal</span></div>
                  <div className="text-center"><div className="w-28 h-px bg-slate-900 mb-1.5" /><span className="fz-mini font-black text-slate-900 uppercase">Managing Director</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <style>{`
          /* ── Share Certificate Printing — dark mode (Settings-panel palette) ── */
          html.dark .scp-app { background-color: #000000 !important; color: #f5f5f7 !important; }
          html.dark .scp-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
          html.dark .scp-header .text-slate-400 { color: #8e8e93 !important; }
          html.dark .scp-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
          html.dark .scp-card .text-slate-400 { color: #8e8e93 !important; }
          html.dark .scp-card .text-slate-500 { color: #71717a !important; }
          /* Inputs (form panel only — certificate preview paper stays untouched) */
          html.dark .scp-card input,
          html.dark .scp-card select,
          html.dark .scp-card textarea {
            background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
          }
          html.dark .scp-card input.text-emerald-300 { color: #34d399 !important; }
          html.dark .scp-card label { color: #8e8e93 !important; }
          html.dark .scp-app .bg-slate-700 { background-color: rgba(255,255,255,.05) !important; }
          html.dark .scp-app .border-slate-600,
          html.dark .scp-app .border-slate-700 { border-color: rgba(255,255,255,.08) !important; }
          html.dark .scp-app .bg-slate-800 { background-color: #1c1c1e !important; }
          html.dark .scp-header button.bg-slate-700 { background-color: #1c1c1e !important; border: 1px solid rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
          html.dark .scp-app .text-emerald-400 { color: #34d399 !important; }
          /* Preview chrome (dashed wrapper) — the paper certificate itself is intentionally left light */
          html.dark .scp-preview-wrap { background-color: rgba(255,255,255,.03) !important; border-color: rgba(255,255,255,.08) !important; }
          html.dark .scp-preview-wrap > p.text-slate-500 { color: #71717a !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default ShareCertificatePrinting;
