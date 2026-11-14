import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { FileText, Printer, Search, RotateCcw, FileDown, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { csvCell } from '@/utils/csv';
import { escapeHtml } from '@/utils/html';
import { indianFinancialYearStart } from '@/utils/dates';
import { isFromAfterTo } from '@/utils/dates';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import { useYearlySpec } from '../views/yearlyPro';

interface WingData {
    wingNo: string;
    name: string;
}

interface OfficeData {
    officeNo: string;
    name: string;
}

interface YearlyStatementData {
    key: string;
    memberNo: string;
    memberName: string;
    shares: string;
    compulsoryDeposit: string;
    regularLoan: string;
    emergencyLoan: string;
}

const YearlyMemberStatement: React.FC = () => {
    // State
    const [fromDate, setFromDate] = useState<dayjs.Dayjs>(dayjs(indianFinancialYearStart()));
    const [toDate, setToDate] = useState<dayjs.Dayjs>(dayjs());
    const [wings, setWings] = useState<WingData[]>([]);
    const [offices, setOffices] = useState<OfficeData[]>([]);
    const [selectedWing, setSelectedWing] = useState<string>('');
    const [selectedOffice, setSelectedOffice] = useState<string>('');
    const [fromMemberNo, setFromMemberNo] = useState<string>('');
    const [toMemberNo, setToMemberNo] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);
    const [outputType, setOutputType] = useState<string>('screen');
    const [sortBy, setSortBy] = useState<string>('MBNO');
    const [loading, setLoading] = useState<boolean>(false);
    const [statementData, setStatementData] = useState<YearlyStatementData[]>([]);
    const [societyInfo, setSocietyInfo] = useState({
        name: 'Espat Karmchari Co-Operative Credit Society Limited',
        address: 'Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006'
    });

    const sortOptions = [
        { label: 'Member No', value: 'MBNO' },
        { label: 'Name', value: 'Name' }
    ];

    useEffect(() => {
        loadFilterData();
    }, []);

    const loadFilterData = useCallback(async () => {
        try {
            const [wingsRes, officesRes] = await Promise.all([
                apiService.getWingList(),
                apiService.getOfficeList()
            ]);

            if (wingsRes.success && Array.isArray(wingsRes.data)) setWings(wingsRes.data);
            if (officesRes.success && Array.isArray(officesRes.data)) setOffices(officesRes.data);
        } catch (error) {
            console.error('Error loading filters:', error);
        }
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!fromMemberNo || !toMemberNo) {
            message.warning('Please enter member range');
            return;
        }

        if (fromDate && toDate && isFromAfterTo(fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'))) {
          message.warning('From date cannot be after To date');
          return;
        }
        setLoading(true);
        try {
            const response = await apiService.getYearlyMemberStatement(
                fromDate.format('YYYY-MM-DD'),
                toDate.format('YYYY-MM-DD'),
                fromMemberNo,
                toMemberNo,
                selectedWing,
                selectedOffice,
                sortBy
            );

            if (response.success && response.data) {
                const result = response.data;
                const society = {
                    name: result.societyName || societyInfo.name,
                    address: result.societyAddress || societyInfo.address,
                };
                if (result.societyName) setSocietyInfo(society);

                const rows: YearlyStatementData[] = Array.isArray(result.data) ? result.data : [];
                setStatementData(rows);
                setCurrentPage(1);

                if (rows.length > 0) {
                    message.success(`Found ${rows.length} records`);
                    if (outputType === 'printer') printWithData(rows, society);
                } else {
                    message.info('No records found');
                }
            } else {
                setStatementData([]);
                message.warning(response.message || 'No data');
            }
        } catch (error) {
            console.error('YearlyMemberStatement error:', error);
            message.error('Failed to generate report');
            setStatementData([]);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, fromMemberNo, toMemberNo, selectedWing, selectedOffice, sortBy, outputType, societyInfo]);

    const handleReset = useCallback(() => {
        setFromMemberNo('');
        setToMemberNo('');
        setSelectedWing('');
        setSelectedOffice('');
        setFromDate(dayjs(indianFinancialYearStart()));
        setToDate(dayjs());
        setStatementData([]);
        setOutputType('screen');
        setSortBy('MBNO');
        setCurrentPage(1);
        setPageSize(20);
    }, []);

    const paginatedData = useMemo(
        () => statementData.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [statementData, currentPage, pageSize]
    );

    const handlePageChange = useCallback((page: number, newPageSize?: number) => {
        setCurrentPage(page);
        if (newPageSize && newPageSize !== pageSize) { setPageSize(newPageSize); setCurrentPage(1); }
    }, [pageSize]);

    const formatCurrency = useCallback((val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return (num || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, []);

    // Print via hidden iframe — window.print() is blocked in Electron.
    const buildPrintHtml = (rows: YearlyStatementData[], society: { name: string; address: string }) => {
        const t = rows.reduce((a, r) => ({
            shares: a.shares + parseFloat(r.shares || '0'),
            cd: a.cd + parseFloat(r.compulsoryDeposit || '0'),
            rl: a.rl + parseFloat(r.regularLoan || '0'),
            el: a.el + parseFloat(r.emergencyLoan || '0'),
        }), { shares: 0, cd: 0, rl: 0, el: 0 });

        const body = rows.map((item, idx) => `<tr>
            <td class="c">${idx + 1}</td><td>${escapeHtml(item.memberNo)}</td><td>${escapeHtml(item.memberName)}</td>
            <td class="r">${formatCurrency(item.shares)}</td><td class="r">${formatCurrency(item.compulsoryDeposit)}</td>
            <td class="r">${formatCurrency(item.regularLoan)}</td><td class="r">${formatCurrency(item.emergencyLoan)}</td>
          </tr>`).join('');

        return `<!DOCTYPE html><html><head><title>Yearly Member Statement</title>
<style>
  body { font-family: 'Courier New', monospace; color: #000; margin: 12mm; }
  .hdr { text-align: center; margin-bottom: 10px; }
  .hdr .nm { font-weight: bold; font-size: 14px; }
  .hdr .ti { font-weight: bold; margin-top: 4px; text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 3px 6px; font-size: 10px; }
  th { background: #ddd; text-transform: uppercase; }
  .r { text-align: right; } .c { text-align: center; }
  tfoot td { font-weight: bold; background: #eee; }
  @page { size: portrait; margin: 10mm; }
</style></head><body>
  <div class="hdr">
    <div class="nm">${escapeHtml(society.name)}</div>
    <div>${escapeHtml(society.address)}</div>
    <div class="ti">YEARLY MEMBER STATEMENT</div>
    <div>${fromDate.format('DD-MMM-YYYY')} to ${toDate.format('DD-MMM-YYYY')}</div>
  </div>
  <table>
    <thead><tr><th class="c">SR</th><th>MEMBER</th><th>NAME</th>
      <th class="r">SHARES</th><th class="r">CD BAL</th><th class="r">REG LOAN</th><th class="r">EMR LOAN</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td colspan="3" class="r">TOTAL :</td>
      <td class="r">${formatCurrency(t.shares)}</td><td class="r">${formatCurrency(t.cd)}</td>
      <td class="r">${formatCurrency(t.rl)}</td><td class="r">${formatCurrency(t.el)}</td></tr></tfoot>
  </table>
  <div style="margin-top:10px;font-size:9px;text-align:center;">Generated: ${dayjs().format('DD-MMM-YYYY HH:mm')} | System Report</div>
</body></html>`;
    };

    const printWithData = (rows: YearlyStatementData[], society: { name: string; address: string }) => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
            doc.open(); doc.write(buildPrintHtml(rows, society)); doc.close();
            setTimeout(() => {
                iframe.contentWindow?.focus(); iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 400);
        }
    };

    const handlePrint = () => {
        if (statementData.length > 0) printWithData(statementData, societyInfo);
    };

    const handleExportCSV = useCallback(async () => {
        if (!statementData || statementData.length === 0) {
            message.warning('No data to export');
            return;
        }

        try {
            let csvContent = '';
            csvContent += `${societyInfo.name}\n`;
            csvContent += `${societyInfo.address}\n\n`;
            csvContent += 'YEARLY MEMBER STATEMENT\n';
            csvContent += `Period: ${fromDate.format('DD-MMM-YYYY')} to ${toDate.format('DD-MMM-YYYY')}\n\n`;
            csvContent += 'Member No,Member Name,Shares,Compulsory Deposit,Regular Loan,Emergency Loan\n';

            statementData.forEach(item => {
                csvContent += `${item.memberNo},${csvCell(item.memberName)},${item.shares},${item.compulsoryDeposit},${item.regularLoan},${item.emergencyLoan}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `YearlyStatement_${fromDate.format('YYYYMMDD')}_${toDate.format('YYYYMMDD')}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            message.success('CSV exported');
        } catch (error) {
            message.error('Export failed');
            console.error('Export error:', error);
        }
    }, [statementData, societyInfo, fromDate, toDate]);

    const totals = useMemo(() => {
        if (!statementData || statementData.length === 0) {
            return { shares: 0, cd: 0, regularLoan: 0, emergencyLoan: 0 };
        }

        return statementData.reduce((acc, item) => ({
            shares: acc.shares + parseFloat(item.shares || '0'),
            cd: acc.cd + parseFloat(item.compulsoryDeposit || '0'),
            regularLoan: acc.regularLoan + parseFloat(item.regularLoan || '0'),
            emergencyLoan: acc.emergencyLoan + parseFloat(item.emergencyLoan || '0')
        }), { shares: 0, cd: 0, regularLoan: 0, emergencyLoan: 0 });
    }, [statementData]);

    const { enabled, view, setView } = useReportViews('yearly.yearly-member-statement');
    const spec = useYearlySpec(statementData, `${fromDate.format('DD MMM YYYY')} to ${toDate.format('DD MMM YYYY')}`);

    const hasData = statementData.length > 0;
    const range = `${fromDate.format('DD-MMM-YYYY')} to ${toDate.format('DD-MMM-YYYY')}`;
    const lastPage = Math.max(1, Math.ceil(statementData.length / pageSize));

    return (
        <ReportShell
            className="yearly-mstmt-page"
            title="Yearly Member Statement"
            desc="Annual summary of shares, deposits and loans"
            switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
            actions={
                <>
                    <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
                    <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!hasData}><FileDown size={14} /> CSV</button>
                    <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
                </>
            }
            aside={
                <>
                    <ParamCard title="Statement" icon={<Users size={14} />}>
                        <div>
                            <label className="aw-label" htmlFor="yms-from-date">From date</label>
                            <input id="yms-from-date" type="date" className="aw-input" value={fromDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setFromDate(dayjs(e.target.value))} />
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="yms-to-date">To date</label>
                            <input id="yms-to-date" type="date" className="aw-input" value={toDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setToDate(dayjs(e.target.value))} />
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="yms-wing">Wing</label>
                            <select id="yms-wing" className="aw-input" value={selectedWing} onChange={e => setSelectedWing(e.target.value)}>
                                <option value="">All wings</option>
                                {wings.map(w => <option key={w.wingNo} value={w.wingNo}>{w.wingNo} - {w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="yms-office">Office</label>
                            <select id="yms-office" className="aw-input" value={selectedOffice} onChange={e => setSelectedOffice(e.target.value)}>
                                <option value="">All offices</option>
                                {offices.map(o => <option key={o.officeNo} value={o.officeNo}>{o.officeNo} - {o.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="yms-mfrom">Member from</label>
                            <MemberField id="yms-mfrom" value={fromMemberNo} onChange={setFromMemberNo} onSelect={(m: any) => setFromMemberNo(m.memberNo || m.mbno || '')} onSubmit={() => handleGenerate()} />
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="yms-mto">Member to</label>
                            <MemberField id="yms-mto" value={toMemberNo} onChange={setToMemberNo} onSelect={(m: any) => setToMemberNo(m.memberNo || m.mbno || '')} onSubmit={() => handleGenerate()} />
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="yms-sort">Sort by</label>
                            <select id="yms-sort" className="aw-input" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <OutputChoice value={outputType === 'printer' ? 'printer' : 'screen'} onChange={setOutputType} id="yms-output" />
                        <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
                            <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
                        </button>
                    </ParamCard>
                    {hasData && <StatCards items={[{ label: 'Records', value: String(statementData.length), tone: 'muted' }]} />}
                </>
            }
            footerLeft="Yearly Member Statement"
            footerRight={range}
        >
            {hasData && view === 'bento' && <GenericBento spec={spec} />}
            {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
            {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="Yearly Member Statement" subtitle={range} />}

            {hasData && view === 'legacy' && (
                <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="aw-main-head">
                        <span className="aw-card-title">Annual Statement · {range}</span>
                        <span className="aw-meta">{statementData.length} Records</span>
                    </div>
                    <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
                        <div className="aw-table-wrap">
                            <table className="aw-table">
                                <thead>
                                    <tr>
                                        <th className="is-center">SR</th><th>Member</th><th>Name</th>
                                        <th className="is-right">Shares</th><th className="is-right">CD bal</th><th className="is-right">Reg loan</th><th className="is-right">Emr loan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((item, idx) => (
                                        <tr key={item.key}>
                                            <td className="is-center">{(currentPage - 1) * pageSize + idx + 1}</td>
                                            <td className="is-accent">{item.memberNo}</td>
                                            <td>{item.memberName}</td>
                                            <td className="is-right is-success">{parseFloat(item.shares || '0') !== 0 && <CrDrIndicator type="credit" className="mr-1" />}₹{formatCurrency(item.shares)}</td>
                                            <td className="is-right is-success">{parseFloat(item.compulsoryDeposit || '0') !== 0 && <CrDrIndicator type="credit" className="mr-1" />}₹{formatCurrency(item.compulsoryDeposit)}</td>
                                            <td className="is-right" style={{ color: 'var(--aw-danger)' }}>{parseFloat(item.regularLoan || '0') !== 0 && <CrDrIndicator type="debit" className="mr-1" />}₹{formatCurrency(item.regularLoan)}</td>
                                            <td className="is-right" style={{ color: 'var(--aw-danger)' }}>{parseFloat(item.emergencyLoan || '0') !== 0 && <CrDrIndicator type="debit" className="mr-1" />}₹{formatCurrency(item.emergencyLoan)}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="is-right"><b>Total</b></td>
                                        <td className="is-right"><b>{totals.shares !== 0 && <CrDrIndicator type="credit" className="mr-1" />}₹{formatCurrency(totals.shares)}</b></td>
                                        <td className="is-right"><b>{totals.cd !== 0 && <CrDrIndicator type="credit" className="mr-1" />}₹{formatCurrency(totals.cd)}</b></td>
                                        <td className="is-right"><b>{totals.regularLoan !== 0 && <CrDrIndicator type="debit" className="mr-1" />}₹{formatCurrency(totals.regularLoan)}</b></td>
                                        <td className="is-right"><b>{totals.emergencyLoan !== 0 && <CrDrIndicator type="debit" className="mr-1" />}₹{formatCurrency(totals.emergencyLoan)}</b></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
                            <button type="button" className="aw-btn aw-btn-ghost" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
                            <span className="aw-meta">Page {currentPage} of {lastPage} · {statementData.length} records</span>
                            <button type="button" className="aw-btn aw-btn-ghost" disabled={currentPage >= lastPage} onClick={() => handlePageChange(currentPage + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
                            <select className="aw-input" style={{ width: 'auto' }} value={pageSize} aria-label="Rows per page" onChange={e => handlePageChange(1, Number(e.target.value))}>
                                {[20, 50, 100, 200].map(n => <option key={n} value={n}>{n} / page</option>)}
                            </select>
                        </div>
                    </div>
                </section>
            )}
            {!hasData && (
                <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="Set filters and generate" />
            )}
        </ReportShell>
    );
};

export default YearlyMemberStatement;
