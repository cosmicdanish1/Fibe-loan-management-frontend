import React, { useState } from 'react';
import { message } from 'antd';
import { Printer, User, Calendar, IndianRupee, RotateCcw, Hash, Share2, ArrowRightLeft, Building, RefreshCw } from 'lucide-react';
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

const Field: React.FC<{ label: string; icon?: React.ReactNode; htmlFor?: string; children: React.ReactNode }> = ({ label, icon, htmlFor, children }) => (
  <div>
    <label className="aw-label" htmlFor={htmlFor}>{label}</label>
    <div className={`aw-input-wrap ${icon ? 'has-icon' : ''}`}>
      {icon}
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
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient aw-noprint">
        <div className="min-w-0">
          <h1 className="aw-title">Share Certificate Printing</h1>
          <p className="aw-desc">Enter share details and print the share certificate</p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleClear} className="aw-btn aw-btn-secondary">
            <RotateCcw size={13} /> Clear
          </button>
          <button type="button" onClick={handlePrint} className="aw-btn aw-btn-primary">
            <Printer size={13} /> Print Certificate
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-split aw-split-form" style={{ gridTemplateColumns: 'minmax(300px, 5fr) minmax(0, 7fr)' }}>

          {/* ── Form panel ── */}
          <div className="aw-side aw-noprint">
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Share2 size={14} /></span>
                <h2 className="aw-card-title">Share Details</h2>
              </div>
              <div className="aw-stack">
                <div>
                  <Field label="Member Number" icon={<User size={13} />} htmlFor="scp-member">
                    <input id="scp-member" value={form.memberNo} onChange={e => set('memberNo', e.target.value)}
                      onBlur={fetchMemberData} placeholder="e.g. 1234" className="aw-input" />
                  </Field>
                  {fetching && (
                    <p className="aw-meta" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={11} className="aw-spin" /> Looking up…</p>
                  )}
                  {memberName && <p className="aw-strong aw-fade-in" style={{ marginTop: 6, color: 'var(--aw-accent)' }}>{memberName}</p>}
                </div>

                <div className="aw-two">
                  <Field label="Transaction Date" icon={<Calendar size={13} />} htmlFor="scp-tdate">
                    <input id="scp-tdate" type="date" value={form.transactionDate} onChange={e => set('transactionDate', e.target.value)} className="aw-input" />
                  </Field>
                  <Field label="Certificate Date" icon={<Calendar size={13} />} htmlFor="scp-cdate">
                    <input id="scp-cdate" type="date" value={form.certificateDate} onChange={e => set('certificateDate', e.target.value)} className="aw-input" />
                  </Field>
                </div>

                <div className="aw-two">
                  <Field label="Share Amount (₹)" icon={<IndianRupee size={13} />} htmlFor="scp-amt">
                    <input id="scp-amt" type="number" value={form.shareAmount} onChange={e => set('shareAmount', parseFloat(e.target.value) || 0)} className="aw-input" />
                  </Field>
                  <Field label="Face Value / Share (₹)" icon={<IndianRupee size={13} />} htmlFor="scp-face">
                    <input id="scp-face" type="number" value={form.shareValue} onChange={e => set('shareValue', parseFloat(e.target.value) || 0)} className="aw-input" style={{ textAlign: 'center' }} />
                  </Field>
                </div>

                <div className="aw-two">
                  <Field label="No. of Shares" htmlFor="scp-no">
                    <input id="scp-no" type="number" value={form.noOfShares} onChange={e => set('noOfShares', parseFloat(e.target.value) || 0)} className="aw-input" style={{ textAlign: 'center' }} />
                  </Field>
                  <Field label="Certificate No." icon={<Hash size={13} />} htmlFor="scp-cert">
                    <input id="scp-cert" value={form.certificateNo} onChange={e => set('certificateNo', e.target.value)} className="aw-input" style={{ fontFamily: 'monospace', color: 'var(--aw-success)' }} />
                  </Field>
                </div>

                <div style={{ paddingTop: 'var(--aw-gap)', borderTop: '1px dashed var(--aw-border-strong)' }}>
                  <p className="aw-label">Share Sequence Range</p>
                  <div className="aw-two">
                    <Field label="From No." htmlFor="scp-from">
                      <input id="scp-from" value={form.distFromNo} onChange={e => set('distFromNo', e.target.value)} className="aw-input" placeholder="001" />
                    </Field>
                    <Field label="Upto No." htmlFor="scp-upto">
                      <input id="scp-upto" value={form.distUptoNo} onChange={e => set('distUptoNo', e.target.value)} className="aw-input" placeholder="100" />
                    </Field>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ── Certificate preview (the paper itself stays white and dark-inked in both themes) ── */}
          <div className="aw-card aw-noprint" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', minWidth: 0 }}>
            <p className="aw-label">Certificate Preview</p>
            <div style={{ width: '100%', maxWidth: 440, background: '#ffffff', color: '#0f172a', boxShadow: '0 12px 40px rgba(0,0,0,.18)', borderRadius: 2, padding: 36, border: '8px double #1e293b', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 8, border: '1px solid #e2e8f0', pointerEvents: 'none', opacity: .5 }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: 26, paddingBottom: 26, borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ background: '#0f172a', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Building size={22} color="#fff" />
                  </div>
                  <h1 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', margin: 0 }}>Share Certificate</h1>
                  <p style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '.16em', textTransform: 'uppercase', margin: 0 }}>Co-operative Credit Society</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 22, columnGap: 28, fontSize: 12 }}>
                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
                    <div>
                      <span style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '.14em', textTransform: 'uppercase' }}>Serial Number</span>
                      <p style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, margin: 0 }}>{form.certificateNo || 'SH-REF-000'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '.14em', textTransform: 'uppercase' }}>Member</span>
                      <p style={{ fontWeight: 900, color: '#4f46e5', fontStyle: 'italic', margin: 0 }}>{form.memberNo || '—'}</p>
                      {memberName && <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: 0 }}>{memberName}</p>}
                    </div>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '.14em', textTransform: 'uppercase' }}>Total Capital</span>
                    <p style={{ fontSize: 24, fontWeight: 900, margin: '0 0 14px' }}>₹ {form.shareAmount.toLocaleString('en-IN')}</p>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <div>
                        <span style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '.14em', textTransform: 'uppercase' }}>Units</span>
                        <p style={{ fontWeight: 900, fontSize: 15, margin: 0 }}>{form.noOfShares || '—'}</p>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '.14em', textTransform: 'uppercase' }}>Face Value</span>
                        <p style={{ fontWeight: 900, fontSize: 15, margin: 0 }}>₹ {form.shareValue}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ paddingLeft: 22, borderLeft: '1px solid #e2e8f0' }}>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '.14em', textTransform: 'uppercase' }}>Share Range</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, color: '#4f46e5', marginBottom: 14 }}>
                      {form.distFromNo || '000'} <ArrowRightLeft size={12} /> {form.distUptoNo || '000'}
                    </div>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '.14em', textTransform: 'uppercase' }}>Certified On</span>
                    <p style={{ fontWeight: 900, fontSize: 11, textTransform: 'uppercase', margin: 0 }}>
                      {form.certificateDate ? dayjs(form.certificateDate).format('DD MMM YYYY') : 'PENDING'}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 52, display: 'flex', justifyContent: 'space-between', padding: '0 12px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ width: 110, height: 1, background: '#e2e8f0', marginBottom: 6 }} /><span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Official Seal</span></div>
                  <div style={{ textAlign: 'center' }}><div style={{ width: 110, height: 1, background: '#0f172a', marginBottom: 6 }} /><span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase' }}>Managing Director</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareCertificatePrinting;
