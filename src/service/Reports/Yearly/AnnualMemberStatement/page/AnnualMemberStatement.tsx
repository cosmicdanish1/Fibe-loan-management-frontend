import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { isFailure, notifyError, toastError } from '@/utils/dialog';
import { FileText, Printer, Search, RotateCcw, Building } from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import { escapeHtml } from '@/utils/html';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import { useAnnualSpec } from '../views/annualPro';

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

  // Load wings on mount
  useEffect(() => {
    apiService.getWingList().then((res: any) => {
      if (isFailure(res)) toastError(res, 'load the wing list');
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
      if (isFailure(res)) await notifyError(res, 'load the annual member statement');
      if (res?.success) {
        const rows: AnnualStatementItem[] = res.data?.reportData
          ?? (Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
        setData(rows);
        return rows;
      }
    } catch (e) {
      console.error('AnnualMemberStatement fetch error:', e);
      await notifyError(null, 'load the annual member statement');
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
      `${'T. LOAN BAL'.padStart(W_VAL)}|` +
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

    // Derive page count and grand totals from the rows passed in (not from state, which is
    // stale when printing straight after loadData()).
    const rowTotalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const rowTotals = rows.reduce((acc, r) => ({
      regularLoan: acc.regularLoan + (r.regularLoanBalance || 0),
      termLoan:    acc.termLoan    + (r.termLoanBalance    || 0),
      share:       acc.share       + (r.curShareAmount     || 0),
      thrift:      acc.thrift      + (r.curThriftAmount    || 0),
    }), { regularLoan: 0, termLoan: 0, share: 0, thrift: 0 });

    const pages: string[] = [];
    for (let p = 0; p < rowTotalPages; p++) {
      const slice = rows.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
      const pt = slice.reduce((a, r) => ({
        rl: a.rl + (r.regularLoanBalance || 0),
        tl: a.tl + (r.termLoanBalance    || 0),
        sh: a.sh + (r.curShareAmount     || 0),
        th: a.th + (r.curThriftAmount    || 0),
      }), { rl: 0, tl: 0, sh: 0, th: 0 });
      pages.push(buildPageText(slice, p + 1, p === rowTotalPages - 1, pt));
    }

    const grandTotal =
      `${'Grand Total'.padEnd(PFX)}` +
      `|${fmt(rowTotals.regularLoan).padStart(W_VAL)}` +
      `|${fmt(rowTotals.termLoan).padStart(W_VAL)}` +
      `|${fmt(rowTotals.share).padStart(W_VAL)}` +
      `|${fmt(rowTotals.thrift).padStart(W_VAL)}`;

    return [header, ...pages, SEP, grandTotal, SEP].join('\n');
  };

  const buildPrintHtml = (rows: AnnualStatementItem[]) => `<!DOCTYPE html><html><head>
<title>Annual Member Statement</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 10px; margin: 15px; background: white; color: black; }
  pre { white-space: pre; }
  @page { size: landscape; margin: 10mm; }
</style></head><body><pre>${escapeHtml(buildFullReportText(rows))}</pre></body></html>`;

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

  const { enabled, view, setView } = useReportViews('yearly.annual-member-statement');
  const spec = useAnnualSpec(data, asOnDate.format('DD MMM YYYY'));

  const hasData = data.length > 0;
  const asOn = asOnDate.format('DD-MMM-YYYY');

  return (
    <ReportShell
      className="ams-page aw-calm"
      title="Annual Member Statement"
      desc="Yearly financial summary by wing and branch"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Building size={14} />}>
            <div>
              <label className="aw-label" htmlFor="ams-wing">Division / RO</label>
              <select id="ams-wing" className="aw-input" value={selectedWing} onChange={e => setSelectedWing(e.target.value)}>
                <option value="">All wings</option>
                {wings.map(w => <option key={w.wingNo} value={w.wingNo}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="aw-label" htmlFor="ams-office">Branch</label>
              <select id="ams-office" className="aw-input" value={selectedOffice} onChange={e => setSelectedOffice(e.target.value)} disabled={!selectedWing}>
                <option value="">{selectedWing ? 'All offices' : 'Select a wing first'}</option>
                {offices.map((o: any) => <option key={o.officeNo} value={String(o.officeNo)}>{o.officeNo}-{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="aw-label" htmlFor="ams-date">As on date</label>
              <input id="ams-date" type="date" className="aw-input" value={asOnDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setAsOnDate(dayjs(e.target.value))} />
            </div>
            <OutputChoice value={outputMode} onChange={setOutputMode} id="ams-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={handleLoad} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load'}
            </button>
          </ParamCard>
          {hasData && (
            <StatCards items={[
              { label: 'Members', value: String(data.length), tone: 'muted' },
              { label: 'Total pages', value: String(totalPages), tone: 'muted' },
              { label: 'R. loan total', value: `₹${fmt(totals.regularLoan)}`, tone: 'danger' },
              { label: 'Share total', value: `₹${fmt(totals.share)}`, tone: 'info' },
            ]} />
          )}
        </>
      }
      footerLeft="Annual Member Statement"
      footerRight={`As on ${asOn}`}
    >
      {hasData && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="Annual Member Statement" subtitle={`As on ${asOn}`} />}
      {view === 'legacy' && (
        <LegacyDocument
          title="Members Statement"
          meta={`${wingName || 'All Wings'} · ${officeLabel} · ${asOn}${hasData ? ` · ${data.length} records · ${totalPages} pages` : ''}`}
          text={hasData ? buildFullReportText(data) : ''}
          loading={loading}
          empty={<ReportEmpty icon={<FileText size={34} />} title="No Statement Data" hint="Select wing and branch then click Load" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Statement Data'} hint="Select wing and branch then click Load" />
      )}
    </ReportShell>
  );
};

export default AnnualMemberStatement;
