import React, { useState, useEffect } from 'react';
import { ConfigProvider, Select, Input, DatePicker, Table, message } from 'antd';
import { ArrowRightLeft, RotateCcw, Zap, Send, X, ShieldCheck, Building2, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../services/api';
import { getApiBaseUrl } from '../../../../services/apiVersionConfig';

const { Option } = Select;

interface HeadOption { code: string; name: string; }
interface TransferEntry {
  srNo: number; mbno: string; name: string;
  dbHeadBal: number; crHeadBal: number;
  dbAmt: number; crAmt: number; exCrAmt: number;
}

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MemberBalanceTransfer: React.FC = () => {
  const [heads, setHeads] = useState<HeadOption[]>([]);
  const [debitHead, setDebitHead] = useState<string | undefined>();
  const [creditHead, setCreditHead] = useState<string | undefined>();
  const [creditLimit, setCreditLimit] = useState('');
  const [excessHead, setExcessHead] = useState<string | undefined>();
  const [balanceAsOn, setBalanceAsOn] = useState(dayjs().format('YYYY-MM-DD'));
  const [entries, setEntries] = useState<TransferEntry[]>([]);
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0, excCredit: 0 });
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const loadHeads = async () => {
      try {
        const res = await apiService.getHeadList();
        if (res.success && res.data) setHeads(res.data);
      } catch { /* silent */ }
    };
    loadHeads();
  }, []);

  const handleGenerate = async () => {
    if (!debitHead || !creditHead) { message.warning('Select both Debit Head and Credit Head'); return; }
    setLoading(true);
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/transactions/member-balance-transfer/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debitHead, creditHead,
          creditLimit: parseFloat(creditLimit) || 999999999,
          excessHead: excessHead || '',
          balanceAsOn,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const result = data.data || data;
        setEntries(result.entries || []);
        setTotals({
          totalDebit: result.totalDebit || 0,
          totalCredit: result.totalCredit || 0,
          excCredit: result.excCredit || 0,
        });
        message.success(`Generated ${(result.entries || []).length} entries`);
      } else {
        message.error('Failed to generate');
      }
    } catch (e: any) {
      message.error(e?.message || 'Generate failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (entries.length === 0) { message.warning('Generate transactions first'); return; }
    setPosting(true);
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/transactions/member-balance-transfer/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries, debitHead, creditHead,
          excessHead: excessHead || '',
          postedBy: 'admin',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const result = data.data || data;
        if (window.electronAPI?.showMessageBox) {
          await window.electronAPI.showMessageBox({
            type: 'info', title: 'Member Balance Transfer',
            message: 'Posted Successfully!',
            detail: `Voucher: ${result.voucherNo}\n${result.message}`,
            buttons: ['OK'],
          });
        } else {
          message.success(result.message);
        }
        setEntries([]);
        setTotals({ totalDebit: 0, totalCredit: 0, excCredit: 0 });
      } else {
        message.error('Post failed');
      }
    } catch (e: any) {
      message.error(e?.message || 'Post failed');
    } finally {
      setPosting(false);
    }
  };

  const handleCancel = () => {
    setDebitHead(undefined); setCreditHead(undefined);
    setCreditLimit(''); setExcessHead(undefined);
    setEntries([]); setTotals({ totalDebit: 0, totalCredit: 0, excCredit: 0 });
  };

  const handleExit = () => {
    if ((window as any).electronAPI?.ipcRenderer) (window as any).electronAPI.ipcRenderer.send('window-close');
    else window.close();
  };

  const headOptions = heads.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }));

  const columns = [
    { title: 'SrNo', dataIndex: 'srNo', width: 50, render: (v: number) => <span className="text-[10px] text-slate-500">{v}</span> },
    { title: 'MbNo', dataIndex: 'mbno', width: 100, render: (v: string) => <span className="text-[10px] font-mono font-bold text-indigo-700">{v}</span> },
    { title: 'Name', dataIndex: 'name', render: (v: string) => <span className="text-[10px] font-semibold text-slate-800">{v}</span> },
    { title: 'DB Head Bal', dataIndex: 'dbHeadBal', width: 110, align: 'right' as const, render: (v: number) => <span className="text-[10px] font-mono text-slate-600">{fmt(v)}</span> },
    { title: 'CR Head Bal', dataIndex: 'crHeadBal', width: 110, align: 'right' as const, render: (v: number) => <span className="text-[10px] font-mono text-slate-600">{fmt(v)}</span> },
    { title: 'DB Amt', dataIndex: 'dbAmt', width: 100, align: 'right' as const, render: (v: number) => <span className="text-[10px] font-mono font-bold text-rose-600">{fmt(v)}</span> },
    { title: 'CR Amt', dataIndex: 'crAmt', width: 100, align: 'right' as const, render: (v: number) => <span className="text-[10px] font-mono font-bold text-emerald-600">{fmt(v)}</span> },
    { title: 'Ex.CR Amt', dataIndex: 'exCrAmt', width: 100, align: 'right' as const, render: (v: number) => <span className="text-[10px] font-mono text-amber-600">{v > 0 ? fmt(v) : ''}</span> },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
      <div className="h-screen flex flex-col bg-white font-sans text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-1.5 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600"><ArrowRightLeft size={13} className="text-white" /></div>
            <div>
              <h1 className="text-[11px] font-black text-white uppercase tracking-wider leading-none">Member Balance Transfer</h1>
              <p className="text-[7px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5">
                <ShieldCheck size={7} className="inline text-indigo-400" /> Bulk Head-to-Head Transfer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleCancel} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
              <RotateCcw size={11} /> Cancel
            </button>
            <button onClick={handleGenerate} disabled={loading}
              className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 border border-emerald-400 shadow-lg uppercase tracking-wide disabled:opacity-50">
              <Zap size={11} /> {loading ? 'Generating...' : 'Generate Transaction'}
            </button>
            <button onClick={handlePost} disabled={posting || entries.length === 0}
              className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide disabled:opacity-50">
              <Send size={11} /> {posting ? 'Posting...' : 'Post Transaction'}
            </button>
            <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[9px] font-black flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
              <X size={11} /> Exit
            </button>
          </div>
        </div>

        {/* Form — compact like legacy */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3">
              <label className="block text-[8px] font-black text-purple-700 uppercase tracking-wider mb-0.5">Debit Head</label>
              <Select showSearch value={debitHead} onChange={setDebitHead} placeholder="Select..." className="w-full" style={{ height: 28 }}
                optionFilterProp="label" options={headOptions} />
            </div>
            <div className="col-span-3">
              <label className="block text-[8px] font-black text-purple-700 uppercase tracking-wider mb-0.5">Credit Head</label>
              <Select showSearch value={creditHead} onChange={setCreditHead} placeholder="Select..." className="w-full" style={{ height: 28 }}
                optionFilterProp="label" options={headOptions} />
            </div>
            <div className="col-span-1">
              <label className="block text-[8px] font-black text-purple-700 uppercase tracking-wider mb-0.5">Credit Limit</label>
              <Input value={creditLimit} onChange={e => setCreditLimit(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0" className="h-7 text-[11px] font-bold text-center" />
            </div>
            <div className="col-span-3">
              <label className="block text-[8px] font-black text-purple-700 uppercase tracking-wider mb-0.5">Excess Amt CR Head</label>
              <Select showSearch value={excessHead} onChange={setExcessHead} placeholder="Select..." className="w-full" style={{ height: 28 }}
                optionFilterProp="label" options={headOptions} allowClear />
            </div>
            <div className="col-span-2">
              <label className="block text-[8px] font-black text-purple-700 uppercase tracking-wider mb-0.5">Balance As On</label>
              <DatePicker value={balanceAsOn ? dayjs(balanceAsOn) : null}
                onChange={d => setBalanceAsOn(d ? d.format('YYYY-MM-DD') : '')}
                format="DD-MMM-YYYY" className="w-full h-7 text-[11px]" />
            </div>
          </div>
        </div>

        {/* Member List label */}
        <div className="px-3 py-0.5 bg-white border-b border-slate-200 flex items-center gap-1.5">
          <Building2 size={9} className="text-slate-400" />
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Member List</span>
          {entries.length > 0 && <span className="text-[8px] font-bold text-indigo-500">{entries.length} members</span>}
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <Table columns={columns} dataSource={entries} pagination={false} size="small" rowKey="srNo"
            scroll={{ y: 'calc(100vh - 250px)' }}
            locale={{ emptyText: <span className="text-[10px] text-slate-400 py-8 block text-center font-bold uppercase">Select heads and click Generate Transaction</span> }}
          />
        </div>

        {/* Footer Totals */}
        <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 uppercase">Total Debit</span>
            <span className="text-[12px] font-black text-rose-600 font-mono">{fmt(totals.totalDebit)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 uppercase">Total Credit</span>
            <span className="text-[12px] font-black text-emerald-600 font-mono">{fmt(totals.totalCredit)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 uppercase">Exc Credit</span>
            <span className="text-[12px] font-black text-amber-600 font-mono">{fmt(totals.excCredit)}</span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-slate-400">
            <Calendar size={9} />
            <span className="text-[8px] font-black uppercase">{dayjs().format('DD-MMM-YY')}</span>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MemberBalanceTransfer;
