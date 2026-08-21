import React, { useState, useCallback, useEffect } from 'react';
import { ConfigProvider, Button, Spin, Radio, message, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { FileText, Printer, Search, RotateCcw, Lock, Monitor } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';

interface LienItem {
  key: string;
  memberNo: string;
  memberName: string;
  loanCaseNo: string;
  fdrdAccountNumber: string;
  lienFromDate: string;
}

// ── text helpers ──────────────────────────────────────────────────
const W = 90;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const col = (s: string, w: number, align: 'l' | 'r' = 'l') =>
  align === 'l' ? s.substring(0, w).padEnd(w) : s.substring(0, w).padStart(w);

const fmtDate = (d?: string) => (d ? dayjs(d).format('DD-MMM-YYYY') : '---');

const buildReportText = (data: LienItem[]): string => {
  const lines: string[] = [];

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(ctr('Reg No: A.R/DRG/1796'));
  lines.push('');
  lines.push(ctr('Lien Account Information'));
  lines.push('');
  lines.push(rl());
  lines.push('');

  // Header matching legacy: MB No, Member Name, Loan A/c, FD A/c, Lien Date
  lines.push(
    col('MB No', 12) +
    col('Member Name', 28) +
    col('Loan A/c', 14) +
    col('FD A/c', 18) +
    col('Lien Date', 14)
  );
  lines.push(rl());

  if (data.length === 0) {
    lines.push(ctr('No lien accounts found'));
  } else {
    data.forEach(item => {
      lines.push(
        col(String(item.memberNo), 12) +
        col(item.memberName, 28) +
        col(String(item.loanCaseNo), 14) +
        col(item.fdrdAccountNumber || '', 18) +
        col(fmtDate(item.lienFromDate), 14)
      );
    });
  }

  lines.push(rl());
  lines.push('');
  lines.push(ctr('Report as per data available'));

  return lines.join('\n');
};

const printReportText = (text: string) => {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const doc = `<html><head><style>
    @page{size:portrait;margin:15mm}
    body{font-family:'Courier New',monospace;font-size:10pt;white-space:pre;background:white;color:#000}
  </style></head><body>${escaped}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(doc);
  iframe.contentDocument!.close();
  setTimeout(() => iframe.contentWindow!.print(), 100);
  setTimeout(() => document.body.removeChild(iframe), 1500);
};

const LienAccountInformation: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportText, setReportText] = useState('');
  const [recordCount, setRecordCount] = useState(0);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/reports/lien-account-information');
      const items: LienItem[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response) ? (response as any) : [];

      const text = buildReportText(items);
      setReportText(text);
      setRecordCount(items.length);

      if (items.length === 0) message.info('No lien accounts found');
      else if (outputType === 'printer') printReportText(text);
    } catch {
      message.error('Failed to load lien account information');
      setReportText('');
      setRecordCount(0);
    } finally {
      setLoading(false);
    }
  }, [outputType]);

  useEffect(() => { handleGenerate(); }, []);

  const handleReset = useCallback(() => {
    setReportText('');
    setRecordCount(0);
  }, []);

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#06b6d4', borderRadius: 6, fontSize: 12 },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-cyan-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 p-1.5 rounded-lg text-white shadow-md">
              <Lock size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Lien Account Information</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                <Lock size={8} className="inline text-cyan-500 mr-1" />Secured Accounts
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small" className="h-7 fz-caption font-bold" onClick={handleReset}>Reset</Button>
            <Button icon={<Printer size={11} />} size="small" className="h-7 fz-caption font-bold"
              onClick={() => reportText && printReportText(reportText)} disabled={!reportText}>Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar LEFT */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0">

            <div className={`border rounded-lg p-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-cyan-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-cyan-600 to-cyan-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>

            {recordCount > 0 && (
              <div className={`text-center fz-caption font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                {recordCount} lien account{recordCount !== 1 ? 's' : ''} found
              </div>
            )}
          </div>

          {/* Report Area RIGHT */}
          <div className={`flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-cyan-200/60'}`}>
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Lock size={12} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Lien Account Information</span>
              </div>
              {recordCount > 0 && (
                <span className="fz-caption font-black text-white bg-white/20 px-2 py-0.5 rounded">{recordCount} Records</span>
              )}
            </div>

            <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} size="small">
                {reportText ? (
                  <pre className={`font-mono fz-caption leading-[1.5] whitespace-pre select-text ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    {reportText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Lock size={40} className="text-cyan-200" />
                    </div>
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Data</p>
                    <p className="fz-caption text-slate-300 mt-1">Click Generate to load lien accounts</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default LienAccountInformation;
