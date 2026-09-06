// page/BalanceTransfer.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Database, IndianRupee, Calendar, CheckCircle,
  ShieldCheck, Send, RotateCcw, Building2, Info,
  ChevronDown, ShieldAlert,
} from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

interface HeadOption { code: string; headName: string; }

interface BalanceTransferProps {
  className?: string;
}

interface TransferData {
  fromAccount: string;
  toAccount: string;
  amount: string;
  transferDate: string;
  description: string;
}

interface FormErrors {
  fromAccount?: string;
  toAccount?: string;
  amount?: string;
  transferDate?: string;
  description?: string;
  general?: string;
}

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const fmtAmount = (n: string | number) =>
  '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY: TransferData = {
  fromAccount: '', toAccount: '', amount: '',
  transferDate: dayjs().format('YYYY-MM-DD'), description: '',
};

const BalanceTransfer: React.FC<BalanceTransferProps> = ({ className = '' }) => {
  const [transferData, setTransferData] = useState<TransferData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastTransfer, setLastTransfer] = useState<TransferData | null>(null);
  const [headOptions, setHeadOptions] = useState<HeadOption[]>([]);
  const [loadingHeads, setLoadingHeads] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'from' | 'to' | null>(null);
  const [glQuery, setGlQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHeads = async () => {
      setLoadingHeads(true);
      try {
        const res = await apiService.getHeadMasters();
        if (res.success && Array.isArray(res.data)) {
          setHeadOptions(res.data as HeadOption[]);
        }
      } catch { /* silent — dropdown just stays empty, no hard crash */ }
      finally { setLoadingHeads(false); }
    };
    loadHeads();
  }, []);

  useEffect(() => {
    if (!openDropdown) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-gl-select]')) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [openDropdown]);

  const updateField = (field: keyof TransferData, value: string) => {
    setTransferData(prev => ({ ...prev, [field]: value }));
    const errorKey = field as keyof FormErrors;
    if (errors[errorKey] || errors.general) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[errorKey];
        delete next.general;
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const e: FormErrors = {};
    if (!transferData.fromAccount.trim()) e.fromAccount = 'Select a source GL head';
    if (!transferData.toAccount.trim()) e.toAccount = 'Select a destination GL head';
    if (transferData.fromAccount && transferData.toAccount &&
        transferData.fromAccount === transferData.toAccount)
      e.toAccount = 'Source and destination must be different';
    if (!transferData.amount.trim()) {
      e.amount = 'Amount is required';
    } else if (isNaN(Number(transferData.amount)) || Number(transferData.amount) <= 0) {
      e.amount = 'Enter a valid positive amount';
    }
    if (!transferData.transferDate) e.transferDate = 'Date is required';
    if (!transferData.description.trim()) e.description = 'Description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isFormValid = (): boolean =>
    !!(transferData.fromAccount.trim() && transferData.toAccount.trim() &&
       transferData.fromAccount !== transferData.toAccount &&
       transferData.amount.trim() && !isNaN(Number(transferData.amount)) &&
       Number(transferData.amount) > 0 && transferData.transferDate &&
       transferData.description.trim());

  const checksPassed = (): number => {
    const { fromAccount, toAccount, amount, transferDate, description } = transferData;
    return [
      !!fromAccount,
      !!(toAccount && toAccount !== fromAccount),
      !!(amount && !isNaN(Number(amount)) && Number(amount) > 0),
      !!transferDate,
      !!description.trim(),
    ].filter(Boolean).length;
  };

  const headLabel = (code: string): string => {
    const h = headOptions.find(x => x.code === code);
    return h ? `${h.code} — ${h.headName}` : code;
  };

  const filteredHeads = (() => {
    const q = glQuery.trim().toLowerCase();
    if (!q) return headOptions;
    return headOptions.filter(h => h.code.toLowerCase().includes(q) || h.headName.toLowerCase().includes(q));
  })();

  const handleReset = () => {
    setTransferData({ ...EMPTY, transferDate: dayjs().format('YYYY-MM-DD') });
    setErrors({});
    setOpenDropdown(null);
    setGlQuery('');
  };

  const openConfirm = () => {
    if (!validateForm()) return;
    setShowConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await apiService.manualBalanceTransfer({
        ...transferData,
        amount: parseFloat(transferData.amount),
      });

      if (response.success) {
        setLastTransfer({ ...transferData });
        setShowConfirm(false);
        setShowSuccess(true);
      } else {
        setShowConfirm(false);
        setErrors({ general: response.error || 'Transfer failed. Please try again.' });
      }
    } catch (err: any) {
      setShowConfirm(false);
      setErrors({ general: err?.message || 'Balance server unreachable. Check connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setLastTransfer(null);
    handleReset();
  };

  usePageToolbarActions({
    onSave: openConfirm,
    saveLabel: 'Process',
    saveEnabled: !(!isFormValid() || isLoading),
  });

  const toggleDropdown = (which: 'from' | 'to') => {
    setOpenDropdown(prev => (prev === which ? null : which));
    setGlQuery('');
  };

  const pickHead = (which: 'from' | 'to', code: string) => {
    updateField(which === 'from' ? 'fromAccount' : 'toAccount', code);
    setOpenDropdown(null);
    setGlQuery('');
  };

  const statusLabel = isFormValid() ? 'Ready to process' : 'Incomplete';
  const done = checksPassed();

  // ── Success Screen ──
  if (showSuccess && lastTransfer) {
    return (
      <div className={`bt-app h-screen flex items-center justify-center bg-[#0E1116] p-6 font-sans ${className}`}>
        <div className="bt-card w-full max-w-[420px] bg-[#151A21] border border-[#232B35] rounded-xl overflow-hidden">
          <div className="px-6 pt-8 pb-6 text-center border-b border-[#232B35]">
            <div className="mx-auto mb-4 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center" style={{ width: 52, height: 52 }}>
              <CheckCircle size={24} className="text-[#34D399]" strokeWidth={2.2} />
            </div>
            <h2 className="fz-heading font-semibold text-[#F2F5F8]">Transfer complete</h2>
            <p className="fz-caption text-[#7C8896] mt-1.5">
              Posted to the ledger on {dayjs(lastTransfer.transferDate).format('DD MMM YYYY')}
            </p>
            <div className="font-mono text-[26px] font-semibold text-[#34D399] mt-4">
              {fmtAmount(lastTransfer.amount)}
            </div>
          </div>
          <div className="px-6 py-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-4 fz-caption">
              <span className="text-[#7C8896]">From</span>
              <span className="text-[#C7D0D9] text-right">{headLabel(lastTransfer.fromAccount)}</span>
            </div>
            <div className="flex items-start justify-between gap-4 fz-caption">
              <span className="text-[#7C8896]">To</span>
              <span className="text-[#C7D0D9] text-right">{headLabel(lastTransfer.toAccount)}</span>
            </div>
            <div className="flex items-start justify-between gap-4 fz-caption">
              <span className="text-[#7C8896] shrink-0">Description</span>
              <span className="text-[#C7D0D9] text-right">{lastTransfer.description}</span>
            </div>
          </div>
          <div className="px-6 pb-5">
            <button onClick={handleSuccessClose}
              className="w-full h-9 bg-[#10B981] hover:bg-[#34D399] text-[#04231A] border-none rounded-lg fz-body font-semibold cursor-pointer transition-colors">
              Done
            </button>
          </div>
        </div>
        <style>{`
          /* ── Balance Transfer — dark mode ── */
          html.dark .bt-app { background-color: #000000 !important; color: #f5f5f7 !important; }
          html.dark .bt-app .bg-\\[\\#0E1116\\] { background-color: #000000 !important; }
          html.dark .bt-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
          html.dark .bt-app [class*="border-[#232B35]"] { border-color: rgba(255,255,255,.07) !important; }
          html.dark .bt-app [class*="text-[#F2F5F8]"] { color: #ffffff !important; }
          html.dark .bt-app [class*="text-[#7C8896]"] { color: #8e8e93 !important; }
          html.dark .bt-app [class*="text-[#C7D0D9]"] { color: #f5f5f7 !important; }
        `}</style>
      </div>
    );
  }

  // ── Main Form ──
  return (
    <div ref={rootRef} className={`bt-app h-screen flex flex-col bg-[#0E1116] text-[#E6EAEF] font-sans overflow-hidden ${className}`}>

      <div className="bt-content flex-1 overflow-auto px-5 pt-5 pb-4">
        <div className="max-w-[1080px] mx-auto flex flex-col gap-3.5">

          {/* Title row */}
          <div className="flex items-end justify-between gap-5 px-0.5">
            <div>
              <h1 className="fz-heading font-semibold text-[#F2F5F8]" style={{ fontSize: 19 }}>Balance Transfer</h1>
              <p className="fz-caption text-[#7C8896] mt-1">Move funds between general ledger heads. Entries post to the ledger immediately.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleReset} disabled={isLoading}
                className="h-8 px-3.5 inline-flex items-center gap-1.5 bg-transparent text-[#9AA6B2] border border-[#2A333F] rounded-lg fz-caption font-medium cursor-pointer transition-colors hover:bg-[#171E26] hover:text-[#E6EAEF] hover:border-[#3A4550] disabled:opacity-50">
                <RotateCcw size={13} /> Reset
              </button>
              <button onClick={openConfirm} disabled={!isFormValid() || isLoading}
                className="h-8 px-4 inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#34D399] text-[#04231A] border-none rounded-lg fz-caption font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={13} /> Process transfer
              </button>
              <button onClick={closeWindow} title="Close"
                className="h-8 w-8 inline-flex items-center justify-center bg-transparent text-[#7C8896] border border-[#2A333F] rounded-lg cursor-pointer transition-colors hover:bg-[#B4232C] hover:text-white hover:border-[#B4232C]">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* General error */}
          {errors.general && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#F87171]/10 border border-[#F87171]/30 rounded-lg">
              <ShieldAlert size={15} className="text-[#F87171] shrink-0" />
              <span className="fz-caption text-[#FCA5A5] font-medium">{errors.general}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px] gap-3.5 items-start">

            {/* Transfer details card */}
            <div className="bt-card min-w-0 bg-[#151A21] border border-[#232B35] rounded-xl overflow-hidden">
              <div className="py-3 border-b border-[#232B35] flex items-center gap-2.5" style={{ paddingLeft: 18, paddingRight: 18 }}>
                <Database size={14} className="text-[#10B981]" />
                <h2 className="fz-body font-semibold text-[#E6EAEF]">Transfer details</h2>
                <span className="ml-auto fz-mini font-medium tracking-widest uppercase text-[#5B6775]">Step 1 of 2</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ padding: 18 }}>

                {/* From account */}
                <div className="min-w-0 flex flex-col gap-1.5 relative" data-gl-select>
                  <label className="fz-mini font-semibold tracking-widest uppercase text-[#7C8896]">From account (GL head)</label>
                  <div onClick={() => toggleDropdown('from')}
                    className="h-10 px-3 flex items-center gap-2.5 bg-[#0F141A] border border-[#2A333F] rounded-lg cursor-pointer transition-colors hover:border-[#3A4550]">
                    <Database size={14} className="text-[#5B6775] shrink-0" />
                    <span className="flex-1 fz-body overflow-hidden text-ellipsis whitespace-nowrap">
                      {transferData.fromAccount ? headLabel(transferData.fromAccount) : 'Select source GL head'}
                    </span>
                    <ChevronDown size={13} className="text-[#5B6775] shrink-0" />
                  </div>
                  {openDropdown === 'from' && (
                    <div className="absolute top-[72px] left-0 right-0 z-40 bg-[#141A21] border border-[#2A333F] rounded-lg shadow-2xl overflow-hidden">
                      <div className="p-2 border-b border-[#232B35]">
                        <input value={glQuery} onChange={e => setGlQuery(e.target.value)} placeholder="Search code or head name" autoFocus
                          className="w-full h-8 px-2.5 bg-[#0F141A] border border-[#2A333F] rounded-md text-[#E6EAEF] fz-caption outline-none" />
                      </div>
                      <div className="max-h-[216px] overflow-auto p-1">
                        {loadingHeads && <div className="px-2.5 py-2 fz-caption text-[#5B6775]">Loading GL heads…</div>}
                        {!loadingHeads && filteredHeads.length === 0 && <div className="px-2.5 py-2 fz-caption text-[#5B6775]">No matching GL heads</div>}
                        {filteredHeads.map(h => (
                          <div key={h.code} onClick={() => pickHead('from', h.code)}
                            className="px-2.5 py-2 rounded-md cursor-pointer flex items-baseline gap-2.5 hover:bg-[#1C242E]">
                            <span className="font-mono fz-caption text-[#34D399] font-medium">{h.code}</span>
                            <span className="fz-caption text-[#C7D0D9] overflow-hidden text-ellipsis whitespace-nowrap">{h.headName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {errors.fromAccount && <span className="fz-caption text-[#F87171]">{errors.fromAccount}</span>}
                </div>

                {/* To account */}
                <div className="min-w-0 flex flex-col gap-1.5 relative" data-gl-select>
                  <label className="fz-mini font-semibold tracking-widest uppercase text-[#7C8896]">To account (GL head)</label>
                  <div onClick={() => toggleDropdown('to')}
                    className="h-10 px-3 flex items-center gap-2.5 bg-[#0F141A] border border-[#2A333F] rounded-lg cursor-pointer transition-colors hover:border-[#3A4550]">
                    <Database size={14} className="text-[#5B6775] shrink-0" />
                    <span className="flex-1 fz-body overflow-hidden text-ellipsis whitespace-nowrap">
                      {transferData.toAccount ? headLabel(transferData.toAccount) : 'Select destination GL head'}
                    </span>
                    <ChevronDown size={13} className="text-[#5B6775] shrink-0" />
                  </div>
                  {openDropdown === 'to' && (
                    <div className="absolute top-[72px] left-0 right-0 z-40 bg-[#141A21] border border-[#2A333F] rounded-lg shadow-2xl overflow-hidden">
                      <div className="p-2 border-b border-[#232B35]">
                        <input value={glQuery} onChange={e => setGlQuery(e.target.value)} placeholder="Search code or head name" autoFocus
                          className="w-full h-8 px-2.5 bg-[#0F141A] border border-[#2A333F] rounded-md text-[#E6EAEF] fz-caption outline-none" />
                      </div>
                      <div className="max-h-[216px] overflow-auto p-1">
                        {loadingHeads && <div className="px-2.5 py-2 fz-caption text-[#5B6775]">Loading GL heads…</div>}
                        {!loadingHeads && filteredHeads.length === 0 && <div className="px-2.5 py-2 fz-caption text-[#5B6775]">No matching GL heads</div>}
                        {filteredHeads.map(h => (
                          <div key={h.code} onClick={() => pickHead('to', h.code)}
                            className="px-2.5 py-2 rounded-md cursor-pointer flex items-baseline gap-2.5 hover:bg-[#1C242E]">
                            <span className="font-mono fz-caption text-[#34D399] font-medium">{h.code}</span>
                            <span className="fz-caption text-[#C7D0D9] overflow-hidden text-ellipsis whitespace-nowrap">{h.headName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {errors.toAccount && <span className="fz-caption text-[#F87171]">{errors.toAccount}</span>}
                </div>

                {/* Amount */}
                <div className="min-w-0 flex flex-col gap-1.5">
                  <label className="fz-mini font-semibold tracking-widest uppercase text-[#7C8896]">Amount</label>
                  <div className="h-10 flex items-center bg-[#0F141A] border border-[#2A333F] rounded-lg overflow-hidden">
                    <span className="w-9 h-full flex items-center justify-center text-[#7C8896] border-r border-[#232B35]">
                      <IndianRupee size={13} />
                    </span>
                    <input type="number" step="0.01" min="0"
                      value={transferData.amount}
                      onChange={e => updateField('amount', e.target.value)}
                      placeholder="0.00"
                      className="font-mono flex-1 min-w-0 h-full px-3 bg-transparent border-none outline-none text-[#F2F5F8] fz-body font-medium" />
                  </div>
                  {errors.amount && <span className="fz-caption text-[#F87171]">{errors.amount}</span>}
                </div>

                {/* Transfer date */}
                <div className="min-w-0 flex flex-col gap-1.5">
                  <label className="fz-mini font-semibold tracking-widest uppercase text-[#7C8896]">Transfer date</label>
                  <div className="h-10 flex items-center bg-[#0F141A] border border-[#2A333F] rounded-lg px-3 gap-2.5">
                    <Calendar size={14} className="text-[#5B6775] shrink-0" />
                    <input type="date" value={transferData.transferDate} onChange={e => updateField('transferDate', e.target.value)}
                      className="font-mono flex-1 min-w-0 h-full bg-transparent border-none outline-none text-[#F2F5F8] fz-caption"
                      style={{ colorScheme: 'dark' }} />
                  </div>
                  {errors.transferDate && <span className="fz-caption text-[#F87171]">{errors.transferDate}</span>}
                </div>

                {/* Description */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between">
                    <label className="fz-mini font-semibold tracking-widest uppercase text-[#7C8896]">Description</label>
                    <span className="fz-mini text-[#5B6775]">{transferData.description.length}/240</span>
                  </div>
                  <textarea value={transferData.description}
                    onChange={e => updateField('description', e.target.value.slice(0, 240))}
                    rows={3}
                    placeholder="Purpose of transfer — e.g. reallocation of Q3 maintenance budget"
                    className="w-full px-3 py-2.5 bg-[#0F141A] border border-[#2A333F] rounded-lg text-[#E6EAEF] fz-body outline-none resize-none leading-relaxed" />
                  {errors.description && <span className="fz-caption text-[#F87171]">{errors.description}</span>}
                </div>
              </div>
            </div>

            {/* Right column: review + note */}
            <div className="flex flex-col gap-3.5">
              <div className="bt-card bg-[#151A21] border border-[#232B35] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#232B35] flex items-center justify-between">
                  <h2 className="fz-body font-semibold text-[#E6EAEF]">Review</h2>
                  <span className="px-2.5 py-0.5 rounded-full fz-mini font-semibold tracking-widest uppercase bg-[#10B981]/[.12] text-[#34D399]">
                    {statusLabel}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#0F141A] border border-[#2A333F] flex items-center justify-center shrink-0">
                        <Database size={14} className="text-[#7C8896]" />
                      </div>
                      <div className="min-w-0">
                        <div className="fz-mini font-semibold tracking-widest uppercase text-[#5B6775]">Source</div>
                        <div className="fz-caption text-[#C7D0D9] mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                          {transferData.fromAccount ? headLabel(transferData.fromAccount) : 'Select source GL head'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 py-1.5 pl-[15px]">
                      <div className="w-0.5 h-[26px]" style={{ background: 'linear-gradient(#2A333F, #10B981)' }} />
                      <span className="px-2 py-0.5 rounded fz-mini font-semibold tracking-widest uppercase bg-[#0F141A] border border-[#2A333F] text-[#7C8896]">In transit</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/[.35] flex items-center justify-center shrink-0">
                        <Database size={14} className="text-[#34D399]" />
                      </div>
                      <div className="min-w-0">
                        <div className="fz-mini font-semibold tracking-widest uppercase text-[#5B6775]">Destination</div>
                        <div className="fz-caption text-[#C7D0D9] mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                          {transferData.toAccount ? headLabel(transferData.toAccount) : 'Select destination GL head'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[#232B35] flex items-baseline justify-between">
                    <span className="fz-mini font-semibold tracking-widest uppercase text-[#7C8896]">Amount</span>
                    <span className="font-mono text-[20px] font-semibold text-[#F2F5F8]">
                      {transferData.amount && Number(transferData.amount) > 0 ? fmtAmount(transferData.amount) : '₹0.00'}
                    </span>
                  </div>

                  <div className="mt-3.5 flex flex-col gap-1.5">
                    <div className="flex justify-between fz-mini font-semibold tracking-widest uppercase">
                      <span className="text-[#7C8896]">Verification status</span>
                      <span className="text-[#9AA6B2]">{done} of 5 checks</span>
                    </div>
                    <div className="w-full h-1 bg-[#232B35] rounded-full overflow-hidden">
                      <div className="h-full bg-[#10B981] rounded-full transition-all" style={{ width: `${(done / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bt-card flex gap-2.5 px-3.5 py-3 bg-[#151A21] border border-[#232B35] rounded-lg" style={{ borderLeft: '2px solid #10B981' }}>
                <Info size={15} className="text-[#34D399] shrink-0 mt-0.5" />
                <p className="fz-caption leading-relaxed text-[#9AA6B2]">
                  <span className="text-[#E6EAEF] font-semibold">Note:</span> Balance transfers are processed immediately and cannot be reversed from this screen. Verify both GL heads before proceeding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-6">
          <div className="bt-modal w-full max-w-[400px] bg-[#151A21] border border-[#2A333F] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <h3 className="fz-body font-semibold text-[#F2F5F8]">Confirm transfer</h3>
              <p className="fz-caption leading-relaxed text-[#9AA6B2] mt-2">This posts immediately to the ledger and cannot be undone here.</p>
            </div>
            <div className="mx-5 p-4 bg-[#0F141A] border border-[#232B35] rounded-lg flex flex-col gap-2.5">
              <div className="flex justify-between gap-3.5 fz-caption"><span className="text-[#7C8896]">Amount</span><span className="font-mono text-[#F2F5F8] font-semibold">{fmtAmount(transferData.amount || 0)}</span></div>
              <div className="flex justify-between gap-3.5 fz-caption"><span className="text-[#7C8896]">From</span><span className="text-[#C7D0D9] text-right">{headLabel(transferData.fromAccount)}</span></div>
              <div className="flex justify-between gap-3.5 fz-caption"><span className="text-[#7C8896]">To</span><span className="text-[#C7D0D9] text-right">{headLabel(transferData.toAccount)}</span></div>
              <div className="flex justify-between gap-3.5 fz-caption"><span className="text-[#7C8896]">Date</span><span className="font-mono text-[#C7D0D9]">{transferData.transferDate}</span></div>
            </div>
            <div className="px-5 pt-4 pb-5 flex gap-2.5 justify-end">
              <button onClick={() => setShowConfirm(false)} disabled={isLoading}
                className="h-9 px-4 bg-transparent text-[#9AA6B2] border border-[#2A333F] rounded-lg fz-caption font-medium cursor-pointer transition-colors hover:bg-[#171E26] hover:text-[#E6EAEF] disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleConfirmTransfer} disabled={isLoading}
                className="h-9 px-4 inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#34D399] text-[#04231A] border-none rounded-lg fz-caption font-semibold cursor-pointer transition-colors disabled:opacity-70">
                {isLoading && <div className="w-2.5 h-2.5 border border-[#04231A] border-t-transparent rounded-full animate-spin" />}
                {isLoading ? 'Processing…' : 'Process transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bt-footer shrink-0 h-[34px] flex items-center justify-between px-4 bg-[#0A0D12] border-t border-[#1B222B]">
        <div className="flex items-center gap-1.5">
          <Building2 size={12} className="text-[#5B6775]" />
          <span className="fz-mini text-[#6B7885]">Financial Systems</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-[#10B981]" />
          <span className="fz-mini text-[#6B7885]">Verified protocol · Session secured</span>
        </div>
      </div>

      <style>{`
        /* ── Balance Transfer — dark mode (Settings-panel palette trial) ── */
        html.dark .bt-app { background-color: #000000 !important; color: #f5f5f7 !important; }
        html.dark .bt-app [class*="bg-[#0E1116]"] { background-color: #000000 !important; }
        html.dark .bt-content { background-color: #000000 !important; }
        html.dark .bt-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .bt-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .bt-modal { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        /* Borders */
        html.dark .bt-app [class*="border-[#232B35]"] { border-color: rgba(255,255,255,.07) !important; }
        html.dark .bt-app [class*="border-[#2A333F]"] { border-color: rgba(255,255,255,.08) !important; }
        html.dark .bt-app [class*="border-[#1B222B]"] { border-color: rgba(255,255,255,.08) !important; }
        html.dark .bt-app [class*="hover:border-[#3A4550]"]:hover { border-color: rgba(255,255,255,.15) !important; }
        /* Inputs / input-like trigger boxes / dropdown panels */
        html.dark .bt-app input,
        html.dark .bt-app textarea,
        html.dark .bt-app [class*="bg-[#0F141A]"],
        html.dark .bt-app [class*="bg-[#141A21]"] {
          background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .bt-app [class*="hover:bg-[#1C242E]"]:hover { background-color: rgba(255,255,255,.08) !important; }
        html.dark .bt-app [class*="hover:bg-[#171E26]"]:hover { background-color: rgba(255,255,255,.08) !important; }
        /* Text colours */
        html.dark .bt-app [class*="text-[#F2F5F8]"] { color: #ffffff !important; }
        html.dark .bt-app [class*="text-[#E6EAEF]"] { color: #f5f5f7 !important; }
        html.dark .bt-app [class*="text-[#C7D0D9]"] { color: #f5f5f7 !important; }
        html.dark .bt-app [class*="text-[#9AA6B2]"] { color: #8e8e93 !important; }
        html.dark .bt-app [class*="text-[#7C8896]"] { color: #8e8e93 !important; }
        html.dark .bt-app [class*="text-[#6B7885]"] { color: #71717a !important; }
        html.dark .bt-app [class*="text-[#5B6775]"] { color: #71717a !important; }
        html.dark .bt-app [class*="hover:text-[#E6EAEF]"]:hover { color: #f5f5f7 !important; }
        /* Secondary buttons (Reset / Close / Cancel) — leave the green primary action button untouched */
        html.dark .bt-app button[class*="border-[#2A333F]"][class*="bg-transparent"] {
          background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important;
        }
      `}</style>
    </div>
  );
};

export default BalanceTransfer;
