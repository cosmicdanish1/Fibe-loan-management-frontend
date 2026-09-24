import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DatePicker, Button, ConfigProvider, Select, Radio, theme as antdTheme } from 'antd';
import { Printer, CreditCard, Building2, Search, Monitor } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../store';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';

const { Option } = Select;

interface DividendPaidData {
  memberNo: string;
  memberName: string;
  officeName: string;
  dividendAmount: number;
  paymentDate: string;
  paymentMode: string;
  chequeNo: string;
  voucherNo: string;
}

const DividendPaid: React.FC = () => {
  const [selectedWing, setSelectedWing] = useState<string>('');
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('year'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [outputMode, setOutputMode] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<DividendPaidData[]>([]);
  const [wings, setWings] = useState<{ wingNo: string; name: string }[]>([]);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const bg       = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const sidebar  = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const divider  = isDark ? 'border-slate-700' : 'border-slate-200';
  const text     = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted    = isDark ? 'text-slate-400' : 'text-slate-500';
  const lbl      = isDark ? 'text-slate-300' : 'text-slate-700';
  const rpBg     = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300';
  const rpTxt    = isDark ? 'text-slate-200' : 'text-slate-800';
  const rpMuted  = isDark ? 'text-slate-400' : 'text-slate-600';

  useEffect(() => {
    apiService.getWingList().then((res: any) => {
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : [];
        setWings(list.map((w: any) => ({ wingNo: String(w.wingNo ?? ''), name: w.name ?? '' })));
      }
    }).catch(() => {});
    doFetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doFetch = async (): Promise<DividendPaidData[]> => {
    if (!fromDate || !toDate) return [];
    setLoading(true);
    try {
      const response = await apiService.getDividendPaid(
        selectedWing || '',
        fromDate.format('YYYY-MM-DD'),
        toDate.format('YYYY-MM-DD')
      );
      if (response?.success) {
        const rows: DividendPaidData[] = Array.isArray(response.data)
          ? response.data
          : (response.data?.data ?? []);
        setData(rows);
        return rows;
      }
    } catch (e: any) {
      console.error('DividendPaid fetch error:', e);
    } finally {
      setLoading(false);
    }
    setData([]);
    return [];
  };

  const formatCurrency = useCallback((amount: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0),
  []);

  const formatDate = (dateStr: string) =>
    dateStr ? dayjs(dateStr).format('DD-MMM-YYYY') : '';

  const totalAmount = useMemo(() =>
    data.reduce((acc, r) => acc + (r.dividendAmount || 0), 0), [data]);

  const asOnDate   = dayjs().format('DD-MMM-YYYY/hh:mmA');
  const fromStr    = fromDate?.format('DD-MMM-YYYY') ?? '';
  const toStr      = toDate?.format('DD-MMM-YYYY') ?? '';

  const buildReportHtml = (rows: DividendPaidData[]) => {
    const LINE = '─'.repeat(72);
    const bodyLines = rows.map((r, i) => {
      const sr   = String(i + 1).padEnd(8);
      const dt   = formatDate(r.paymentDate).padEnd(14);
      const vou  = (r.voucherNo || '-').substring(0, 9).padEnd(10);
      const mbno = (r.memberNo || '-').padEnd(8);
      const nm   = (r.memberName || '-').substring(0, 18).padEnd(19);
      const wg   = (r.officeName || '-').substring(0, 10).padEnd(11);
      const amt  = formatCurrency(r.dividendAmount).padStart(10);
      return `${sr}${dt}${vou}${mbno}${nm}${wg}${amt}`;
    }).join('\n');

    const totalLine     = `${' '.repeat(45)}Total : - ${formatCurrency(totalAmount).padStart(11)}`;
    const underlineLine = `${' '.repeat(54)}${'─'.repeat(15)}`;

    const reportText = [
      `${' '.repeat(10)}Espat Karmchari Co-Operative Credit Society Limited.`,
      `${' '.repeat(5)}Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006`,
      `Reg No : A.R/DRG/1796${' '.repeat(29)}Tel No : 0788-2298736`,
      '',
      `${' '.repeat(24)}Dividend Payment List`,
      LINE,
      `As On Date :- ${asOnDate}`,
      `Report From Date : - ${fromStr}  To Date : - ${toStr}    Page No :1`,
      LINE,
      `Sr.No   Date          Vou.NO    MBNO    Name                Wing        Amount`,
      LINE,
      bodyLines,
      LINE,
      totalLine,
      underlineLine,
    ].join('\n');

    return `<!DOCTYPE html><html><head><title>Dividend Payment List</title>
<style>
  body { font-family: 'Courier New', Courier, monospace; font-size: 11px; margin: 20px; background: white; color: black; }
  pre { white-space: pre; }
  @page { margin: 15mm; }
</style></head><body><pre>${reportText}</pre></body></html>`;
  };

  const printInIframe = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    }
  };

  const handleLoad = async () => {
    const rows = await doFetch();
    if (outputMode === 'printer' && rows.length > 0) {
      printInIframe(buildReportHtml(rows));
    }
  };

  const handlePrint = () => {
    if (data.length === 0) return;
    printInIframe(buildReportHtml(data));
  };

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: { colorPrimary: '#10b981', borderRadius: 8 },
    }}>
      <div className={`dividend-paid-page h-screen flex flex-col font-sans overflow-hidden ${bg}`}>
        <div className="dividend-paid-topbar bg-gradient-to-r from-slate-900 to-slate-900 px-3 py-1.5 flex items-center shrink-0 shadow-lg border-b border-white/5">
          <h1 className="fz-caption font-black text-white tracking-tight uppercase">5.3.2 Dividend Paid</h1>
        </div>
        <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <div className={`dividend-paid-sidebar w-72 flex flex-col shrink-0 border-r ${sidebar}`}>

          {/* Header */}
          <div className={`p-4 border-b ${divider}`}>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-lg text-white shadow-lg">
                <CreditCard size={18} />
              </div>
              <div>
                <h1 className={`fz-heading font-black tracking-tight ${text}`}>5.3.2 Dividend Paid</h1>
                <div className={`flex items-center gap-1 mt-0.5 fz-label font-bold uppercase tracking-wider ${muted}`}>
                  <Building2 size={10} className="text-emerald-500" />
                  Payment Register
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">

            <div>
              <label className={`block fz-label font-bold mb-1 ${lbl}`}>Wing Name</label>
              <Select
                value={selectedWing || undefined}
                onChange={(v) => setSelectedWing(v ?? '')}
                className="w-full h-9"
                placeholder="All Wings"
                allowClear
              >
                {wings.map(w => <Option key={w.wingNo} value={w.wingNo}>{w.name}</Option>)}
              </Select>
            </div>

            <div>
              <label className={`block fz-label font-bold mb-1 ${lbl}`}>From Date</label>
              <DatePicker
                value={fromDate}
                onChange={setFromDate}
                className="w-full h-9"
                format="DD MMM YYYY"
              />
            </div>

            <div>
              <label className={`block fz-label font-bold mb-1 ${lbl}`}>To Date</label>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                className="w-full h-9"
                format="DD MMM YYYY"
              />
            </div>

            <div>
              <label className={`block fz-label font-bold mb-2 ${lbl}`}>Output</label>
              <Radio.Group value={outputMode} onChange={e => setOutputMode(e.target.value)}>
                <Radio value="screen">
                  <span className={`fz-label font-semibold flex items-center gap-1 ${text}`}>
                    <Monitor size={12} /> Screen
                  </span>
                </Radio>
                <Radio value="printer">
                  <span className={`fz-label font-semibold flex items-center gap-1 ${text}`}>
                    <Printer size={12} /> Printer
                  </span>
                </Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary"
              icon={outputMode === 'printer' ? <Printer size={14} /> : <Search size={14} />}
              onClick={handleLoad}
              loading={loading}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 font-bold fz-body"
            >
              {loading ? 'Loading...' : outputMode === 'printer' ? 'Print' : 'Load'}
            </Button>
          </div>

          {/* Summary */}
          {data.length > 0 && (
            <div className={`p-4 border-t ${divider} space-y-2`}>
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className={`fz-label font-bold uppercase ${muted}`}>Total Amount</div>
                <div className={`fz-heading font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  ₹{formatCurrency(totalAmount)}
                </div>
                <div className={`fz-label mt-0.5 ${muted}`}>{data.length} records • Total Pages: 1</div>
              </div>
            </div>
          )}
        </div>

        {/* Report Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className={`dividend-paid-reportbar px-4 py-3 shrink-0 border-b flex items-center justify-between ${sidebar}`}>
            <div>
              <h2 className={`fz-heading font-black ${text}`}>Dividend Payment List</h2>
              <p className={`fz-label mt-0.5 ${muted}`}>
                {fromDate && toDate
                  ? `${fromDate.format('DD MMM YYYY')} to ${toDate.format('DD MMM YYYY')}`
                  : 'Select dates and load'}
                {data.length > 0 && ` • ${data.length} records`}
              </p>
            </div>
            {data.length > 0 && (
              <Button
                icon={<Printer size={16} />}
                onClick={handlePrint}
                className="h-9 px-4 fz-body font-bold"
              >
                Print
              </Button>
            )}
          </div>

          {/* Monospace report */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3" />
                <span className={`font-bold ${muted}`}>Loading payment data...</span>
              </div>
            ) : data.length > 0 ? (
              <div className={`dividend-paid-report font-mono text-xs rounded-lg border p-5 overflow-x-auto ${rpBg}`}>
                {/* Company Header */}
                <div className={`text-center ${rpTxt} font-semibold`}>
                  Espat Karmchari Co-Operative Credit Society Limited.
                </div>
                <div className={`text-center ${rpMuted}`}>
                  Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006
                </div>
                <div className={`flex justify-between ${rpMuted}`}>
                  <span>Reg No : A.R/DRG/1796</span>
                  <span>Tel No : 0788-2298736</span>
                </div>

                <div className={`text-center font-bold mt-3 mb-1 ${rpTxt}`}>Dividend Payment List</div>

                <div className={`border-b border-dashed mb-1 ${isDark ? 'border-slate-600' : 'border-slate-400'}`} />

                <div className={rpMuted}>As On Date :- {asOnDate}</div>
                <div className={`mb-1 ${rpMuted}`}>
                  Report From Date : - {fromStr}{'  '}To Date : - {toStr}{'    '}Page No :1
                </div>

                <div className={`border-b border-dashed mb-1 ${isDark ? 'border-slate-600' : 'border-slate-400'}`} />

                {/* Column Headers */}
                <div className={`font-bold whitespace-pre ${rpTxt}`}>
                  {'Sr.No   Date          Vou.NO    MBNO    Name                Wing        Amount'}
                </div>

                <div className={`border-b border-dashed mb-1 ${isDark ? 'border-slate-600' : 'border-slate-400'}`} />

                {/* Data Rows */}
                {data.map((r, i) => {
                  const sr   = String(i + 1).padEnd(8);
                  const dt   = formatDate(r.paymentDate).padEnd(14);
                  const vou  = (r.voucherNo || '-').substring(0, 9).padEnd(10);
                  const mbno = (r.memberNo || '-').padEnd(8);
                  const nm   = (r.memberName || '-').substring(0, 18).padEnd(19);
                  const wg   = (r.officeName || '-').substring(0, 10).padEnd(11);
                  const amt  = formatCurrency(r.dividendAmount).padStart(10);
                  return (
                    <div key={i} className={`whitespace-pre hover:${isDark ? 'bg-slate-800' : 'bg-slate-50'} ${rpTxt} flex items-center`}>
                      <span>{`${sr}${dt}${vou}${mbno}${nm}${wg}`}</span>
                      {r.dividendAmount > 0 && <CrDrIndicator type="credit" className="mr-1" />}
                      <span>{amt}</span>
                    </div>
                  );
                })}

                <div className={`border-b border-dashed mt-1 mb-1 ${isDark ? 'border-slate-600' : 'border-slate-400'}`} />

                {/* Total footer */}
                <div className={`whitespace-pre ${rpTxt}`}>
                  {`${' '.repeat(45)}Total : - ${formatCurrency(totalAmount).padStart(11)}`}
                </div>
                <div className={`whitespace-pre ${rpMuted}`}>
                  {`${' '.repeat(54)}${'─'.repeat(15)}`}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <CreditCard size={48} className="text-slate-300 mx-auto mb-3" />
                <h3 className={`fz-body font-bold uppercase ${muted}`}>No Data Loaded</h3>
                <p className={`fz-label mt-1 ${muted}`}>Select Wing, From Date, To Date and click Load</p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      <style>{`
        /* ── Dividend Paid — dark mode (reinforces the page's own isDark styling) ── */
        html.dark .dividend-paid-page { background-color: #000000 !important; }
        html.dark .dividend-paid-topbar { background-image: none !important; background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dividend-paid-sidebar,
        html.dark .dividend-paid-reportbar { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dividend-paid-report { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dividend-paid-page label { color: #8e8e93 !important; }
        html.dark .dividend-paid-page .ant-select-selector,
        html.dark .dividend-paid-page .ant-picker { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dividend-paid-page .ant-picker input { color: #f5f5f7 !important; }
        html.dark .dividend-paid-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default DividendPaid;
