import React, { useState, useCallback } from 'react';
import { isFailure, notifyError } from '@/utils/dialog';
import { message } from 'antd';
import { FileText, Search, RotateCcw, Printer, CheckCircle, XCircle, User } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import { ReportShell, ParamCard, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import MemberField from '../../../../../components/shared/kit/MemberField';

const printCertificateHtml = (html: string) => {
  const doc = `<html><head><style>
    @page{size:portrait;margin:15mm}
    body{font-family:Arial,sans-serif;font-size:12px}
    .certificate-border{border:3px double #10b981;padding:24px;border-radius:8px}
    .text-emerald{color:#059669}
    .text-red{color:#dc2626}
    b{font-weight:700}
  </style></head><body>${html}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(doc);
  iframe.contentDocument!.close();
  setTimeout(() => iframe.contentWindow!.print(), 100);
  setTimeout(() => document.body.removeChild(iframe), 1500);
};

const LoanNilCertificate: React.FC = () => {
  const [memberNo, setMemberNo] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);

  const [societyInfo] = useState({
    name: 'Espat Karmchari Co-Operative Credit Society Limited.',
    address: 'Avenue A, Sahakari Sadan, Sector-C, AT Post:Bhilai Nagar,Dist:DURG-490006',
    regNo: 'A.R/DRG/1796',
    tel: '0788-2298736'
  });

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo.trim()) {
      message.warning('Please enter Member Number');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.get(`/reports/loan-nil-certificate/${memberNo}`);
      if (isFailure(response)) { await notifyError(response, 'load the loan nil certificate'); return; }
      const data = (response as any).data || response;

      if (data && data.memberNo) {
        setCertificateData(data);
        if (data.memberName && !memberName) setMemberName(data.memberName);
        if (!data.isNil) {
          message.warning('Member has active outstanding loans');
        } else {
          message.success('Certificate generated — No active loans');
        }
      } else {
        setCertificateData(null);
        message.error('Member not found or failed to generate certificate');
      }
    } catch {
      message.error('Failed to generate certificate');
      setCertificateData(null);
    } finally {
      setLoading(false);
    }
  }, [memberNo, memberName]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setCertificateData(null);
  }, []);

  const handlePrint = useCallback(() => {
    if (!certificateData) return;
    const certHtml = document.querySelector('.certificate-border')?.outerHTML || '';
    printCertificateHtml(certHtml);
  }, [certificateData]);

  return (
    <ReportShell
      className="loannil-page"
      title="Loan Nil Certificate"
      desc="No-objection certificate: no outstanding loan"
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!certificateData}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <ParamCard title="Certificate" icon={<User size={14} />}>
          <div>
            <label className="aw-label" htmlFor="ln-member">Member No.</label>
            <MemberField id="ln-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={() => handleGenerate()} />
          </div>
          <input className="aw-input" value={memberName} readOnly placeholder="Member name" aria-label="Member name" />
          <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
            <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
          </button>
        </ParamCard>
      }
      footerLeft="Loan Nil Certificate"
      footerRight={memberNo ? `Member ${memberNo}` : ''}
    >
      {certificateData ? (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Loan Nil Certificate</span>
            <span className="aw-meta">Member: {memberNo || 'N/A'}</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            {/* The certificate sheet keeps its light, printable look: its markup is what gets printed. */}
            <style>{`.certificate-border { border: 3px double #10b981; padding: 24px; border-radius: 8px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #1e293b; }`}</style>
                    <div className="certificate-border max-w-3xl mx-auto">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-emerald-700 mb-2">{societyInfo.name}</h2>
                        <p className="fz-body text-slate-600">{societyInfo.address}</p>
                        <p className="fz-label text-slate-500 mt-1">Reg No: {societyInfo.regNo} | Tel: {societyInfo.tel}</p>
                      </div>

                      <div className="text-center my-6">
                        <h3 className="fz-heading font-black text-emerald-600 uppercase tracking-wider border-b-2 border-emerald-300 inline-block pb-1">Loan Nil Certificate</h3>
                      </div>

                      <div className="space-y-4 fz-body">
                        <p className="text-slate-700"><span className="font-bold">Certificate No:</span> LNC-{memberNo}-{dayjs().format('YYYYMMDD')}</p>
                        <p className="text-slate-700"><span className="font-bold">Date:</span> {dayjs().format('DD-MMM-YYYY')}</p>
                        
                        <div className="my-6 p-4 bg-white rounded-lg border-2 border-emerald-200">
                          <p className="text-slate-700 leading-relaxed">
                            This is to certify that <span className="font-bold text-emerald-700">Mr./Mrs. {certificateData.memberName}</span>,
                            Member No: <span className="font-bold">{certificateData.memberNo}</span>,
                            {!certificateData.isNil ? (
                              <span className="text-red-600 font-bold"> has active loan(s) with outstanding balance.</span>
                            ) : (
                              <span className="text-emerald-600 font-bold"> has no outstanding loan balance with our society as on {dayjs().format('DD-MMM-YYYY')}.</span>
                            )}
                          </p>
                        </div>

                        {!certificateData.isNil && certificateData.outstandingLoans && (
                          <div className="my-4 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                            <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2"><XCircle size={16} /> Outstanding Loans:</h4>
                            {certificateData.outstandingLoans.map((loan: any, idx: number) => {
                              const dueBits = [
                                loan.balance > 0 ? `Principal: ₹${(loan.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null,
                                loan.interestDue > 0 ? `Interest: ₹${(loan.interestDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null,
                                loan.penalDue > 0 ? `Penal: ₹${(loan.penalDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null,
                              ].filter(Boolean).join(' | ');
                              return (
                                <div key={idx} className="fz-body text-slate-700 ml-6">• {loan.headName} (Case: {loan.headCode}) — {dueBits}</div>
                              );
                            })}
                          </div>
                        )}

                        {certificateData.isNil && (
                          <div className="my-4 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                            <h4 className="font-bold text-emerald-700 flex items-center gap-2"><CheckCircle size={16} /> No Outstanding Loans</h4>
                            <p className="fz-body text-slate-600 mt-2">This member has cleared all loan obligations.</p>
                          </div>
                        )}

                        <div className="mt-12 pt-8 border-t-2 border-emerald-200 flex justify-between">
                          <div className="text-center">
                            <div className="border-t-2 border-slate-400 pt-2 w-48"><p className="fz-label font-bold text-slate-600">Authorized Signatory</p></div>
                          </div>
                          <div className="text-center">
                            <div className="border-t-2 border-slate-400 pt-2 w-48"><p className="fz-label font-bold text-slate-600">Manager</p></div>
                          </div>
                        </div>

                        <p className="text-center fz-label text-slate-400 mt-6 italic">This is a computer-generated certificate</p>
                      </div>
                    </div>
          </div>
        </section>
      ) : (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Certificate'} hint="Enter member number and generate certificate" />
      )}
    </ReportShell>
  );
};

export default LoanNilCertificate;
