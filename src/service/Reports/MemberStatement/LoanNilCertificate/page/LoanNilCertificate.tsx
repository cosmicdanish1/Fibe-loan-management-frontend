import React, { useState, useCallback } from 'react';
import { ConfigProvider, Button, Spin, Input, Modal, message } from 'antd';
import { FileText, Printer, Search, RotateCcw, Award, User, Users, CheckCircle, XCircle } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

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
  const [showLookup, setShowLookup] = useState<boolean>(false);

  const [societyInfo] = useState({
    name: 'Espat Karmchari Co-Operative Credit Society Limited.',
    address: 'Avenue A, Sahakari Sadan, Sector-C, AT Post:Bhilai Nagar,Dist:DURG-490006',
    regNo: 'A.R/DRG/1796',
    tel: '0788-2298736'
  });

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
    setShowLookup(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo.trim()) {
      message.warning('Please enter Member Number');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.get(`/reports/loan-nil-certificate/${memberNo}`);
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
    <ConfigProvider theme={{ token: { colorPrimary: '#10b981', borderRadius: 6, fontSize: 12 } }}>
      <style>{`
        @media print {
          @page { size: portrait; margin: 15mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
        .certificate-border {
          border: 3px double #10b981;
          padding: 24px;
          border-radius: 8px;
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }
      `}</style>

      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 overflow-hidden">
        <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200/60 px-3 py-1.5 flex items-center justify-between z-10 shadow-sm shrink-0 no-print">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-1.5 rounded-lg text-white shadow-md">
              <Award size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black text-slate-800 tracking-tight leading-none">Loan Nil Certificate</h1>
              <div className="flex items-center gap-1 mt-0.5 fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none">
                <User size={8} className="text-emerald-500" /> No Objection Certificate
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small" className="h-7 px-2 fz-caption font-bold" onClick={handleReset}>Reset</Button>
            <Button icon={<Printer size={11} />} size="small" className="h-7 px-2 fz-caption font-bold" onClick={handlePrint} disabled={!certificateData}>Print</Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-2 flex gap-2">
          <div className="w-[260px] flex flex-col gap-2 shrink-0 no-print">
            <div className="bg-white/95 backdrop-blur-sm border border-emerald-200/60 rounded-lg overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Member</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <Input.Search
                  value={memberNo}
                  onChange={e => setMemberNo(e.target.value)}
                  onSearch={() => setShowLookup(true)}
                  placeholder="Member No"
                  size="small"
                  className="h-8 fz-label font-semibold"
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
                <Input value={memberName} readOnly placeholder="Member name" size="small" className="fz-caption" />
              </div>
            </div>

            <Button type="primary" block size="small" icon={<Search size={11} />} onClick={handleGenerate} loading={loading} className="h-8 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 font-black uppercase tracking-wider fz-caption mt-1 shadow-lg">Generate</Button>
          </div>

          <div className="flex-1 bg-white/95 backdrop-blur-sm border border-emerald-200/60 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-3 py-1.5 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-1.5">
                <div className="bg-white/20 p-1 rounded-md shadow-sm"><FileText size={12} className="text-white" /></div>
                <div>
                  <h3 className="fz-caption font-black text-white uppercase tracking-wide leading-none">Loan Nil Certificate</h3>
                  <p className="fz-caption font-bold text-emerald-200 uppercase mt-0.5 tracking-tight leading-none">Member: {memberNo || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <Spin spinning={loading} tip="Loading...">
                {certificateData ? (
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
                          {certificateData.outstandingLoans.map((loan: any, idx: number) => (
                            <div key={idx} className="fz-body text-slate-700 ml-6">• {loan.headName} (Case: {loan.headCode}) — Balance: ₹{(loan.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          ))}
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
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner"><FileText className="text-4xl text-emerald-200" /></div>
                    <h4 className="text-slate-400 font-black fz-label uppercase tracking-wider">No Certificate</h4>
                    <p className="text-slate-300 fz-caption mt-1 font-semibold">Enter member number and generate certificate</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>

      <Modal title={<div className="flex items-center gap-2 py-1"><div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md"><Users size={16} className="text-white" /></div><div><div className="fz-body font-black text-slate-800">Member Lookup</div><div className="fz-caption text-slate-400 font-bold uppercase tracking-wide">Select Member</div></div></div>} open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={1000} centered destroyOnClose>
        <div className="p-2"><MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} /></div>
      </Modal>
    </ConfigProvider>
  );
};

export default LoanNilCertificate;
