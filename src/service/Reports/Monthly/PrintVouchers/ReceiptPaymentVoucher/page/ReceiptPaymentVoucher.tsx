import React, { useState, useEffect } from 'react';
import { apiService } from '../../../../../../services/api';
import {
  DatePicker, Select, Button, Spin, ConfigProvider, theme as antdTheme
} from 'antd';
import {
  Printer,
  Search,
  FileText,
  Wallet,
  ShieldCheck,
  User,
  CreditCard,
  Building2,
  Sun,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../../../store';
import { setInterfaceMode } from '../../../../../../store/slices/themeSlice';
import dayjs, { Dayjs } from 'dayjs';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

interface VoucherEntry {
  key: string;
  trans_no: number;
  head_code: string;
  head_name: string;
  narration: string;
  amount: number;
}

const ReceiptPaymentVoucher: React.FC = () => {
  const dispatch = useDispatch();
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' || (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => dispatch(setInterfaceMode(isDark ? 'light' : 'dark'));

  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [vchrType, setVchrType] = useState<string>('Receipt');
  const [mode, setMode] = useState<string>('Cash');
  const [memberNo, setMemberNo] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [narration, setNarration] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [bank, setBank] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<Dayjs | null>(null);
  const [voucherList, setVoucherList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<VoucherEntry[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  useEffect(() => {
    fetchVoucherList();
  }, []);

  const fetchVoucherList = async () => {
    try {
      const response = await apiService.getAllVoucherNos();
      if (response.success && Array.isArray(response.data)) {
        setVoucherList(response.data);
      }
    } catch (error) {
      console.error('Error fetching voucher list:', error);
    }
  };

  const handleVoucherSelect = async (value: string): Promise<void> => {
    setVoucherNo(value);
    if (!value) return;

    setIsLoading(true);
    try {
      const response = await apiService.getVoucherByNo(value);
      if (response.success && response.data) {
        const data = response.data;
        setDate(dayjs(data.trans_date));
        setVchrType(data.dr_cr);
        setMode(data.mode);
        setMemberNo(data.member_no ? data.member_no.toString() : '');
        setMemberName(data.member_name || '');
        setNarration(data.narration || '');
        setTotalAmount(data.total_amount || 0);

        if (data.mode === 'Cheque' || data.mode === 'Bank Transfer') {
          setChequeNo(data.cheque_no || '');
          setBank(data.bank_name || '');
          setChequeDate(data.cheque_date ? dayjs(data.cheque_date) : null);
        } else {
          setChequeNo('');
          setBank('');
          setChequeDate(null);
        }

        const mappedEntries = (data.entries || []).map((e: any, idx: number) => ({
          key: idx.toString(),
          trans_no: e.trans_no,
          head_code: e.head_code,
          head_name: e.head_name,
          narration: e.narration,
          amount: e.amount
        }));
        setEntries(mappedEntries);
      } else {
        await showDialog('warning', 'Not Found', 'Voucher not found');
      }
    } catch (error) {
      await showDialog('error', 'Error', 'Error fetching voucher');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handlePrint = () => window.print();

  const bg      = isDark ? 'bg-[#0f172a]'             : 'bg-gradient-to-br from-slate-50 to-indigo-50/30';
  const panel   = isDark ? 'bg-[#1e293b] border-[#334155]' : 'bg-white/90 border-slate-200/60';
  const panelHd = isDark ? 'bg-[#263148] border-[#334155]' : 'bg-gradient-to-r from-slate-50 to-indigo-50/50 border-slate-100';
  const text    = isDark ? 'text-slate-100'            : 'text-slate-800';
  const muted   = isDark ? 'text-slate-400'            : 'text-slate-500';
  const border  = isDark ? 'border-[#334155]'          : 'border-slate-200/60';
  const infoBox = isDark ? 'bg-[#1a2744] border-indigo-900/50' : 'bg-indigo-50 border-indigo-100';
  const moBox   = isDark ? 'bg-[#263148] border-[#334155]'    : 'bg-slate-50 border-slate-100';
  const chqBox  = isDark ? 'bg-[#1e293b] border-[#334155]'    : 'bg-white border-slate-200';
  const vHdBox  = isDark ? 'bg-[#263148] border-slate-600'    : 'bg-slate-50 border-slate-400';
  const tblHd   = isDark ? 'bg-[#1a2744] border-slate-600'    : 'bg-slate-200 border-slate-400';
  const tblBdr  = isDark ? 'border-slate-600'          : 'border-slate-300';
  const tblBdrH = isDark ? 'border-slate-600'          : 'border-slate-400';

  return (
    <ConfigProvider theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { colorPrimary: '#6366f1', borderRadius: 12 } }}>
    <div className={`h-screen flex flex-col ${bg} font-sans overflow-hidden`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 border-slate-200/60'} backdrop-blur-sm border-b px-4 py-2.5 flex items-center justify-between z-10 shadow-sm shrink-0`}>
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-2 rounded-xl text-white shadow-md">
            <Wallet size={16} />
          </div>
          <div>
            <h1 className={`fz-body font-black ${text} tracking-tight leading-none uppercase`}>Receipt/Payment Voucher</h1>
            <div className={`flex items-center gap-1.5 mt-0.5 fz-caption font-bold ${muted} uppercase tracking-wide leading-none`}>
              <ShieldCheck size={10} className="text-indigo-500" /> Voucher Print Archive
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme}
            className={`h-8 w-8 flex items-center justify-center rounded-lg border ${border} transition hover:border-indigo-500`}
            title={isDark ? 'Switch to Light' : 'Switch to Dark'}>
            {isDark ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} className="text-slate-500" />}
          </button>
          <Button
            icon={<Printer size={12} />}
            className="h-8 px-3 rounded-lg fz-caption font-bold uppercase tracking-wide border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all"
            onClick={handlePrint}
          >Print</Button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-hidden p-3 flex gap-3">
        {/* Sidebar */}
        <div className="w-[280px] flex flex-col gap-2 shrink-0 overflow-y-auto pr-1 select-none custom-scrollbar-indigo">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${panel} backdrop-blur-sm border rounded-xl overflow-hidden shadow-sm`}
          >
            <div className={`${panelHd} border-b px-4 py-2.5`}>
              <h3 className={`fz-caption font-black ${text} tracking-wide uppercase flex items-center gap-1.5`}>
                <Search size={12} className="text-indigo-500" />
                Search Voucher
              </h3>
            </div>

            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <label className={`fz-caption font-bold ${muted} uppercase tracking-tight`}>Voucher No</label>
                <Select
                  value={voucherNo}
                  onChange={handleVoucherSelect}
                  className="w-full voucher-select"
                  placeholder="Select Voucher"
                  showSearch
                  optionFilterProp="children"
                  loading={isLoading}
                  size="small"
                >
                  {voucherList.map(v => (
                    <Option key={v} value={v}>
                      <span className="font-bold fz-caption">#{v}</span>
                    </Option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className={`fz-caption font-bold ${muted} uppercase tracking-tight`}>Date</label>
                  <DatePicker
                    value={date}
                    onChange={setDate}
                    className="w-full h-9 rounded-lg fz-caption"
                    format="DD-MMM-YYYY"
                    size="small"
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <label className={`fz-caption font-bold ${muted} uppercase tracking-tight`}>Type</label>
                  <div className={`h-9 rounded-lg border flex items-center justify-center px-2 ${vchrType === 'Receipt' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                    <span className="fz-caption font-black uppercase">{vchrType}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`fz-caption font-bold ${muted} uppercase tracking-tight`}>Mode</label>
                <div className={`${moBox} p-2.5 rounded-lg border flex items-center gap-2`}>
                  <CreditCard size={14} className="text-indigo-500" />
                  <span className={`fz-caption font-bold ${text} uppercase`}>{mode || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`fz-caption font-bold ${muted} uppercase tracking-tight`}>Member</label>
                <div className={`${infoBox} rounded-lg p-3 border`}>
                  <div className="flex items-center gap-2 mb-1">
                    <User size={12} className="text-indigo-500" />
                    <span className="fz-caption font-bold text-indigo-400 uppercase">MB-{memberNo || 'N/A'}</span>
                  </div>
                  <div className={`fz-caption font-bold ${text} truncate`}>{memberName || 'No Member'}</div>
                </div>
              </div>

              {chequeNo && (
                <div className="space-y-1">
                  <label className={`fz-caption font-bold ${muted} uppercase tracking-tight`}>Cheque Details</label>
                  <div className={`${chqBox} border rounded-lg p-2.5 space-y-2`}>
                    <div className="flex items-center gap-2">
                      <Building2 size={11} className={muted} />
                      <span className={`fz-caption font-semibold ${text}`}>{bank}</span>
                    </div>
                    <div className={`fz-caption font-bold ${text}`}>#{chequeNo}</div>
                    <div className={`fz-caption ${muted}`}>{chequeDate?.format('DD-MMM-YYYY')}</div>
                  </div>
                </div>
              )}

              {totalAmount > 0 && (
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg p-3 text-white shadow-md">
                  <div className="fz-caption font-bold uppercase tracking-wide opacity-90 mb-0.5">Total Amount</div>
                  <div className="fz-heading font-black font-mono">₹{formatCurrency(totalAmount)}</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Report Panel */}
        <div className={`flex-1 ${panel} backdrop-blur-sm border rounded-xl shadow-sm flex flex-col overflow-hidden`}>
          <div className={`${panelHd} border-b px-4 py-2.5 flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-2">
              <div className={`${isDark ? 'bg-[#1e293b]' : 'bg-white'} p-1.5 rounded-lg shadow-sm border ${border}`}>
                <FileText size={14} className="text-indigo-500" />
              </div>
              <div>
                <h3 className={`fz-label font-extrabold ${text} uppercase tracking-wide leading-none`}>Voucher Preview</h3>
                <p className={`fz-caption font-semibold ${muted} uppercase mt-0.5 tracking-tight`}>
                  {voucherNo ? `Voucher #${voucherNo}` : 'Select voucher to preview'}
                </p>
              </div>
            </div>
          </div>

          <div className={`flex-1 overflow-auto p-3 custom-scrollbar-indigo ${isDark ? 'bg-[#1e293b]' : 'bg-white'}`}>
            <Spin spinning={isLoading} tip="Loading..." size="small">
              {entries.length > 0 ? (
                <div className="legacy-report-compact font-mono fz-caption">
                  {/* Company Header */}
                  <div className={`text-center mb-3 border-b border-dashed ${isDark ? 'border-slate-600' : 'border-slate-300'} pb-2`}>
                    <div className={`fz-label font-bold ${text}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                    <div className={`fz-caption ${muted}`}>Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                    <div className="fz-caption font-bold text-indigo-400 mt-1 uppercase">Print Voucher</div>
                  </div>

                  {/* Voucher Header Info */}
                  <div className={`border ${tblBdrH} mb-3 p-3 ${vHdBox}`}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 fz-caption">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-pink-500 w-24">Date</span>
                        <span className={`font-semibold ${text}`}>{date?.format('DD-MMM-YYYY')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-pink-500 w-24">Voucher No.</span>
                        <span className={`font-bold ${isDark ? 'text-indigo-300 bg-indigo-900/50' : 'text-blue-700 bg-blue-100'} px-2 py-0.5 rounded`}>{voucherNo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-pink-500 w-24">Vchr Type</span>
                        <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-red-700'} uppercase`}>{vchrType === 'Receipt' ? 'DEMAND' : 'PAYMENT'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-pink-500 w-24">Mode</span>
                        <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-red-700'} uppercase`}>{mode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-pink-500 w-24">Member No.</span>
                        <span className={`font-semibold ${text}`}>{memberNo || 'N/A'}</span>
                        <span className={`font-semibold ${text}`}>{memberName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-pink-500 w-24">Narration</span>
                        <span className={`font-semibold ${isDark ? 'text-rose-400' : 'text-red-700'}`}>{narration || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-pink-500 w-24">Cheque No</span>
                        <span className={`font-semibold ${text}`}>{chequeNo || '-'}</span>
                      </div>
                      {chequeNo && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-pink-500 w-24">Bank</span>
                            <span className={`font-semibold ${isDark ? 'text-rose-400' : 'text-red-700'} uppercase`}>{bank}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-pink-500 w-24">Cheque Date</span>
                            <span className={`font-semibold ${text}`}>{chequeDate?.format('DD-MMM-YYYY')}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-2 col-span-2">
                        <span className="font-bold text-pink-500 w-24"></span>
                        <span className="font-bold text-pink-500 ml-auto">Total Amount</span>
                        <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-red-700'} fz-caption`}>{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Main Table */}
                  <div className={`border ${tblBdrH}`}>
                    <table className="w-full fz-caption" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr className={`${tblHd} border-b ${tblBdrH}`}>
                          <th className={`text-left py-1.5 px-2 border-r ${tblBdrH} font-bold w-16`}>Srno</th>
                          <th className={`text-left py-1.5 px-2 border-r ${tblBdrH} font-bold w-24`}>Head</th>
                          <th className={`text-left py-1.5 px-2 border-r ${tblBdrH} font-bold`}>Description</th>
                          <th className={`text-right py-1.5 px-2 border-r ${tblBdrH} font-bold w-28`}>Payment</th>
                          <th className={`text-right py-1.5 px-2 font-bold w-28`}>Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, idx) => (
                          <motion.tr
                            key={idx}
                            className={`border-b ${tblBdr}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                          >
                            <td className={`py-1 px-2 border-r ${tblBdr} ${muted} font-semibold text-center`}>{idx + 1}</td>
                            <td className={`py-1 px-2 border-r ${tblBdr} ${isDark ? 'text-indigo-300' : 'text-blue-700'} font-bold`}>{entry.head_code}</td>
                            <td className={`py-1 px-2 border-r ${tblBdr} ${isDark ? 'text-indigo-300' : 'text-blue-700'} font-semibold uppercase`}>{entry.head_name}</td>
                            <td className={`text-right py-1 px-2 border-r ${tblBdr} ${text} font-semibold`}>
                              {vchrType === 'Payment' ? formatCurrency(entry.amount) : ''}
                            </td>
                            <td className={`text-right py-1 px-2 ${isDark ? 'text-indigo-300' : 'text-blue-700'} font-bold`}>
                              {vchrType === 'Receipt' ? formatCurrency(entry.amount) : ''}
                            </td>
                          </motion.tr>
                        ))}

                        <tr className={`border-b ${tblBdr}`}>
                          <td className={`py-1 px-2 border-r ${tblBdr}`}>&nbsp;</td>
                          <td className={`py-1 px-2 border-r ${tblBdr}`}></td>
                          <td className={`py-1 px-2 border-r ${tblBdr}`}></td>
                          <td className={`py-1 px-2 border-r ${tblBdr}`}></td>
                          <td className="py-1 px-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Footer bar */}
                  <div className={`${isDark ? 'bg-slate-700' : 'bg-slate-400'} h-16 mt-0 border-x border-b ${tblBdrH}`}></div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-40 select-none">
                  <FileText size={60} className={`${muted} mb-4`} />
                  <h3 className={`fz-label font-black ${muted} uppercase tracking-widest`}>No Voucher Selected</h3>
                  <p className={`fz-caption font-bold ${muted} uppercase mt-2 text-center max-w-[200px]`}>Select a voucher from the list to preview</p>
                </div>
              )}
            </Spin>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar-indigo::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar-indigo::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-indigo::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #818cf8, #6366f1);
          border-radius: 10px;
        }
        .legacy-report-compact table { border-collapse: collapse; }
        @media print {
          .h-screen { height: auto !important; overflow: visible !important; }
          .w-\\[280px\\] { display: none !important; }
          .flex-1 { margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          .rounded-xl { border-radius: 0 !important; }
        }
      `}</style>
    </div>
    </ConfigProvider>
  );
};

export default ReceiptPaymentVoucher;
