import React, { useState, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { Printer, Search, Share2, RotateCcw } from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { escapeHtml } from '@/utils/html';


interface ShareWarrantItem {
  key: string;
  srno: string;
  mbno: string;
  memberName: string;
  shareAmount: string;
  officeno: string;
  pfno: string;
  warrantDate: string;
}

const ShareWarrantPrinting: React.FC = () => {
  // State
  const [memberFrom, setMemberFrom] = useState<string>('');
  const [memberTo, setMemberTo] = useState<string>('');
  const [warrantDate, setWarrantDate] = useState(dayjs());
  const [tableData, setTableData] = useState<ShareWarrantItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSearch = useCallback(async (): Promise<ShareWarrantItem[]> => {
    if (!memberFrom || !memberTo) return [];
    setLoading(true);
    try {
      const response = await apiService.getShareWarrant(memberFrom, memberTo, warrantDate.format('YYYY-MM-DD'));
      if (response?.success) {
        const data: ShareWarrantItem[] = Array.isArray(response.data)
          ? response.data
          : (response.data?.data ?? response.data?.reportData ?? []);
        setTableData(data);
        return data;
      }
      message.error(response?.message || response?.error || 'Failed to load share warrant data');
    } catch (error) {
      console.error('ShareWarrant fetch error:', error);
      message.error('Failed to load share warrant data');
    } finally {
      setLoading(false);
    }
    setTableData([]);
    return [];
  }, [memberFrom, memberTo, warrantDate]);

  const handleReset = useCallback(() => {
    setMemberFrom('');
    setMemberTo('');
    setWarrantDate(dayjs());
    setTableData([]);
  }, []);

  const totalShares = useMemo(() => {
    return tableData.reduce((sum, item) => {
      const amount = parseFloat(item.shareAmount.replace(/,/g, '')) || 0;
      return sum + amount;
    }, 0);
  }, [tableData]);

  const formatCurrency = useCallback((amount: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount), []);

  const buildPrintHtml = (rows: ShareWarrantItem[]) => {
    const tRows = rows.map(r => `<tr>
      <td style="text-align:center">${r.srno}</td>
      <td>${escapeHtml(r.mbno)}</td>
      <td>${escapeHtml(r.memberName)}</td>
      <td>${escapeHtml(r.pfno)}</td>
      <td>${escapeHtml(r.officeno)}</td>
      <td style="text-align:right">₹ ${r.shareAmount}</td>
      <td style="text-align:center">${escapeHtml(r.warrantDate)}</td>
    </tr>`).join('');
    return `<!DOCTYPE html><html><head><title>Share Warrant Printing</title>
<style>
  body{font-family:'Courier New',monospace;font-size:10px;margin:10px;}
  h2{text-align:center;font-size:13px;margin-bottom:2px;}
  p.sub{text-align:center;font-size:9px;color:#555;margin:0 0 6px;}
  table{width:100%;border-collapse:collapse;}
  th,td{border:1px solid #94a3b8;padding:3px 6px;}
  th{background:#e2e8f0;color:#1d4ed8;font-weight:bold;text-align:left;}
  tfoot td{font-weight:bold;background:#f1f5f9;}
  @page{size:portrait;margin:10mm;}
</style></head><body>
<h2>Espat Karmchari Co-Operative Credit Society Limited.</h2>
<p class="sub">Share Warrant Register — Member: ${memberFrom} to ${memberTo} | Date: ${warrantDate.format('DD-MMM-YYYY')}</p>
<table>
  <thead><tr><th>SR.</th><th>Member Code</th><th>Member Name</th><th>PF No.</th><th>Office</th><th>Share Capital</th><th>Warrant Date</th></tr></thead>
  <tbody>${tRows}</tbody>
  <tfoot><tr>
    <td colspan="5" style="text-align:right">TOTAL (${rows.length} warrants):</td>
    <td style="text-align:right">₹ ${formatCurrency(rows.reduce((s, r) => s + (parseFloat(r.shareAmount?.replace(/,/g,'') || '0')), 0))}</td>
    <td></td>
  </tr></tfoot>
</table></body></html>`;
  };

  const printWithData = (rows: ShareWarrantItem[]) => {
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

  const handlePrint = () => { if (tableData.length > 0) printWithData(tableData); };

  const hasData = tableData.length > 0;
  const range = memberFrom && memberTo ? `${memberFrom} to ${memberTo}` : 'All Members';
  const onDate = warrantDate.format('DD-MMM-YYYY');

  return (
    <ReportShell
      className="share-warrant-page aw-calm"
      title="Share Warrant Printing"
      desc="Share capital warrants for a member range"
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Share2 size={14} />}>
            <div>
              <label className="aw-label" htmlFor="swp-from">Member from</label>
              <MemberField id="swp-from" value={memberFrom} onChange={setMemberFrom} onSelect={(m: any) => setMemberFrom(m.mbno || m.memberNo)} onSubmit={() => handleSearch()} />
            </div>
            <div>
              <label className="aw-label" htmlFor="swp-to">Member to</label>
              <MemberField id="swp-to" value={memberTo} onChange={setMemberTo} onSelect={(m: any) => setMemberTo(m.mbno || m.memberNo)} onSubmit={() => handleSearch()} />
            </div>
            <div>
              <label className="aw-label" htmlFor="swp-date">Warrant date</label>
              <input id="swp-date" type="date" className="aw-input" value={warrantDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setWarrantDate(dayjs(e.target.value))} />
            </div>
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleSearch()} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load'}
            </button>
          </ParamCard>
          {hasData && (
            <StatCards items={[
              { label: 'Warrants', value: String(tableData.length), tone: 'muted' },
              { label: 'Total shares', value: `₹${formatCurrency(totalShares)}`, tone: 'info' },
            ]} />
          )}
        </>
      }
      footerLeft="Share Warrant Printing"
      footerRight={`Date: ${onDate}`}
    >
      {hasData ? (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Warrant Register · {range}</span>
            <span className="aw-meta">{onDate}</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <div className="aw-table-wrap">
              <table className="aw-table">
                <thead>
                  <tr>
                    <th className="is-center">SR.</th><th>Member code</th><th>Member name</th><th>PF no.</th><th>Office</th>
                    <th className="is-right">Share capital</th><th className="is-center">Warrant date</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((item, idx) => (
                    <tr key={item.key || idx}>
                      <td className="is-center is-muted">{item.srno}</td>
                      <td className="is-accent">{item.mbno}</td>
                      <td>{item.memberName}</td>
                      <td>{item.pfno}</td>
                      <td>{item.officeno}</td>
                      <td className="is-right">
                        {parseFloat((item.shareAmount || '0').toString().replace(/,/g, '')) > 0 && <CrDrIndicator type="credit" className="mr-1" />}
                        ₹ {item.shareAmount}
                      </td>
                      <td className="is-center">{item.warrantDate}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} className="is-right"><b>Total ({tableData.length} warrants)</b></td>
                    <td className="is-right">
                      <b>{totalShares > 0 && <CrDrIndicator type="credit" className="mr-1" />}₹ {formatCurrency(totalShares)}</b>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <ReportEmpty icon={<Share2 size={34} />} title={loading ? 'Loading…' : 'No Warrant Data'} hint="Configure member range to view share warrants" />
      )}
    </ReportShell>
  );
};

export default ShareWarrantPrinting;
