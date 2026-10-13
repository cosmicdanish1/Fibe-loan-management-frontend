import React, { useState, useEffect, useRef } from 'react';
import { Select, DatePicker, message } from 'antd';
import { ArrowRightLeft, RotateCcw, Zap, Send, X, Users } from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../services/api';
import { useAuth } from '../../../../auth/context/AuthContext';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

interface HeadOption { code: string; name: string; }
interface TransferEntry {
  srNo: number; mbno: string; name: string;
  dbHeadBal: number; crHeadBal: number;
  dbAmt: number; crAmt: number; exCrAmt: number;
}

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const NO_LIMIT = 999999999;

const MemberBalanceTransfer: React.FC = () => {
  const { user } = useAuth();
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
  // Bumped whenever an input changes so a generated preview / in-flight Generate can't be posted under edited parameters
  const inputVersion = useRef(0);

  useEffect(() => {
    inputVersion.current += 1;
    setEntries([]);
    setTotals({ totalDebit: 0, totalCredit: 0, excCredit: 0 });
  }, [debitHead, creditHead, excessHead, creditLimit, balanceAsOn]);

  // Blank = unlimited; a typed value (including 0) is used as-is; negatives / non-numbers are rejected
  const resolveCreditLimit = (): number | null => {
    if (creditLimit.trim() === '') return NO_LIMIT;
    const n = Number(creditLimit);
    if (!Number.isFinite(n) || n < 0) { message.warning('Credit Limit must be a non-negative number (leave blank for no limit)'); return null; }
    return n;
  };

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
    const limit = resolveCreditLimit();
    if (limit === null) return;
    if (!balanceAsOn) { message.warning('Select Balance As On date'); return; }
    const version = inputVersion.current;
    setLoading(true);
    try {
      const res = await apiService.post('/transactions/member-balance-transfer/generate', {
        debitHead, creditHead,
        creditLimit: limit,
        excessHead: excessHead || '',
        balanceAsOn,
      });
      if (version !== inputVersion.current) return; // inputs changed while generating - discard
      if (res.success) {
        const result = res.data || {};
        setEntries(result.entries || []);
        setTotals({
          totalDebit: result.totalDebit || 0,
          totalCredit: result.totalCredit || 0,
          excCredit: result.excCredit || 0,
        });
        message.success(`Generated ${(result.entries || []).length} entries`);
      } else {
        message.error(res.message || 'Failed to generate');
      }
    } catch (e: any) {
      message.error(e?.message || 'Generate failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (entries.length === 0) { message.warning('Generate transactions first'); return; }
    const limit = resolveCreditLimit();
    if (limit === null) return;
    const postedBy = user?.username;
    if (!postedBy) { message.error('No logged-in user - please sign in again'); return; }
    setPosting(true);
    try {
      const res = await apiService.post('/transactions/member-balance-transfer/post', {
        entries, debitHead, creditHead,
        excessHead: excessHead || '',
        postedBy,
        creditLimit: limit,
        balanceAsOn,
      });
      if (res.success) {
        const result = res.data || {};
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
        message.error(res.message || 'Post failed');
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

  usePageToolbarActions({
    onSave: handlePost,
    saveLabel: posting ? 'Posting...' : 'Post Transaction',
    saveEnabled: !(posting || entries.length === 0),
  });

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Member Balance Transfer</h1>
          <p className="aw-desc">Bulk Head-to-Head Transfer</p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleCancel} className="aw-btn aw-btn-secondary"><RotateCcw size={13} /> Cancel</button>
          <button type="button" onClick={handleGenerate} disabled={loading} className="aw-btn aw-btn-secondary">
            {loading ? <RotateCcw size={13} className="aw-spin" /> : <Zap size={13} />} {loading ? 'Generating...' : 'Generate Transaction'}
          </button>
          <button type="button" onClick={handlePost} disabled={posting || entries.length === 0} className="aw-btn aw-btn-primary">
            {posting ? <RotateCcw size={13} className="aw-spin" /> : <Send size={13} />} {posting ? 'Posting...' : 'Post Transaction'}
          </button>
          <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><ArrowRightLeft size={14} /></span>
              <h2 className="aw-card-title">Transfer Heads</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'end' }}>
              <div>
                <label className="aw-label" htmlFor="mbt-debit">Debit Head</label>
                <Select id="mbt-debit" showSearch value={debitHead} onChange={setDebitHead} placeholder="Select..."
                  className="aw-select" popupClassName="aw-select-popup" optionFilterProp="label" options={headOptions} />
              </div>
              <div>
                <label className="aw-label" htmlFor="mbt-credit">Credit Head</label>
                <Select id="mbt-credit" showSearch value={creditHead} onChange={setCreditHead} placeholder="Select..."
                  className="aw-select" popupClassName="aw-select-popup" optionFilterProp="label" options={headOptions} />
              </div>
              <div>
                <label className="aw-label" htmlFor="mbt-limit">Credit Limit</label>
                <input id="mbt-limit" value={creditLimit} onChange={e => setCreditLimit(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0" className="aw-input is-right" />
              </div>
              <div>
                <label className="aw-label" htmlFor="mbt-excess">Excess Amt CR Head</label>
                <Select id="mbt-excess" showSearch value={excessHead} onChange={setExcessHead} placeholder="Select..."
                  className="aw-select" popupClassName="aw-select-popup" optionFilterProp="label" options={headOptions} allowClear />
              </div>
              <div>
                <label className="aw-label" htmlFor="mbt-date">Balance As On</label>
                <DatePicker id="mbt-date" value={balanceAsOn ? dayjs(balanceAsOn) : null}
                  onChange={d => setBalanceAsOn(d ? d.format('YYYY-MM-DD') : '')}
                  format="DD-MMM-YYYY" className="aw-picker" popupClassName="aw-select-popup" />
              </div>
            </div>
          </section>

          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Users size={14} /></span>
              <h2 className="aw-card-title">Member List</h2>
              {entries.length > 0 && <span className="aw-meta">{entries.length} members</span>}
              <span className="aw-inline" style={{ marginLeft: 'auto', gap: 8, flexWrap: 'wrap' }}>
                <span className="aw-pill tone-danger">Total Debit {fmt(totals.totalDebit)}</span>
                <span className="aw-pill tone-success">Total Credit {fmt(totals.totalCredit)}</span>
                <span className="aw-pill tone-warning">Exc Credit {fmt(totals.excCredit)}</span>
              </span>
            </div>
            <div className="aw-table-wrap" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: 180 }}>
              <table className="aw-table" style={{ minWidth: 860 }}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>SrNo</th>
                    <th style={{ width: 120 }}>MbNo</th>
                    <th>Name</th>
                    <th className="is-right">DB Head Bal</th>
                    <th className="is-right">CR Head Bal</th>
                    <th className="is-right">DB Amt</th>
                    <th className="is-right">CR Amt</th>
                    <th className="is-right">Ex.CR Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={8}><div className="aw-empty" style={{ padding: 28 }}><span className="aw-meta">Select heads and click Generate Transaction</span></div></td></tr>
                  ) : entries.map(e => (
                    <tr key={e.srNo}>
                      <td className="is-muted">{e.srNo}</td>
                      <td className="is-accent" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{e.mbno}</td>
                      <td>{e.name}</td>
                      <td className="is-right is-muted">{fmt(e.dbHeadBal)}</td>
                      <td className="is-right is-muted">{fmt(e.crHeadBal)}</td>
                      <td className="is-right is-danger" style={{ fontWeight: 700 }}>{fmt(e.dbAmt)}</td>
                      <td className="is-right is-success" style={{ fontWeight: 700 }}>{fmt(e.crAmt)}</td>
                      <td className="is-right is-warning">{e.exCrAmt > 0 ? fmt(e.exCrAmt) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <div className="aw-footer">
        <span>Member Balance Transfer</span>
        <span>{dayjs().format('DD-MMM-YY')}</span>
      </div>
    </div>
  );
};

export default MemberBalanceTransfer;
