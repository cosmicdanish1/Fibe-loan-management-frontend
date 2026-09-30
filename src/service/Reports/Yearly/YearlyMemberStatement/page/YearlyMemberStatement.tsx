import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Select,
    DatePicker,
    Radio,
    Button,
    Spin,
    Input,
    Modal,
    Pagination,
    message,
    ConfigProvider,
    theme as antdTheme
} from 'antd';
import {
    FileText,
    Printer,
    Search,
    RotateCcw,
    Calendar,
    Building,
    ArrowUpDown,
    FileDown,
    BookOpen,
    ShieldCheck,
    Users,
    User
} from 'lucide-react';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';

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
    const [fromDate, setFromDate] = useState<dayjs.Dayjs>(dayjs('2024-01-01'));
    const [toDate, setToDate] = useState<dayjs.Dayjs>(dayjs('2024-12-31'));
    const [wings, setWings] = useState<WingData[]>([]);
    const [offices, setOffices] = useState<OfficeData[]>([]);
    const [selectedWing, setSelectedWing] = useState<string>('');
    const [selectedOffice, setSelectedOffice] = useState<string>('');
    const [fromMemberNo, setFromMemberNo] = useState<string>('');
    const [toMemberNo, setToMemberNo] = useState<string>('');
    const [showLookup, setShowLookup] = useState<boolean>(false);
    const [lookupTarget, setLookupTarget] = useState<'from' | 'to'>('from');
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

    const { interfaceMode } = useSelector((state: RootState) => state.theme);
    const isDark = interfaceMode === 'dark';

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
        setFromDate(dayjs('2024-01-01'));
        setToDate(dayjs('2024-12-31'));
        setStatementData([]);
        setOutputType('screen');
        setSortBy('MBNO');
        setCurrentPage(1);
        setPageSize(20);
    }, []);

    const openLookup = useCallback((target: 'from' | 'to') => {
        setLookupTarget(target);
        setShowLookup(true);
    }, []);

    const handleMemberSelect = useCallback((member: any) => {
        const no = member.memberNo || member.mbno || '';
        if (lookupTarget === 'from') setFromMemberNo(no);
        else setToMemberNo(no);
        setShowLookup(false);
    }, [lookupTarget]);

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
            <td class="c">${idx + 1}</td><td>${item.memberNo}</td><td>${item.memberName}</td>
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
    <div class="nm">${society.name}</div>
    <div>${society.address}</div>
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
                csvContent += `${item.memberNo},"${item.memberName}",${item.shares},${item.compulsoryDeposit},${item.regularLoan},${item.emergencyLoan}\n`;
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

    return (
        <ConfigProvider
            theme={{
                algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: {
                    colorPrimary: '#7c3aed',
                    borderRadius: 6,
                    fontSize: 12,
                    colorBgContainer: isDark ? '#1e293b' : '#ffffff',
                    colorBorder: isDark ? '#334155' : '#e2e8f0',
                },
            }}
        >
            <style>{`
                @media print {
                    @page { size: portrait; margin: 10mm; }
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .print-show { display: block !important; }
                }
                .print-show { display: none; }
                
                .legacy-table-ultra {
                    width: 100%;
                    border-collapse: collapse;
                    font-family: 'Courier New', monospace;
                    font-size: 9px;
                }
                .legacy-table-ultra th {
                    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
                    color: white;
                    font-weight: 800;
                    text-align: left;
                    padding: 4px 6px;
                    border: 1px solid #6d28d9;
                    text-transform: uppercase;
                    font-size: 8px;
                    letter-spacing: 0.8px;
                }
                .legacy-table-ultra td {
                    padding: 3px 6px;
                    border: 1px dashed ${isDark ? '#334155' : '#e9d5ff'};
                    font-size: 9px;
                    color: ${isDark ? '#e2e8f0' : '#1e293b'};
                }
                .legacy-table-ultra tbody tr:hover {
                    background: ${isDark ? '#312e54' : '#faf5ff'} !important;
                }
                .legacy-table-ultra .total-row {
                    background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%) !important;
                    font-weight: 800;
                    color: white;
                    border: 2px solid #7c3aed !important;
                }
                .legacy-table-ultra .amount-positive {
                    color: ${isDark ? '#34d399' : '#059669'};
                    font-weight: 700;
                }
                .legacy-table-ultra .amount-negative {
                    color: ${isDark ? '#f87171' : '#dc2626'};
                    font-weight: 700;
                }
                
                .custom-scrollbar-ultra::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar-ultra::-webkit-scrollbar-track {
                    background: ${isDark ? '#1e293b' : '#f8fafc'};
                    border-radius: 3px;
                }
                .custom-scrollbar-ultra::-webkit-scrollbar-thumb {
                    background: #c4b5fd;
                    border-radius: 3px;
                }
                .custom-scrollbar-ultra::-webkit-scrollbar-thumb:hover {
                    background: #a78bfa;
                }

                /* ── Yearly Member Statement — dark mode (reinforces the page's own isDark styling) ── */
                html.dark .yearly-mstmt-page { background-color: #000000 !important; }
                html.dark .yearly-mstmt-header { background-image: none !important; background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .yearly-mstmt-card,
                html.dark .yearly-mstmt-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .yearly-mstmt-page .bg-slate-900\/40 { background-color: #0c0c0e !important; }
                html.dark .yearly-mstmt-page .text-slate-100,
                html.dark .yearly-mstmt-page .text-slate-200,
                html.dark .yearly-mstmt-page .text-slate-300 { color: #f5f5f7 !important; }
                html.dark .yearly-mstmt-page label { color: #8e8e93 !important; }
                html.dark .yearly-mstmt-page .ant-input,
                html.dark .yearly-mstmt-page .ant-input-affix-wrapper,
                html.dark .yearly-mstmt-page .ant-input-search .ant-input-group-addon .ant-btn,
                html.dark .yearly-mstmt-page .ant-select-selector,
                html.dark .yearly-mstmt-page .ant-picker { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
                html.dark .yearly-mstmt-page .ant-picker input { color: #f5f5f7 !important; }
                html.dark .yearly-mstmt-page .ant-radio-button-wrapper { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #8e8e93 !important; }
                html.dark .yearly-mstmt-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
            `}</style>

            <div className={`yearly-mstmt-page h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-purple-50/20 to-slate-50'}`}>
                {/* Ultra-Compact Header */}
                <div className={`yearly-mstmt-header px-3 py-1.5 flex items-center justify-between z-10 shadow-sm shrink-0 border-b no-print ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-1.5 rounded-lg text-white shadow-md">
                            <BookOpen size={14} />
                        </div>
                        <div>
                            <h1 className={`fz-label font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Yearly Member Statement</h1>
                            <div className="flex items-center gap-1 mt-0.5 fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none">
                                <ShieldCheck size={8} className="text-purple-500" /> Annual Summary
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            icon={<RotateCcw size={11} />}
                            size="small"
                            className="h-7 px-2 rounded-lg fz-caption font-bold uppercase tracking-wide border-slate-200 hover:border-purple-500 hover:text-purple-600"
                            onClick={handleReset}
                        >
                            Reset
                        </Button>
                        <Button
                            icon={<Printer size={11} />}
                            size="small"
                            className="h-7 px-2 rounded-lg fz-caption font-bold uppercase tracking-wide border-slate-200 hover:border-purple-500 hover:text-purple-600"
                            onClick={handlePrint}
                            disabled={statementData.length === 0}
                        >
                            Print
                        </Button>
                        <Button
                            type="primary"
                            icon={<FileDown size={11} />}
                            size="small"
                            className="h-7 px-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg fz-caption font-bold uppercase tracking-wide shadow-md"
                            onClick={handleExportCSV}
                            disabled={statementData.length === 0}
                        >
                            CSV
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden p-2 flex gap-2">

                    {/* LEFT SIDEBAR: Ultra-Compact Filters (260px) */}
                    <div className="w-[260px] flex flex-col gap-2 shrink-0 no-print overflow-y-auto custom-scrollbar-ultra">

                        {/* Date Range */}
                        <div className={`yearly-mstmt-card backdrop-blur-sm border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-purple-200/60'}`}>
                            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-2 py-1 flex items-center gap-1">
                                <Calendar size={10} className="text-white" />
                                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Date Range</h3>
                            </div>
                            <div className="p-2 space-y-1.5">
                                <div>
                                    <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>From</label>
                                    <DatePicker
                                        className="w-full h-7 fz-caption font-semibold"
                                        value={fromDate}
                                        onChange={v => v && setFromDate(v)}
                                        format="DD-MMM-YY"
                                    />
                                </div>
                                <div>
                                    <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>To</label>
                                    <DatePicker
                                        className="w-full h-7 fz-caption font-semibold"
                                        value={toDate}
                                        onChange={v => v && setToDate(v)}
                                        format="DD-MMM-YY"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className={`yearly-mstmt-card backdrop-blur-sm border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-purple-200/60'}`}>
                            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-2 py-1 flex items-center gap-1">
                                <Building size={10} className="text-white" />
                                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Filters</h3>
                            </div>
                            <div className="p-2 space-y-1.5">
                                <div>
                                    <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Wing</label>
                                    <Select
                                        className="w-full fz-caption"
                                        placeholder="Wing"
                                        allowClear
                                        value={selectedWing || undefined}
                                        onChange={setSelectedWing}
                                        options={wings.map(w => ({ value: w.wingNo, label: `${w.wingNo} - ${w.name}` }))}
                                        size="small"
                                    />
                                </div>
                                <div>
                                    <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Office</label>
                                    <Select
                                        className="w-full fz-caption"
                                        placeholder="Office"
                                        allowClear
                                        value={selectedOffice || undefined}
                                        onChange={setSelectedOffice}
                                        options={offices.map(o => ({ value: o.officeNo, label: `${o.officeNo} - ${o.name}` }))}
                                        size="small"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Member Range */}
                        <div className={`yearly-mstmt-card backdrop-blur-sm border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-purple-200/60'}`}>
                            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-2 py-1 flex items-center gap-1">
                                <Users size={10} className="text-white" />
                                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Member Range</h3>
                            </div>
                            <div className="p-2 space-y-1.5">
                                <div>
                                    <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>From</label>
                                    <Input.Search
                                        placeholder="Starting member"
                                        value={fromMemberNo}
                                        onChange={e => setFromMemberNo(e.target.value)}
                                        onSearch={() => openLookup('from')}
                                        className="h-7 fz-caption font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>To</label>
                                    <Input.Search
                                        placeholder="Ending member"
                                        value={toMemberNo}
                                        onChange={e => setToMemberNo(e.target.value)}
                                        onSearch={() => openLookup('to')}
                                        className="h-7 fz-caption font-semibold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Options */}
                        <div className={`yearly-mstmt-card backdrop-blur-sm border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-purple-200/60'}`}>
                            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-2 py-1 flex items-center gap-1">
                                <ArrowUpDown size={10} className="text-white" />
                                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Options</h3>
                            </div>
                            <div className="p-2 space-y-1.5">
                                <div>
                                    <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Sort</label>
                                    <Select
                                        className="w-full fz-caption"
                                        value={sortBy}
                                        onChange={setSortBy}
                                        options={sortOptions}
                                        size="small"
                                    />
                                </div>
                                <div>
                                    <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Output</label>
                                    <Radio.Group
                                        size="small"
                                        value={outputType}
                                        onChange={e => setOutputType(e.target.value)}
                                        className="w-full"
                                    >
                                        <Radio.Button value="screen" className="w-1/2 text-center fz-caption font-bold">SCR</Radio.Button>
                                        <Radio.Button value="printer" className="w-1/2 text-center fz-caption font-bold">PTR</Radio.Button>
                                    </Radio.Group>
                                </div>
                                <Button
                                    type="primary"
                                    block
                                    size="small"
                                    icon={<Search size={11} />}
                                    onClick={handleGenerate}
                                    loading={loading}
                                    className="h-8 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 font-black uppercase tracking-wider fz-caption mt-1 shadow-lg"
                                >
                                    Generate
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Report */}
                    <div className={`yearly-mstmt-panel flex-1 rounded-lg shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-purple-200/60'}`}>
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1.5 flex items-center justify-between shrink-0 no-print">
                            <div className="flex items-center gap-1.5">
                                <div className="bg-white/20 p-1 rounded-md shadow-sm">
                                    <FileText size={12} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="fz-caption font-black text-white uppercase tracking-wide leading-none">Annual Statement</h3>
                                    <p className="fz-caption font-bold text-purple-200 uppercase mt-0.5 tracking-tight leading-none">
                                        {fromDate.format('DD-MMM-YY')} - {toDate.format('DD-MMM-YY')}
                                    </p>
                                </div>
                            </div>
                            <div className="fz-caption font-black text-white bg-white/20 px-2 py-0.5 rounded">
                                {statementData.length} Records
                            </div>
                        </div>

                        <div className={`flex-1 overflow-auto p-2 custom-scrollbar-ultra ${isDark ? 'bg-slate-900/40' : 'bg-gradient-to-br from-white to-purple-50/10'}`}>
                            <Spin spinning={loading} tip="Loading..." size="small">
                                {statementData && statementData.length > 0 ? (
                                    <div className="legacy-report-ultra font-mono">
                                        {/* Print Header */}
                                        <div className="print-show text-center mb-2 border-b-2 border-purple-600 pb-2">
                                            <div className="fz-caption font-black text-slate-900">{societyInfo.name}</div>
                                            <div className="fz-caption text-slate-600">{societyInfo.address}</div>
                                            <div className="fz-caption font-black text-purple-700 mt-1">YEARLY MEMBER STATEMENT</div>
                                            <div className="fz-caption text-slate-600">
                                                {fromDate.format('DD-MMM-YYYY')} to {toDate.format('DD-MMM-YYYY')}
                                            </div>
                                        </div>

                                        {/* Ultra-Compact Legacy Table */}
                                        <table className="legacy-table-ultra">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '6%' }}>SR</th>
                                                    <th style={{ width: '11%' }}>MEMBER</th>
                                                    <th style={{ width: '28%' }}>NAME</th>
                                                    <th style={{ width: '13%', textAlign: 'right' }}>SHARES</th>
                                                    <th style={{ width: '14%', textAlign: 'right' }}>CD BAL</th>
                                                    <th style={{ width: '14%', textAlign: 'right' }}>REG LOAN</th>
                                                    <th style={{ width: '14%', textAlign: 'right' }}>EMR LOAN</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedData.map((item, idx) => (
                                                    <tr key={item.key}>
                                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                                                        <td style={{ fontWeight: 700 }}>{item.memberNo}</td>
                                                        <td style={{ fontWeight: 600 }}>{item.memberName}</td>
                                                                        <td style={{ textAlign: 'right' }} className="amount-positive">
                                                            {parseFloat(item.shares || '0') !== 0 && <CrDrIndicator type="credit" className="mr-1 no-print" />}
                                                            ₹{formatCurrency(item.shares)}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }} className="amount-positive">
                                                            {parseFloat(item.compulsoryDeposit || '0') !== 0 && <CrDrIndicator type="credit" className="mr-1 no-print" />}
                                                            ₹{formatCurrency(item.compulsoryDeposit)}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }} className="amount-negative">
                                                            {parseFloat(item.regularLoan || '0') !== 0 && <CrDrIndicator type="debit" className="mr-1 no-print" />}
                                                            ₹{formatCurrency(item.regularLoan)}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }} className="amount-negative">
                                                            {parseFloat(item.emergencyLoan || '0') !== 0 && <CrDrIndicator type="debit" className="mr-1 no-print" />}
                                                            ₹{formatCurrency(item.emergencyLoan)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Total Row */}
                                                <tr className="total-row">
                                                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 900, letterSpacing: '1px' }}>TOTAL:</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 900 }}>
                                                        {totals.shares !== 0 && <CrDrIndicator type="credit" className="mr-1 no-print" />}
                                                        ₹{formatCurrency(totals.shares)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 900 }}>
                                                        {totals.cd !== 0 && <CrDrIndicator type="credit" className="mr-1 no-print" />}
                                                        ₹{formatCurrency(totals.cd)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 900 }}>
                                                        {totals.regularLoan !== 0 && <CrDrIndicator type="debit" className="mr-1 no-print" />}
                                                        ₹{formatCurrency(totals.regularLoan)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 900 }}>
                                                        {totals.emergencyLoan !== 0 && <CrDrIndicator type="debit" className="mr-1 no-print" />}
                                                        ₹{formatCurrency(totals.emergencyLoan)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {/* Pagination */}
                                        {statementData.length > 0 && (
                                            <div className="mt-3 flex justify-center no-print">
                                                <Pagination
                                                    current={currentPage}
                                                    pageSize={pageSize}
                                                    total={statementData.length}
                                                    onChange={handlePageChange}
                                                    onShowSizeChange={handlePageChange}
                                                    showSizeChanger
                                                    showQuickJumper
                                                    pageSizeOptions={['20', '50', '100', '200']}
                                                    showTotal={(total, range) => (
                                                        <span className="fz-caption font-semibold">{range[0]}-{range[1]} of {total} records</span>
                                                    )}
                                                    size="small"
                                                />
                                            </div>
                                        )}

                                        {/* Print Footer */}
                                        <div className="print-show mt-3 fz-caption text-slate-500 text-center border-t border-dashed border-slate-300 pt-1.5">
                                            Generated: {dayjs().format('DD-MMM-YYYY HH:mm')} | System Report
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-32 text-center">
                                        <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                                            <FileText className="text-4xl text-purple-200" />
                                        </div>
                                        <h4 className="text-slate-400 font-black fz-label uppercase tracking-wider">No Data</h4>
                                        <p className="text-slate-300 fz-caption mt-1 font-semibold">Set filters and generate</p>
                                    </div>
                                )}
                            </Spin>
                        </div>
                    </div>
                </div>
            </div>

            {/* Member Lookup Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <User size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <div className="fz-heading font-bold text-slate-800">Member Search Directory</div>
                            <div className="fz-label text-slate-500 font-normal">Selecting for: {lookupTarget === 'from' ? 'Range Start' : 'Range End'}</div>
                        </div>
                    </div>
                }
                open={showLookup}
                onCancel={() => setShowLookup(false)}
                footer={null}
                width={950}
                styles={{ body: { padding: 0 } }}
                centered
                destroyOnClose
            >
                <div className="p-2">
                    <MemberLookup
                        isModal={true}
                        onSelect={handleMemberSelect}
                        onClose={() => setShowLookup(false)}
                    />
                </div>
            </Modal>
        </ConfigProvider>
    );
};

export default YearlyMemberStatement;
