// components/RDMasterForm.tsx

import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { ConfigProvider, Input, Select, DatePicker, Table, Checkbox, Modal } from 'antd';
import { Landmark, User, Save, RotateCcw, Plus, Search, ShieldCheck, Building2, X, Hash } from 'lucide-react';
import type { RDMasterHookReturn } from '../interfaces/interface';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

const { Option } = Select;
const { TextArea } = Input;

interface RDMasterFormProps extends RDMasterHookReturn {}

const RDMasterForm: React.FC<RDMasterFormProps> = ({
  data,
  updateMemberNo, updateAccountNo, updatePrefix,
  updateFirstName, updateMiddleName, updateLastName,
  updateDepositDate, updateOpeningBalance,
  updateDepositUnit, updateDepositPeriod,
  updateRate, updateAmount,
  updateMaturityDate, updateMaturityAmount,
  updateRecoveryThroughDemand, updateSpecialInstructions,
  addNominee, removeNominee, updateNominee,
  save, reset,
  notification, clearNotification,
}) => {
  const [showMemberLookup, setShowMemberLookup] = useState(false);

  const handleExit = () => {
    if (window.electron?.ipcRenderer) window.electron.ipcRenderer.send('close-window');
  };

  const fetchMemberDetails = async (memberNo: string | number) => {
    const token = localStorage.getItem('accessToken');
    const { getApiBaseUrl } = await import('../../../../../services/apiVersionConfig');
    const res = await fetch(`${await getApiBaseUrl()}/members/details/${memberNo}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const result = await res.json();
    return result.data || result;
  };

  const handleMemberSelect = async (member: any) => {
    const memberNo = member.memberNo || member.mbno || member.memberNumber || '';
    updateMemberNo(String(memberNo));
    try {
      const d = await fetchMemberDetails(memberNo);
      if (d) {
        updatePrefix(d.prefix || '');
        updateFirstName(d.f_name || d.firstName || '');
        updateMiddleName(d.m_name || d.middleName || '');
        updateLastName(d.l_name || d.lastName || '');
      } else {
        const parts = (member.memberName || member.fullname || '').split(' ');
        updateFirstName(parts[0] || '');
        updateMiddleName(parts.length > 2 ? parts[1] : '');
        updateLastName(parts[parts.length - 1] || '');
      }
    } catch {
      const parts = (member.memberName || member.fullname || '').split(' ');
      updateFirstName(parts[0] || '');
      updateMiddleName(parts.length > 2 ? parts[1] : '');
      updateLastName(parts[parts.length - 1] || '');
    }
    setShowMemberLookup(false);
  };

  const handleMemberNoBlur = async () => {
    if (!data.memberNo) return;
    try {
      const d = await fetchMemberDetails(data.memberNo);
      if (d) {
        updatePrefix(d.prefix || '');
        updateFirstName(d.f_name || d.firstName || '');
        updateMiddleName(d.m_name || d.middleName || '');
        updateLastName(d.l_name || d.lastName || '');
      }
    } catch {}
  };

  const nomineeColumns = useMemo(() => [
    {
      title: 'Name', dataIndex: 'name', key: 'name', width: '28%',
      render: (text: string, record: any) => (
        <Input value={text} onChange={e => updateNominee(record.id, 'name', e.target.value)}
          className="h-5 text-[9px] font-semibold border-slate-200 rounded px-1 bg-white" />
      ),
    },
    {
      title: 'Address', dataIndex: 'address', key: 'address', width: '36%',
      render: (text: string, record: any) => (
        <Input value={text} onChange={e => updateNominee(record.id, 'address', e.target.value)}
          className="h-5 text-[9px] font-semibold border-slate-200 rounded px-1 bg-white" />
      ),
    },
    {
      title: 'Age', dataIndex: 'age', key: 'age', width: '16%', align: 'center' as const,
      render: (text: string, record: any) => (
        <Input value={text} onChange={e => updateNominee(record.id, 'age', e.target.value)}
          className="h-5 text-[9px] font-semibold border-slate-200 rounded px-1 bg-white text-center" />
      ),
    },
    {
      title: 'Relation', dataIndex: 'relation', key: 'relation', width: '16%', align: 'center' as const,
      render: (text: string, record: any) => (
        <Select value={text || undefined} onChange={val => updateNominee(record.id, 'relation', val)}
          placeholder="Select" size="small" className="w-full text-[9px]" style={{ fontSize: 9 }}>
          {['Son','Daughter','Wife','Husband','Father','Mother','Brother','Sister','Grandson','Granddaughter','Other'].map(r => (
            <Option key={r} value={r}>{r}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: '', key: 'del', width: '4%', align: 'center' as const,
      render: (_: any, record: any) => (
        <button onClick={() => removeNominee(record.id)}
          className="w-4 h-4 flex items-center justify-center rounded hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-colors">
          <X size={9} />
        </button>
      ),
    },
  ], [updateNominee, removeNominee]);

  // Keep money/number fields numeric: allow digits + a single decimal point only.
  const numeric = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, '');
    const i = cleaned.indexOf('.');
    return i === -1 ? cleaned : cleaned.slice(0, i + 1) + cleaned.slice(i + 1).replace(/\./g, '');
  };
  // Period is whole units (months/years) — digits only.
  const intOnly = (v: string) => v.replace(/[^0-9]/g, '');

  const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5";
  const inputCls = "h-7 text-[11px] font-semibold bg-white border-slate-300 rounded";

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
      <div className="rd-form h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
              <Landmark size={13} className="text-white" />
            </div>
            <div>
              <h1 className="text-[11px] font-black text-white tracking-wider uppercase leading-none">RD Account Opening</h1>
              <p className="text-[7px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                <ShieldCheck size={7} className="text-indigo-400" /> Admin Terminal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={reset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
              <RotateCcw size={11} /> Purge
            </button>
            <button onClick={save} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide">
              <Save size={11} /> Save
            </button>
            <div className="h-4 w-px bg-white/20" />
            <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
              <X size={11} /> Exit
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`px-3 py-1.5 flex items-center justify-between text-[9px] font-black uppercase tracking-wide border-b shrink-0 ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
            notification.type === 'error'   ? 'bg-rose-50 border-rose-300 text-rose-800' :
                                              'bg-amber-50 border-amber-300 text-amber-800'
          }`}>
            <span>{notification.message}</span>
            <button onClick={clearNotification}><X size={10} /></button>
          </div>
        )}

        {/* Body — compact like legacy */}
        <div className="flex-1 overflow-auto">
          <div className="mx-auto p-2 space-y-1.5" style={{ minWidth: 600 }}>

            {/* ── Member No / Account No / Prefix / Names — single compact card ── */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-md p-2">
              <div className="grid grid-cols-12 gap-1.5 items-end">
                <div className="col-span-3">
                  <label className={labelCls}>Member No.</label>
                  <div className="flex gap-1">
                    <Input value={data.memberNo} onChange={e => updateMemberNo(e.target.value)}
                      onBlur={handleMemberNoBlur} onPressEnter={handleMemberNoBlur}
                      placeholder="Member..." className={inputCls} />
                    <button onClick={() => setShowMemberLookup(true)}
                      className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0">
                      <Search size={11} />
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Account No. <span className="text-[6px] bg-emerald-100 text-emerald-700 px-1 rounded font-black">AUTO</span></label>
                  <Input value={data.accountNo} readOnly placeholder="Auto"
                    className={`${inputCls} bg-emerald-50 border-emerald-200 text-emerald-800 font-mono`} />
                </div>
                <div className="col-span-1">
                  <label className={labelCls}>Prefix</label>
                  <Select value={data.prefix || undefined} onChange={updatePrefix} placeholder="—"
                    className="w-full" style={{ height: 28 }}>
                    <Option value="Mr.">Mr.</Option>
                    <Option value="Mrs.">Mrs.</Option>
                    <Option value="Ms.">Ms.</Option>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>First</label>
                  <Input value={data.firstName} onChange={e => updateFirstName(e.target.value)} placeholder="First" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Middle</label>
                  <Input value={data.middleName} onChange={e => updateMiddleName(e.target.value)} placeholder="Middle" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Last</label>
                  <Input value={data.lastName} onChange={e => updateLastName(e.target.value)} placeholder="Last" className={inputCls} />
                </div>
              </div>

              {/* RD Head Name — inline below names */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                <label className={labelCls}>RD Head Name</label>
                <Select
                  value={(data as any).headCode || undefined}
                  onChange={(val: string) => (data as any).headCode = val}
                  placeholder="Select RD Head..."
                  className="w-full" style={{ height: 28 }}
                  allowClear
                >
                  <Option value="A1002">A1002 - REGULAR LOAN</Option>
                  <Option value="L1004">L1004 - COMPULSORY DEPOSIT</Option>
                  <Option value="L1002">L1002 - FAMILY RELIEF SCHEME</Option>
                  <Option value="L1045">L1045 - FAMILY RELIEF SCHEME 2</Option>
                </Select>
              </div>
            </div>

            {/* ── RD Details — 2-column layout like legacy ── */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-md">
              <div className="px-2 py-0.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <span className="text-[8px] font-black text-purple-700 uppercase tracking-widest">RD Details</span>
              </div>
              <div className="p-2 grid grid-cols-4 gap-x-3 gap-y-1.5">
                <div>
                  <label className={labelCls}>Deposit Date</label>
                  <DatePicker value={data.depositDate ? dayjs(data.depositDate) : null}
                    onChange={d => updateDepositDate(d ? d.format('YYYY-MM-DD') : '')}
                    format="DD-MMM-YY" className="w-full h-7 text-[11px]" />
                </div>
                <div>
                  <label className={labelCls}>Opening Balance</label>
                  <Input value={data.openingBalance} onChange={e => updateOpeningBalance(numeric(e.target.value))}
                    inputMode="decimal" placeholder="0.00" className={`${inputCls} text-right`} />
                </div>
                <div>
                  <label className={labelCls}>Deposit Unit</label>
                  <Select value={data.depositUnit} onChange={updateDepositUnit} className="w-full" style={{ height: 28 }}>
                    <Option value="Months">Months</Option>
                    <Option value="Years">Years</Option>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>Deposit Period</label>
                  <Input value={data.depositPeriod} onChange={e => updateDepositPeriod(intOnly(e.target.value))}
                    inputMode="numeric" placeholder="e.g. 12" className={`${inputCls} text-center`} />
                </div>
                <div>
                  <label className={labelCls}>Rate (%)</label>
                  <Input value={data.rate} onChange={e => updateRate(numeric(e.target.value))}
                    inputMode="decimal" placeholder="0.00" className={`${inputCls} text-right font-bold text-indigo-700`} />
                </div>
                <div>
                  <label className={labelCls}>Amount (Monthly)</label>
                  <Input value={data.amount} onChange={e => updateAmount(numeric(e.target.value))}
                    inputMode="decimal" placeholder="0.00" className={`${inputCls} text-right`} />
                </div>
                <div>
                  <label className={labelCls}>Maturity Date</label>
                  <DatePicker value={data.maturityDate ? dayjs(data.maturityDate) : null}
                    onChange={d => updateMaturityDate(d ? d.format('YYYY-MM-DD') : '')}
                    format="DD-MMM-YY" className="w-full h-7 text-[11px]" />
                </div>
                <div>
                  <label className={labelCls}>Maturity Amount</label>
                  <Input value={data.maturityAmount} onChange={e => updateMaturityAmount(numeric(e.target.value))}
                    inputMode="decimal" placeholder="0.00" className={`${inputCls} text-right text-emerald-700 font-bold`} />
                </div>
              </div>
            </div>

            {/* ── Nominee Details — compact ── */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-md">
              <div className="px-2 py-0.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Nominee Details</span>
                <button onClick={addNominee}
                  className="h-5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[8px] font-black uppercase flex items-center gap-1 transition-colors">
                  <Plus size={8} /> Add
                </button>
              </div>
              <div className="nominee-rd-table">
                <Table columns={nomineeColumns} dataSource={data.nominees}
                  pagination={false} size="small" scroll={{ x: 480 }}
                  locale={{ emptyText: <span className="text-[9px] text-slate-400">No nominees added</span> }}
                />
              </div>
            </div>

            {/* ── Recovery + Special Instructions — compact ── */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-md p-2 space-y-1.5">
              <Checkbox checked={data.recoveryThroughDemand}
                onChange={e => updateRecoveryThroughDemand(e.target.checked)}
                className="text-[10px] font-semibold text-slate-700">
                Recovery Through Demand
              </Checkbox>
              <div>
                <label className={labelCls}>Special Instructions</label>
                <TextArea value={data.specialInstructions}
                  onChange={e => updateSpecialInstructions(e.target.value)}
                  rows={2} placeholder="Additional notes or instructions…"
                  className="text-[10px] font-medium bg-slate-50 border-slate-200 rounded resize-none" />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Building2 size={9} className="text-slate-400" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Trust Ledger</span>
            <div className="w-px h-2.5 bg-slate-300" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Authorized</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-500">
            <ShieldCheck size={9} />
            <span className="text-[8px] font-black uppercase tracking-wide">v4.0.1</span>
          </div>
        </div>

        {/* Member Lookup Modal */}
        <Modal open={showMemberLookup} onCancel={() => setShowMemberLookup(false)}
          footer={null} width={900} centered styles={{ body: { padding: 0 } }} destroyOnClose>
          <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowMemberLookup(false)} />
        </Modal>

        <style>{`
          .nominee-rd-table .ant-table-thead > tr > th {
            background: #f8fafc !important;
            padding: 4px 8px !important;
            font-size: 8px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.06em !important;
            color: #64748b !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
          .nominee-rd-table .ant-table-tbody > tr > td {
            padding: 3px 8px !important;
            border-bottom: 1px solid #f1f5f9 !important;
          }
          .nominee-rd-table .ant-table-tbody > tr:hover > td { background: #f8faff !important; }
          .ant-select-selector { font-size: 11px !important; }
          .ant-picker-input > input { font-size: 11px !important; font-weight: 600 !important; }
          .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }

          /* ── Dark mode: cover the bits the global dark layer can't reach ──
             (arbitrary bg hex + the nominee table's own !important light styles + AUTO field tints) */
          html.dark .rd-form { background-color: #0f172a !important; }
          html.dark .nominee-rd-table .ant-table-thead > tr > th {
            background: #0f172a !important; color: #94a3b8 !important; border-bottom-color: #334155 !important;
          }
          html.dark .nominee-rd-table .ant-table-tbody > tr > td { border-bottom-color: #1e293b !important; }
          html.dark .nominee-rd-table .ant-table-tbody > tr:hover > td { background: #1e293b !important; }
          html.dark .rd-form .bg-emerald-50 { background-color: #064e3b !important; }
          html.dark .rd-form .border-emerald-200 { border-color: #065f46 !important; }
          html.dark .rd-form .text-emerald-800,
          html.dark .rd-form .text-emerald-700 { color: #6ee7b7 !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default RDMasterForm;
