import React, { useState, useEffect } from 'react';
import {
  FileText,
  IndianRupee,
  Calculator,
  ShieldCheck,
  Settings,
  Database,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Printer,
  FileDown,
  Calendar,
  Search,
  Eye,
  Info,
  BookOpen,
  Monitor
} from 'lucide-react';
import { ConfigProvider, Table, Button, DatePicker, Spin, Tag, Tooltip, Radio } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../../../../services/api';
import { usePrintDialog } from '../../../../../components/shared/PrintDialog/usePrintDialog';
import { CrDrIndicator } from '../../../../../components/shared/CrDrIndicator';
import dayjs from 'dayjs';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

interface VoucherEntry {
  sno: number;
  headCode: string;
  headName: string;
  description: string;
  payment: number;
  receipt: number;
}

interface Voucher {
  voucherNo: string;
  memberNo: string;
  memberName: string;
  modeOfPayment: string;
  narration: string;
  entries: VoucherEntry[];
  totalPayment: number;
  totalReceipt: number;
}

interface CashBookSummary {
  date: string;
  totalReceipts: number;
  totalPayments: number;
  openingBalance: number;
  closingBalance: number;
  vouchers: Voucher[];
}

const CashBook: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CashBookSummary | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const formattedDate = selectedDate.format('YYYY-MM-DD');
      const response = await apiService.getCashBookReport(formattedDate, outputType);

      if (response.success && response.data) {
        setData(response.data);
      } else {
        await showDialog('error', 'Load Failed', response.message || 'Failed to load cash book data');
      }
    } catch (err) {
      await showDialog('error', 'Error', 'An error occurred while fetching report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const { openPrintDialog, PrintDialog } = usePrintDialog();
  const handlePrint = openPrintDialog;

  const handleExportCSV = async () => {
    if (!data || !data.vouchers || data.vouchers.length === 0) {
      await showDialog('warning', 'No Data', 'No data to export');
      return;
    }

    try {
      // Create CSV content
      let csvContent = '';
      
      // Header
      csvContent += 'Espat Karmchari Co-Operative Credit Society Limited\n';
      csvContent += 'Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006\n';
      csvContent += 'Reg No : A.R/DRG/1796, Tel No : 0788-2298736\n\n';
      csvContent += 'CASH-BOOK REPORT\n';
      csvContent += `Date: ${selectedDate.format('DD-MMM-YYYY')}\n\n`;
      
      // Summary
      csvContent += 'SUMMARY\n';
      csvContent += `Opening Balance,${data.openingBalance}\n`;
      csvContent += `Total Receipts,${data.totalReceipts}\n`;
      csvContent += `Total Payments,${data.totalPayments}\n`;
      csvContent += `Closing Balance,${data.closingBalance}\n\n`;
      
      // Vouchers
      csvContent += 'VOUCHER DETAILS\n\n';
      
      data.vouchers.forEach((voucher, vIdx) => {
        csvContent += `Voucher No,${voucher.voucherNo}\n`;
        csvContent += `Member No,${voucher.memberNo}\n`;
        csvContent += `Member Name,"${voucher.memberName}"\n`;
        csvContent += `Mode of Payment,${voucher.modeOfPayment}\n`;
        csvContent += `Narration,"${voucher.narration}"\n\n`;
        
        // Entries header
        csvContent += 'S.No,Head Code,Head Name,Description,Payment,Receipt\n';
        
        // Entries
        voucher.entries.forEach(entry => {
          csvContent += `${entry.sno},${entry.headCode},"${entry.headName}","${entry.description}",${entry.payment},${entry.receipt}\n`;
        });
        
        // Voucher totals
        csvContent += `Total,,,,,${voucher.totalPayment},${voucher.totalReceipt}\n\n`;
      });
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `CashBook_${selectedDate.format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await showDialog('info', 'Exported', 'CSV exported successfully');
    } catch (error) {
      await showDialog('error', 'Export Failed', 'Failed to export CSV');
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 8,
          fontSize: 13,
        },
      }}
    >
      <div className="cashbook-page h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 font-sans selection:bg-indigo-100 overflow-hidden">
        {/* Compact Header */}
        <div className="cashbook-header bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-4 py-2.5 flex items-center justify-between z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-2 rounded-lg text-white shadow-md">
              <BookOpen size={18} />
            </div>
            <div>
              <h1 className="fz-body font-extrabold text-slate-800 tracking-tight leading-none">Cash Book</h1>
              <div className="flex items-center gap-1.5 mt-0.5 fz-caption font-semibold text-slate-400 uppercase tracking-wide leading-none">
                <ShieldCheck size={10} className="text-indigo-500" /> Daily Summary
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<Printer size={13} />}
              size="small"
              className="h-8 px-3 rounded-lg fz-caption font-bold uppercase tracking-wide border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all"
              onClick={handlePrint}
              disabled={!data || !data.vouchers || data.vouchers.length === 0}
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<FileDown size={13} />}
              size="small"
              className="h-8 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg fz-caption font-bold uppercase tracking-wide shadow-md transition-all"
              onClick={handleExportCSV}
              disabled={!data || !data.vouchers || data.vouchers.length === 0}
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Compact Main Content */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Compact Left Panel: Controls & Stats */}
          <div className="cb-no-print w-[280px] flex flex-col gap-3 shrink-0">

            {/* Parameters Card */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cashbook-params-card bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="cashbook-card-header bg-gradient-to-r from-slate-50 to-indigo-50/50 border-b border-slate-100 px-3 py-2 flex items-center justify-between">
                <h3 className="fz-caption font-extrabold text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
                  <Settings size={12} className="text-indigo-600" />
                  Parameters
                </h3>
                <Tooltip title="Reload">
                  <Button type="text" size="small" icon={<RefreshCw size={11} />} onClick={loadData} className="h-6 w-6" />
                </Tooltip>
              </div>

              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <label className="fz-caption font-bold text-slate-500 uppercase tracking-tight">Date</label>
                  <DatePicker
                    className="w-full h-8 fz-label font-semibold"
                    value={selectedDate}
                    onChange={v => v && setSelectedDate(v)}
                    format="DD-MMM-YYYY"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="fz-caption font-bold text-slate-500 uppercase tracking-tight">Output</label>
                  <Radio.Group
                    size="small"
                    value={outputType}
                    onChange={e => setOutputType(e.target.value)}
                    className="w-full cashbook-radio-compact"
                  >
                    <Radio.Button value="screen" className="w-1/2 text-center">Screen</Radio.Button>
                    <Radio.Button value="printer" className="w-1/2 text-center">Print</Radio.Button>
                  </Radio.Group>
                </div>

                <Button
                  type="primary"
                  block
                  size="small"
                  icon={<Search size={13} />}
                  onClick={loadData}
                  loading={loading}
                  className="h-9 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 font-bold uppercase tracking-wide fz-caption mt-1 shadow-md"
                >
                  Load Report
                </Button>
              </div>
            </motion.div>

            {/* Compact Stats Grid */}
            <AnimatePresence>
              {data && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 gap-2"
                >
                  <div className="cashbook-stat-card bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-lg p-3 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="fz-caption font-bold uppercase tracking-wide text-slate-500">Opening</div>
                      <Calculator size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div className="fz-heading font-black text-slate-800 font-mono">₹{formatCurrency(data.openingBalance)}</div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                    <TrendingUp size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                    <div className="fz-caption font-bold uppercase tracking-wide opacity-90 mb-0.5">Receipts</div>
                    <div className="fz-heading font-black font-mono relative z-10">₹{formatCurrency(data.totalReceipts)}</div>
                  </div>

                  <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                    <TrendingDown size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                    <div className="fz-caption font-bold uppercase tracking-wide opacity-90 mb-0.5">Payments</div>
                    <div className="fz-heading font-black font-mono relative z-10">₹{formatCurrency(data.totalPayments)}</div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                    <Database size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                    <div className="fz-caption font-bold uppercase tracking-wide opacity-90 mb-0.5">Closing</div>
                    <div className="fz-heading font-black font-mono relative z-10">₹{formatCurrency(data.closingBalance)}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Compact Report Panel with Scroll */}
          <div className="cashbook-report-panel flex-1 bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="cashbook-card-header bg-gradient-to-r from-slate-50 to-indigo-50/50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
                  <Database size={14} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="fz-label font-extrabold text-slate-700 uppercase tracking-wide leading-none">Daily Ledger</h3>
                  <p className="fz-caption font-semibold text-slate-400 uppercase mt-0.5 tracking-tight">{selectedDate.format('DD MMM YYYY')}</p>
                </div>
              </div>
            </div>

            <div className="cashbook-report-body flex-1 overflow-auto p-3 custom-scrollbar-compact bg-white">
              <Spin spinning={loading} tip="Loading..." size="small">
                {data && data.vouchers && data.vouchers.length > 0 ? (
                  <div className="legacy-report-compact font-mono fz-caption">
                    {/* Compact Company Header */}
                    <div className="text-center mb-3 border-b border-dashed border-slate-300 pb-2">
                      <div className="fz-label font-bold text-slate-800">Espat Karmchari Co-Operative Credit Society Ltd.</div>
                      <div className="fz-caption text-slate-600">Avenue A, Sahakari Sadan, Sector-C, Bhilai Nagar, DURG-490006</div>
                      <div className="flex justify-between fz-caption mt-1 text-slate-500">
                        <span>Reg: A.R/DRG/1796</span>
                        <span>Tel: 0788-2298736</span>
                      </div>
                    </div>

                    {/* Compact Report Header */}
                    <div className="flex justify-between fz-caption mb-2 text-slate-600">
                      <div>Date: {selectedDate.format('DD-MMM-YYYY')} / {dayjs().format('h:mmA')}</div>
                      <div>Page: 1</div>
                    </div>

                    <div className="border-t border-b border-dashed border-slate-400 py-1.5 text-center mb-3">
                      <div className="fz-label font-bold text-slate-800">CASH-BOOK</div>
                      <div className="fz-caption text-right text-slate-600">For: {selectedDate.format('DD-MM-YYYY')}</div>
                    </div>

                    {/* Compact Vouchers */}
                    {data.vouchers.map((voucher, vIdx) => (
                      <motion.div 
                        key={vIdx} 
                        className="mb-4 bg-gradient-to-r from-indigo-50/30 to-transparent rounded-lg p-2 border border-indigo-100/50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: vIdx * 0.05 }}
                      >
                        <div className="fz-caption mb-1.5 space-y-0.5">
                          <div className="flex justify-between font-semibold text-slate-700">
                            <span>Voucher: <span className="text-indigo-600">{voucher.voucherNo}</span></span>
                            <span>Mode: {voucher.modeOfPayment}</span>
                          </div>
                          <div className="text-slate-600">Member: {voucher.memberNo} {voucher.memberName}</div>
                          <div className="text-slate-500 italic">Note: {voucher.narration}</div>
                        </div>

                        <div className="border-t border-b border-dashed border-slate-300">
                          <table className="cashbook-voucher-table w-full fz-caption">
                            <thead>
                              <tr className="border-b border-dashed border-slate-300 bg-slate-50/50">
                                <th className="text-left py-1 px-1.5 w-8 font-bold text-slate-700">#</th>
                                <th className="text-left py-1 px-1.5 w-24 font-bold text-slate-700">Head</th>
                                <th className="text-left py-1 px-1.5 font-bold text-slate-700">Description</th>
                                <th className="text-right py-1 px-1.5 w-24 font-bold text-slate-700">Payment</th>
                                <th className="text-right py-1 px-1.5 w-24 font-bold text-slate-700">Receipt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {voucher.entries.map((entry, eIdx) => (
                                <tr key={eIdx} className={`hover:bg-indigo-50/30 transition-colors ${eIdx === voucher.entries.length - 1 ? 'border-b border-dashed border-slate-300' : ''}`}>
                                  <td className="py-1 px-1.5 text-slate-600">{entry.sno}</td>
                                  <td className="py-1 px-1.5 text-slate-700 font-medium">{entry.headCode} {entry.headName}</td>
                                  <td className="py-1 px-1.5 text-slate-600">{entry.description}</td>
                                  <td className="text-right py-1 px-1.5 font-semibold text-rose-600">{entry.payment > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{formatCurrency(entry.payment)}</>) : ''}</td>
                                  <td className="text-right py-1 px-1.5 font-semibold text-emerald-600">{entry.receipt > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{formatCurrency(entry.receipt)}</>) : ''}</td>
                                </tr>
                              ))}
                              <tr className="border-b border-dashed border-slate-400 font-bold bg-slate-50">
                                <td colSpan={3} className="py-1 px-1.5 text-right text-slate-700">Total:</td>
                                <td className="text-right py-1 px-1.5 text-rose-700">{voucher.totalPayment > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(voucher.totalPayment)}</td>
                                <td className="text-right py-1 px-1.5 text-emerald-700">{voucher.totalReceipt > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(voucher.totalReceipt)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    ))}

                    {/* Compact Summary */}
                    <div className="mt-4 fz-caption border-t border-dashed border-slate-400 pt-3 bg-gradient-to-r from-indigo-50/50 to-transparent rounded-lg p-2">
                      <div className="w-full max-w-xs">
                        <div className="flex justify-between mb-1 text-slate-700">
                          <span>Opening Balance:</span>
                          <span className="font-bold font-mono">{formatCurrency(data.openingBalance)}</span>
                        </div>
                        <div className="flex justify-between mb-1 text-slate-700">
                          <span>Total Credit:</span>
                          <span className="font-bold font-mono text-emerald-600">{data.totalReceipts > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(data.totalReceipts)}</span>
                        </div>
                        <div className="flex justify-between mb-1 border-t border-dashed border-slate-300 pt-1 text-slate-700">
                          <span>Total:</span>
                          <span className="font-bold font-mono">{formatCurrency(data.openingBalance + data.totalReceipts)}</span>
                        </div>
                        <div className="flex justify-between mb-1 text-slate-700">
                          <span>Total Debit:</span>
                          <span className="font-bold font-mono text-rose-600">{data.totalPayments > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(data.totalPayments)}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-slate-300 pt-1 text-slate-800">
                          <span className="font-bold">Closing Balance:</span>
                          <span className="font-black font-mono text-indigo-600">{formatCurrency(data.closingBalance)}</span>
                        </div>
                        <div className="border-t-2 border-dashed border-slate-400 mt-1"></div>
                      </div>
                    </div>

                    {/* Footer Note */}
                    <div className="mt-3 fz-caption text-slate-400 italic">
                      * Report as per data available
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <FileText size={60} className="text-slate-300 mb-4" />
                    <h3 className="fz-label font-bold text-slate-400 uppercase tracking-wide">No Transactions</h3>
                    <p className="fz-caption font-medium text-slate-300 uppercase mt-1.5 text-center max-w-[180px]">No data for {selectedDate.format('DD MMM YYYY')}</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="cashbook-footer bg-white/80 backdrop-blur-sm border-t border-slate-200/60 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <span className="fz-caption font-bold text-slate-400 uppercase tracking-wide">Financial Ledger v2</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="fz-caption font-semibold text-slate-300 uppercase tracking-tight">Index: {selectedDate.format('YYYYMMDD')}</span>
            <div className="w-px h-2.5 bg-slate-200" />
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-2 py-0.5 rounded fz-caption font-bold text-indigo-600 uppercase tabular-nums tracking-wide">
              v5.2.0
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar-compact::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-compact::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-compact::-webkit-scrollbar-thumb { 
          background: linear-gradient(to bottom, #e0e7ff, #c7d2fe); 
          border-radius: 10px; 
        }
        .custom-scrollbar-compact::-webkit-scrollbar-thumb:hover { 
          background: linear-gradient(to bottom, #c7d2fe, #a5b4fc); 
        }
        
        .legacy-report-compact {
          max-width: 100%;
          margin: 0 auto;
          background: white;
        }
        
        .cashbook-radio-compact .ant-radio-button-wrapper {
          font-size: 10px !important;
          font-weight: 700 !important;
          padding: 0 8px !important;
          height: 28px !important;
          line-height: 26px !important;
        }

        @media print {
           * { 
             margin: 0;
             padding: 0;
             box-sizing: border-box;
           }
           
           body {
             margin: 0;
             padding: 0;
           }
           
           body * {
             visibility: hidden;
           }

           .legacy-report-compact, .legacy-report-compact * {
             visibility: visible;
           }

           /* Belt-and-suspenders: the sidebar (stat cards, parameters) sits
              outside .legacy-report-compact and should already be caught by
              "body * { visibility: hidden }" above, but it was leaking
              through in practice — an explicit, unambiguous rule removes any
              doubt instead of relying on a single low-specificity selector. */
           .cb-no-print {
             display: none !important;
           }

           .legacy-report-compact {
             position: absolute;
             left: 50% !important;
             top: 0 !important;
             transform: translateX(-50%) !important;
             /* A4 is 8.27in wide; @page below reserves 0.5in on each side,
                leaving 7.27in. This was set to 7.5in — wider than its own
                page's content area — so it overflowed slightly and threw
                off centering. Keeping it under budget fixes that. */
             width: 7in !important;
             max-width: 7in !important;
             margin: 0 auto !important;
             padding: 0.25in !important;
             font-size: 10pt !important;
             background: white !important;
           }

           /* The voucher table's Description column has no fixed width, so
              with the default table layout algorithm, long unbroken content
              (names, narrations) forced the whole table wider than its
              7in container instead of wrapping — it then overflowed past
              both edges of the centered box and got clipped by the physical
              page. Fixed layout forces columns to respect their declared
              widths; break-word lets long text wrap instead of stretching. */
           .legacy-report-compact table {
             table-layout: fixed !important;
             width: 100% !important;
           }

           .legacy-report-compact td,
           .legacy-report-compact th {
             overflow-wrap: break-word !important;
             word-break: break-word !important;
           }
           
           .h-screen { 
             height: auto !important; 
             overflow: visible !important; 
           }
           
           button, .ant-btn, .ant-spin { 
             display: none !important; 
           }
           
           @page {
             margin: 0.5in;
             size: A4 portrait;
           }
           
           table { 
             page-break-inside: auto;
             width: 100%;
           }
           
           tr {
             page-break-inside: avoid;
             page-break-after: auto;
           }
        }

        /* ── Cash Book — dark mode ── */
        html.dark .cashbook-page { background-image: none !important; background-color: #000000 !important; color: #f5f5f7 !important; }
        html.dark .cashbook-header,
        html.dark .cashbook-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cashbook-params-card,
        html.dark .cashbook-report-panel,
        html.dark .cashbook-stat-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cashbook-card-header { background-image: none !important; background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cashbook-report-body { background-color: #1c1c1e !important; }
        html.dark .cashbook-report-body .legacy-report-compact { background-color: #1c1c1e !important; }
        html.dark .cashbook-page label { color: #8e8e93 !important; }
        html.dark .cashbook-page .text-slate-800,
        html.dark .cashbook-page .text-slate-700 { color: #f5f5f7 !important; }
        html.dark .cashbook-page .text-slate-600,
        html.dark .cashbook-page .text-slate-500 { color: #8e8e93 !important; }
        html.dark .cashbook-page .text-slate-400,
        html.dark .cashbook-page .text-slate-300 { color: #71717a !important; }
        html.dark .cashbook-page .border-slate-200,
        html.dark .cashbook-page .border-slate-100,
        html.dark .cashbook-page .border-dashed { border-color: rgba(255,255,255,.08) !important; }
        html.dark .cashbook-page .bg-white,
        html.dark .cashbook-page .bg-slate-50,
        html.dark .cashbook-page .bg-slate-50\/50 { background-color: #1c1c1e !important; background-image: none !important; }
        html.dark .cashbook-page .from-indigo-50\/30 { background-image: none !important; background-color: rgba(59,130,246,.06) !important; }
        html.dark .cashbook-page .border-indigo-100\/50 { border-color: rgba(59,130,246,.15) !important; }
        html.dark .cashbook-page .text-indigo-600 { color: #60a5fa !important; }
        html.dark .cashbook-page .text-rose-600,
        html.dark .cashbook-page .text-rose-700 { color: #ff453a !important; }
        html.dark .cashbook-page .text-emerald-600,
        html.dark .cashbook-page .text-emerald-700 { color: #34d399 !important; }
        /* antd controls */
        html.dark .cashbook-page .ant-picker,
        html.dark .cashbook-page .ant-radio-button-wrapper { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .cashbook-page .ant-picker input,
        html.dark .cashbook-page .ant-picker-suffix { color: #f5f5f7 !important; }
        html.dark .cashbook-page .ant-radio-button-wrapper-checked { background-color: #3b82f6 !important; border-color: #3b82f6 !important; color: #ffffff !important; }
        html.dark .cashbook-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        /* Voucher table */
        html.dark .cashbook-voucher-table thead tr { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.07) !important; }
        html.dark .cashbook-voucher-table th { color: #8e8e93 !important; border-color: rgba(255,255,255,.07) !important; }
        html.dark .cashbook-voucher-table td { border-color: rgba(255,255,255,.07) !important; color: #f5f5f7 !important; }
        html.dark .cashbook-voucher-table tr:hover { background-color: rgba(255,255,255,.05) !important; }
        html.dark .cashbook-voucher-table tr.bg-slate-50 { background-color: #1c1c1e !important; }
      `}</style>
      {PrintDialog}
    </ConfigProvider>
  );
};

export default CashBook;
