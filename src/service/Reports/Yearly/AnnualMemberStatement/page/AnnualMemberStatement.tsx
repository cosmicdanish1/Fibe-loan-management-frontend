import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, Button, DatePicker, ConfigProvider, Radio, Tooltip, theme as antdTheme } from 'antd';
import {
  FileText, Printer, Search, Calendar, Building,
  RotateCcw, ShieldCheck, Settings, RefreshCw, IndianRupee, Monitor
} from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';

const { Option } = Select;

const PAGE_SIZE = 25;
const W_MBNO = 10;   // member number column width
const W_NAME = 24;   // name column width
const W_VAL  = 13;   // each value column width (right-aligned)
const SEP = '─'.repeat(W_MBNO + 1 + W_NAME + 2 + W_VAL * 4 + 3);

interface AnnualStatementItem {
  key: string;
  accountNo: string;
  memberNo: string;
  memberName: string;
  opThriftAmount: number;
  curThriftAmount: number;
  opShareAmount: number;
  curShareAmount: number;
  regularLoanBalance: number;
  termLoanBalance: number;
}

const AnnualMemberStatement: React.FC = () => {
  const [wings, setWings]               = useState<{ wingNo: string; name: string }[]>([]);
  const [offices, setOffices]           = useState<any[]>([]);
  const [selectedWing, setSelectedWing] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [asOnDate, setAsOnDate]         = useState<dayjs.Dayjs>(dayjs());
  const [outputMode, setOutputMode]     = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]           = useState<boolean>(false);
  const [data, setData]                 = useState<AnnualStatementItem[]>([]);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const bg    = isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50';
  const side  = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60';
  const hdr   = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200/60';
  const pHdr  = isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-indigo-50/50 border-slate-100';
  const text  = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const rpBg  = isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-[#fffff0] border-slate-300 text-slate-800';

  // Load wings on mount
  useEffect(() => {
    apiService.getWingList().then((res: any) => {
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setWings(list.map((w: any) => ({ wingNo: String(w.wingNo ?? ''), name: w.name ?? '' })));
      }
    }).catch(() => {});
  }, []);

  // Load offices when wing changes
  useEffect(() => {
    if (selectedWing) {
      apiService.getReportOffices(selectedWing).then((res: any) => {
        if (res?.success) {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
          setOffices(list);
        }
      }).catch(() => {});
      setSelectedOffice('');
    } else {
      setOffices([]);
      setSelectedOffice('');
    }
  }, [selectedWing]);

  const handleGenerate = useCallback(async (): Promise<AnnualStatementItem[]> => {
    setLoading(true);
    try {
      const res = await apiService.getAnnualMemberStatement(
        selectedWing || undefined,
        selectedOffice || undefined,
        asOnDate.format('YYYY-MM-DD')
      );
      if (res?.success) {
        const rows: AnnualStatementItem[] = res.data?.reportData
          ?? (Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
        setData(rows);
        return rows;
      }
    } catch (e) {
      console.error('AnnualMemberStatement fetch error:', e);
    } finally {
      setLoading(false);
    }
    setData([]);
    return [];
  }, [selectedWing, selectedOffice, asOnDate]);

  const handleLoad = async () => {
    const rows = await handleGenerate();
    if (outputMode === 'printer' && rows.length > 0) printWithData(rows);
  };

  const handleReset = () => {
    setSelectedWing('');
    setSelectedOffice('');
    setAsOnDate(dayjs());
    setData([]);
    setOutputMode('screen');
  };

  const fmt = useCallback((n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0), []);

  const totals = useMemo(() => data.reduce((acc, r) => ({
    regularLoan: acc.regularLoan + (r.regularLoanBalance || 0),
    termLoan:    acc.termLoan    + (r.termLoanBalance    || 0),
    share:       acc.share       + (r.curShareAmount     || 0),
    thrift:      acc.thrift      + (r.curThriftAmount    || 0),
  }), { regularLoan: 0, termLoan: 0, share: 0, thrift: 0 }), [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  const wingName   = wings.find(w => w.wingNo === selectedWing)?.name ?? selectedWing;
  const officeName = offices.find((o: any) => String(o.officeNo) === selectedOffice)?.name ?? '';
  const officeLabel = selectedOffice
    ? `${selectedOffice}-${officeName}`
    : 'All Offices';

  const PFX = W_MBNO + 1 + W_NAME + 2; // prefix width before value columns (37)

  const buildPageText = (pageRows: AnnualStatementItem[], pageNum: number, isLast: boolean, pageTotal: { rl: number; tl: number; sh: number; th: number }) => {
    const colHdr =
      `${'MbNo'.padEnd(W_MBNO)} ${'Name'.padEnd(W_NAME)} |` +
      `${'R. LOAN BAL'.padStart(W_VAL)}|` +
      `${'E. LOAN BAL'.padStart(W_VAL)}|` +
      `${'SHARE BAL'.padStart(W_VAL)}|` +
      `${'THRIFT'.padStart(W_VAL)}`;

    const rows = pageRows.map(r => {
      const mbno = (r.memberNo || r.accountNo || '').substring(0, W_MBNO).padEnd(W_MBNO);
      const name = (r.memberName || '').substring(0, W_NAME).padEnd(W_NAME);
      const rl   = fmt(r.regularLoanBalance).padStart(W_VAL);
      const tl   = fmt(r.termLoanBalance).padStart(W_VAL);
      const sh   = fmt(r.curShareAmount).padStart(W_VAL);
      const th   = fmt(r.curThriftAmount).padStart(W_VAL);
      return `${mbno} ${name} |${rl}|${tl}|${sh}|${th}`;
    }).join('\n');

    const totalLine =
      `${'Total For Page : ' + pageNum}`.padEnd(PFX) +
      `|${fmt(pageTotal.rl).padStart(W_VAL)}` +
      `|${fmt(pageTotal.tl).padStart(W_VAL)}` +
      `|${fmt(pageTotal.sh).padStart(W_VAL)}` +
      `|${fmt(pageTotal.th).padStart(W_VAL)}`;

    return [
      `${' '.repeat(50)}Page Number : ${pageNum}`,
      SEP,
      colHdr,
      SEP,
      rows,
      SEP,
      totalLine,
      SEP,
      ...(isLast ? [] : ['Contd.....']),
    ].join('\n');
  };

  const buildFullReportText = (rows: AnnualStatementItem[]) => {
    const header = [
      `${' '.repeat(8)}Espat Karmchari Co-Operative Credit Society Limited.`,
      `${' '.repeat(4)}Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006`,
      `${' '.repeat(20)}Reg No: A.R/DRG/1796`,
      '',
      SEP,
      `Wing : ${selectedWing || '-'} Name : ${wingName}`,
      `Office : ${selectedOffice || '-'} Name : ${officeLabel}`,
      `Report As On Date : ${asOnDate.format('DD-MMM-YYYY')}`,
      `Date : ${dayjs().format('DD-MMM-YYYY/ h:mmA')}`,
    ].join('\n');

    const pages: string[] = [];
    for (let p = 0; p < totalPages; p++) {
      const slice = rows.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
      const pt = slice.reduce((a, r) => ({
        rl: a.rl + (r.regularLoanBalance || 0),
        tl: a.tl + (r.termLoanBalance    || 0),
        sh: a.sh + (r.curShareAmount     || 0),
        th: a.th + (r.curThriftAmount    || 0),
      }), { rl: 0, tl: 0, sh: 0, th: 0 });
      pages.push(buildPageText(slice, p + 1, p === totalPages - 1, pt));
    }

    const grandTotal =
      `${'Grand Total'.padEnd(PFX)}` +
      `|${fmt(totals.regularLoan).padStart(W_VAL)}` +
      `|${fmt(totals.termLoan).padStart(W_VAL)}` +
      `|${fmt(totals.share).padStart(W_VAL)}` +
      `|${fmt(totals.thrift).padStart(W_VAL)}`;

    return [header, ...pages, SEP, grandTotal, SEP].join('\n');
  };

  const buildPrintHtml = (rows: AnnualStatementItem[]) => `<!DOCTYPE html><html><head>
<title>Annual Member Statement</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 10px; margin: 15px; background: white; color: black; }
  pre { white-space: pre; }
  @page { size: landscape; margin: 10mm; }
</style></head><body><pre>${buildFullReportText(rows)}</pre></body></html>`;

  const printWithData = (rows: AnnualStatementItem[]) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(buildPrintHtml(rows)); doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus(); iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    }
  };

  const handlePrint = () => { if (data.length > 0) printWithData(data); };

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: { colorPrimary: '#4f46e5', borderRadius: 8, fontSize: 13,
        colorBgContainer: isDark ? '#1e293b' : '#ffffff',
        colorBorder: isDark ? '#334155' : '#e2e8f0' },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${bg}`}>

        {/* Header */}
        <div className={`px-4 py-2.5 flex items-center justify-between z-10 shadow-sm shrink-0 border-b ${hdr}`}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-2 rounded-lg text-white shadow-md">
              <FileText size={18} />
            </div>
            <div>
              <h1 className={`fz-body font-extrabold tracking-tight leading-none ${text}`}>Annual Member Statement</h1>
              <div className={`flex items-center gap-1.5 mt-0.5 fz-caption font-semibold uppercase tracking-wide leading-none ${muted}`}>
                <ShieldCheck size={10} className="text-indigo-500" /> Yearly Financial Summary
              </div>
            </div>
          </div>
          <Button
            icon={<Printer size={13} />}
            size="small"
            className="h-8 px-3 fz-caption font-bold uppercase"
            onClick={handlePrint}
            disabled={data.length === 0}
          >
            Print
          </Button>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Sidebar */}
          <div className="w-[280px] flex flex-col gap-3 shrink-0">

            <div className={`rounded-xl overflow-hidden shadow-sm border ${side}`}>
              <div className={`border-b px-3 py-2 flex items-center justify-between ${pHdr}`}>
                <h3 className={`fz-caption font-extrabold tracking-wide uppercase flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Settings size={12} className="text-indigo-600" /> Parameters
                </h3>
                <Tooltip title="Reload">
                  <Button type="text" size="small" icon={<RefreshCw size={11} />} onClick={handleLoad} className="h-6 w-6" />
                </Tooltip>
              </div>

              <div className="p-3 space-y-3">

                {/* Wing - Division/RO */}
                <div className="space-y-1">
                  <label className={`fz-caption font-bold uppercase tracking-tight flex items-center gap-1 ${muted}`}>
                    <Building size={10} className="text-blue-500" /> Division/RO
                  </label>
                  <Select
                    className="w-full h-8"
                    placeholder="Select Wing"
                    value={selectedWing || undefined}
                    onChange={v => setSelectedWing(v ?? '')}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {wings.map(w => <Option key={w.wingNo} value={w.wingNo}>{w.name}</Option>)}
                  </Select>
                </div>

                {/* Branch - Office */}
                <div className="space-y-1">
                  <label className={`fz-caption font-bold uppercase tracking-tight flex items-center gap-1 ${muted}`}>
                    <Building size={10} className="text-indigo-500" /> Branch
                  </label>
                  <Select
                    className="w-full h-8"
                    placeholder={selectedWing ? 'All Offices' : 'Select Wing first'}
                    value={selectedOffice || undefined}
                    onChange={v => setSelectedOffice(v ?? '')}
                    disabled={!selectedWing}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {offices.map((o: any) => (
                      <Option key={o.officeNo} value={String(o.officeNo)}>
                        {o.officeNo}-{o.name}
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* As On Date */}
                <div className="space-y-1">
                  <label className={`fz-caption font-bold uppercase tracking-tight flex items-center gap-1 ${muted}`}>
                    <Calendar size={10} className="text-amber-500" /> As On Date
                  </label>
                  <DatePicker
                    className="w-full h-8 fz-label"
                    format="DD-MMM-YYYY"
                    value={asOnDate}
                    onChange={date => date && setAsOnDate(date)}
                  />
                </div>

                {/* Output */}
                <div className="space-y-1.5">
                  <label className={`fz-caption font-bold uppercase tracking-tight ${muted}`}>Output</label>
                  <Radio.Group size="small" value={outputMode} onChange={e => setOutputMode(e.target.value)} className="w-full">
                    <Radio.Button value="screen" className="w-1/2 text-center fz-caption font-bold">
                      <span className="flex items-center justify-center gap-1"><Monitor size={11} /> Screen</span>
                    </Radio.Button>
                    <Radio.Button value="printer" className="w-1/2 text-center fz-caption font-bold">
                      <span className="flex items-center justify-center gap-1"><Printer size={11} /> Printer</span>
                    </Radio.Button>
                  </Radio.Group>
                </div>

                <div className="flex gap-2">
                  <Button size="small" icon={<RotateCcw size={13} />} onClick={handleReset}
                    className="flex-1 h-8 fz-caption font-bold uppercase">Reset</Button>
                  <Button type="primary" size="small" icon={<Search size={13} />} onClick={handleLoad} loading={loading}
                    className="flex-1 h-9 bg-gradient-to-r from-indigo-600 to-indigo-700 font-bold uppercase fz-caption shadow-md">
                    Load
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats */}
            {data.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                <div className={`rounded-lg p-3 shadow-sm border flex items-center justify-between ${side}`}>
                  <div>
                    <div className={`fz-caption font-bold uppercase ${muted}`}>Members</div>
                    <div className={`fz-heading font-black font-mono ${text}`}>{data.length}</div>
                  </div>
                  <FileText size={18} className="text-indigo-400" />
                </div>
                <div className={`rounded-lg p-3 shadow-sm border flex items-center justify-between ${side}`}>
                  <div>
                    <div className={`fz-caption font-bold uppercase ${muted}`}>Total Pages</div>
                    <div className={`fz-heading font-black font-mono ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{totalPages}</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg p-3 text-white shadow-md relative overflow-hidden">
                  <IndianRupee size={40} className="absolute -right-1 -bottom-1 opacity-10" />
                  <div className="fz-caption font-bold uppercase opacity-90 mb-0.5">R. Loan Total</div>
                  <div className="fz-body font-black font-mono relative z-10">₹{fmt(totals.regularLoan)}</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-3 text-white shadow-md relative overflow-hidden">
                  <IndianRupee size={40} className="absolute -right-1 -bottom-1 opacity-10" />
                  <div className="fz-caption font-bold uppercase opacity-90 mb-0.5">Share Total</div>
                  <div className="fz-body font-black font-mono relative z-10">₹{fmt(totals.share)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Report Panel */}
          <div className={`flex-1 rounded-xl shadow-sm flex flex-col overflow-hidden border ${side}`}>
            <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${pHdr}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-100'}`}>
                  <FileText size={14} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className={`fz-label font-extrabold uppercase tracking-wide leading-none ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    Members Statement
                  </h3>
                  <p className={`fz-caption font-semibold uppercase mt-0.5 tracking-tight ${muted}`}>
                    {wingName || 'All Wings'} • {officeLabel} • {asOnDate.format('DD-MMM-YYYY')}
                    {data.length > 0 && ` • ${data.length} records • ${totalPages} pages`}
                  </p>
                </div>
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3" />
                  <span className={`font-bold ${muted}`}>Loading statement data...</span>
                </div>
              ) : data.length > 0 ? (
                <div className={`font-mono text-xs rounded-lg border p-4 overflow-x-auto ${rpBg}`}>
                  <pre style={{ fontFamily: "'Courier New', Courier, monospace", lineHeight: '1.4', fontSize: '12px' }} className="whitespace-pre">{buildFullReportText(data)}</pre>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <FileText size={60} className="text-slate-300 mb-4" />
                  <h3 className="fz-label font-bold text-slate-400 uppercase tracking-wide">No Statement Data</h3>
                  <p className="fz-caption font-medium text-slate-300 uppercase mt-1.5 text-center max-w-[200px]">
                    Select wing and branch then click Load
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-2 flex items-center justify-between shrink-0 border-t ${hdr}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span className={`fz-caption font-bold uppercase tracking-wide ${muted}`}>Annual Reports v2</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`fz-caption font-semibold uppercase tracking-tight ${muted}`}>
              Date: {asOnDate.format('DD-MMM-YYYY')}
            </span>
            <div className="w-px h-2.5 bg-slate-200" />
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-2 py-0.5 rounded fz-caption font-bold text-indigo-600 uppercase">
              v5.7.0
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default AnnualMemberStatement;
