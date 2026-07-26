import React, { useState, useRef } from 'react';
import { ConfigProvider, Select, message, Spin, theme as antdTheme, Modal } from 'antd';
import { BookOpen, User, Search, RotateCcw, Printer, FileText, X, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import dayjs from 'dayjs';
import { apiService } from '../../../../services/api';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';

const { Option } = Select;

interface TrackingRow {
  accountNumber: string;
  accountType: string;
  trDate: string | null;
  ledgerId: number;
  lastLineNo: number;
  printedOn: string | null;
}

interface DepositRow {
  transDate: string;
  vchrNo: string;
  SH_Dr_Amt: number;
  SH_Cr_Amt: number;
  SH_Bal_Amt: number;
  FD_Dr_Amt: number;
  FD_Cr_Amt: number;
  FD_Bal_Amt: number;
  FRS_Dr_Amt: number;
  FRS_Cr_Amt: number;
  FRS_Cr_Amt1: number;
  maxLedgerId: number;
}

interface LoanRow {
  transDate: string;
  vchrNo: string;
  RLN_Dr_Amt: number;
  RLN_Cr_Amt: number;
  RLN_Bal_Amt: number;
  ALN_Dr_Amt: number;
  ALN_Cr_Amt: number;
  ALN_Bal_Amt: number;
  maxLedgerId: number;
}

interface PassbookData {
  memberDetails: { memberNo: string; memberName: string; address: string; membershipDate: string; pfNo: string };
  depositTracking: TrackingRow | null;
  loanTracking: TrackingRow | null;
  allTracking: TrackingRow[];
  depositRows: DepositRow[];
  loanRows: LoanRow[];
  totalDepositRows: number;
  totalLoanRows: number;
}

const PASSBOOK_TYPES = [
  { value: 'D', label: 'Deposit Passbook' },
  { value: 'L', label: 'Loan Passbook' },
];

const fmt = (v: number | string | null | undefined): string => {
  const n = Number(v);
  if (!n) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (d: string | null | undefined) =>
  d ? dayjs(d).format('DD-MM-YY') : '';

// Browser-only fallback (dev without Electron). The desktop app prints through
// the main process so page size/orientation are set on the job itself.
const printInIframe = (html: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 400);
  }
};

// ─── Passbook print layout ────────────────────────────────────────────────────
// Epson PLQ-35, passbook fed wide-edge-first. Page size is declared as explicit
// width × height (width > height) so neither Chromium nor the driver applies a
// rotation step. Width, height and lines-per-page are adjustable in the preview
// dialog (persisted in localStorage) so the layout can be calibrated on-site
// against the real passbook without code changes.
// widthIn/heightIn describe ONE passbook page; bookHeightIn is the full open
// book as inserted into the printer (normally two pages, so 2 × heightIn).
// The print job is sized to the whole book with content at the top, so the
// printer always starts at the top edge instead of guessing a position.
interface PageSetup { widthIn: number; heightIn: number; bookHeightIn: number; linesPerPage: number; }
const DEFAULT_PAGE_SETUP: PageSetup = { widthIn: 6, heightIn: 4, bookHeightIn: 8, linesPerPage: 20 };
const PAGE_SETUP_KEY = 'passbookPageSetup';

const DETAIL_TOP = 4;        // mm, top edge of page → header
const DETAIL_BOTTOM = 4;     // mm, reserved below the last line
const DETAIL_PAD_X = 2;      // mm, unprintable side edge
const DETAIL_HEADER_ROWS = 2; // group row + Dr/Cr/Bal row
// Column shares of the usable width (they always fill the full page width):
// DATE column + equal amount columns
const DEPOSIT_COL_SHARE = [0.13, ...Array(9).fill(0.87 / 9)];
const LOAN_COL_SHARE = [0.13, ...Array(6).fill(0.87 / 6)];

interface PrintPageChunk { body: string; rowCount: number; maxLedgerId: number; }

const buildPrintDoc = (title: string, pageBodies: string[], wMm: number, pageHMm: number, bookHMm: number, lineHMm: number, forPreview = false) => {
  const gridFontPt = Math.min(9.5, lineHMm * 2.835 * 0.72); // scale text with row pitch
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: ${wMm.toFixed(2)}mm ${bookHMm.toFixed(2)}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; color: #000; }
  .page { width: ${wMm.toFixed(2)}mm; height: ${bookHMm.toFixed(2)}mm; overflow: hidden; position: relative; page-break-after: always; background: #fff; }
  .page:last-child { page-break-after: auto; }
  .pagearea { width: 100%; height: ${pageHMm.toFixed(2)}mm; overflow: hidden; position: relative; }
  table.grid { border-collapse: collapse; table-layout: fixed; margin-left: ${DETAIL_PAD_X}mm; font-size: ${gridFontPt.toFixed(1)}pt; }
  .grid td { height: ${lineHMm.toFixed(3)}mm; line-height: ${lineHMm.toFixed(3)}mm; padding: 0 1mm; text-align: right; white-space: nowrap; overflow: hidden; }
  .grid td.date { text-align: left; }
  .grid td.hd { font-weight: bold; text-align: center; }
  .grid tr.hdrline td, .grid td.hd.date { border-bottom: 0.4mm solid #000; }
  .fp { height: 100%; box-sizing: border-box; padding: 4mm 7mm 5mm; display: flex; flex-direction: column; }
  .fp-head { text-align: center; border-bottom: 2px solid #000; padding-bottom: 2mm; }
  .fp-title { font-size: 15pt; font-weight: bold; letter-spacing: 3px; }
  .fp-sub { font-size: 9pt; margin-top: 1mm; }
  table.fp-tbl { width: 100%; border-collapse: collapse; margin-top: 3mm; font-size: 10.5pt; }
  .fp-tbl td { padding: 1.4mm 2mm; }
  .fp-tbl td.label { font-weight: bold; width: 30%; white-space: nowrap; }
  .fp-sign { margin-top: auto; display: flex; justify-content: space-between; }
  .fp-sign > div { width: 40%; text-align: center; font-size: 9pt; border-top: 1px solid #000; padding-top: 1.5mm; }
  ${forPreview ? `
  body { background: #3f434a; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px; box-sizing: border-box; }
  .page { box-shadow: 0 2px 10px rgba(0,0,0,.5); flex: none; }
  .pagearea { border-bottom: 1px dashed #999; }` : ''}
</style></head><body>${pageBodies.map(b => `<div class="page"><div class="pagearea">${b}</div></div>`).join('')}</body></html>`;
};

// Values only — the grid, headers and column separators are pre-printed in the book
const depositRowHtml = (r: DepositRow) => `<tr>
  <td class="date">${fmtDate(r.transDate)}</td>
  <td>${fmt(r.SH_Dr_Amt)}</td><td>${fmt(r.SH_Cr_Amt)}</td><td>${fmt(r.SH_Bal_Amt)}</td>
  <td>${fmt(r.FD_Dr_Amt)}</td><td>${fmt(r.FD_Cr_Amt)}</td><td>${fmt(r.FD_Bal_Amt)}</td>
  <td>${fmt(r.FRS_Dr_Amt)}</td><td>${fmt(r.FRS_Cr_Amt)}</td><td>${fmt(r.FRS_Cr_Amt1)}</td>
</tr>`;

const loanRowHtml = (r: LoanRow) => `<tr>
  <td class="date">${fmtDate(r.transDate)}</td>
  <td>${fmt(r.RLN_Dr_Amt)}</td><td>${fmt(r.RLN_Cr_Amt)}</td><td>${fmt(r.RLN_Bal_Amt)}</td>
  <td>${fmt(r.ALN_Dr_Amt)}</td><td>${fmt(r.ALN_Cr_Amt)}</td><td>${fmt(r.ALN_Bal_Amt)}</td>
</tr>`;

// Column headers, printed at the top of every fresh page (the book pages are
// plain paper — there is no pre-printed grid to rely on)
const DEPOSIT_HEADER = `
  <tr><td class="date hd" rowspan="2">DATE</td>
    <td class="hd" colspan="3">SHARE VALUE</td>
    <td class="hd" colspan="3">COMPULSORY DEPOSIT</td>
    <td class="hd" colspan="2">F.R.S.-1</td>
    <td class="hd">F.R.S.-2</td></tr>
  <tr class="hdrline">
    <td>Dr.</td><td>Cr.</td><td>Bal.</td>
    <td>Dr.</td><td>Cr.</td><td>Bal.</td>
    <td>Dr.</td><td>Cr.</td><td>Cr.</td></tr>`;

const LOAN_HEADER = `
  <tr><td class="date hd" rowspan="2">DATE</td>
    <td class="hd" colspan="3">REGULAR LOAN</td>
    <td class="hd" colspan="3">EMERGENCY LOAN</td></tr>
  <tr class="hdrline">
    <td>Dr.</td><td>Cr.</td><td>Bal.</td>
    <td>Dr.</td><td>Cr.</td><td>Bal.</td></tr>`;

// headerHtml is empty when resuming a partly-used page — its header was already
// printed in an earlier session, so we only skip past the used lines.
const detailPageBody = (rowsHtml: string, headerHtml: string, colsMm: number[], startLine: number, lineHMm: number) => {
  const skipMm = DETAIL_TOP + (headerHtml ? 0 : (DETAIL_HEADER_ROWS + startLine) * lineHMm);
  return `
  <div style="height:${skipMm.toFixed(2)}mm"></div>
  <table class="grid">
    <colgroup>${colsMm.map(w => `<col style="width:${w.toFixed(2)}mm">`).join('')}</colgroup>
    ${headerHtml ? `<thead>${headerHtml}</thead>` : ''}
    <tbody>${rowsHtml}</tbody>
  </table>`;
};

const PassBookPrinting: React.FC = () => {
  const [memberNo, setMemberNo] = useState('');
  const [passbookType, setPassbookType] = useState<'D' | 'L'>('D');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [data, setData] = useState<PassbookData | null>(null);
  const [showMemberLookup, setShowMemberLookup] = useState(false);
  const [previewKind, setPreviewKind] = useState<'first' | 'details' | null>(null);
  const [pageSetup, setPageSetup] = useState<PageSetup>(() => {
    try {
      const saved = { ...DEFAULT_PAGE_SETUP, ...JSON.parse(localStorage.getItem(PAGE_SETUP_KEY) || '{}') };
      if (saved.widthIn > 0 && saved.heightIn > 0 && saved.bookHeightIn > 0 && saved.linesPerPage > 0) return saved as PageSetup;
    } catch { /* fall through to defaults */ }
    return DEFAULT_PAGE_SETUP;
  });
  const [printers, setPrinters] = useState<Array<{ name: string; displayName?: string; isDefault?: boolean }>>([]);
  const [printerName, setPrinterName] = useState<string>(() => localStorage.getItem('passbookPrinterName') || '');
  const printRef = useRef<HTMLDivElement>(null);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Theme variables
  const bg      = isDark ? 'bg-[#0f172a]'                           : 'bg-slate-50';
  const header  = isDark ? 'border-b border-slate-700 bg-slate-800' : 'border-b border-slate-200 bg-white/80 backdrop-blur-sm';
  const panel   = isDark ? 'border border-slate-700 bg-slate-800'   : 'border border-slate-200 bg-white';
  const panelHd = isDark ? 'border-b border-slate-700'              : 'border-b border-slate-100 bg-slate-50';
  const text    = isDark ? 'text-white'                             : 'text-slate-800';
  const muted   = isDark ? 'text-slate-400'                         : 'text-slate-500';
  const subtle  = isDark ? 'text-slate-500'                         : 'text-slate-400';
  const tblHd   = isDark ? 'bg-slate-900/60'                        : 'bg-slate-100';
  const tblHdTx = isDark ? 'text-slate-400'                         : 'text-slate-600';
  const tblBdr  = isDark ? 'border-slate-700'                       : 'border-slate-200';
  const rowEven = isDark ? 'bg-slate-800'                           : 'bg-white';
  const rowOdd  = isDark ? 'bg-slate-800/50'                        : 'bg-slate-50';
  const rowTx   = isDark ? 'text-slate-300'                         : 'text-slate-700';
  const inpBg   = isDark ? 'bg-slate-700 border-slate-600 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500';
  const btnSec  = isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300';

  const handleLoad = async () => {
    if (!memberNo.trim()) { message.warning('Enter a member number'); return; }
    setLoading(true);
    try {
      const resp = await apiService.getPassBookPrinting({ memberNo: memberNo.trim() });
      if (resp.success && resp.data) {
        setData(resp.data);
      } else {
        message.error(resp.message || 'Member not found');
        setData(null);
      }
    } catch { message.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleMemberSelect = (m: any) => {
    setMemberNo(m.memberNo || m.mbno || '');
    setShowMemberLookup(false);
  };

  const handleReset = async () => {
    if (!memberNo.trim()) { message.warning('Enter member number first'); return; }
    setResetting(true);
    try {
      const resp = await apiService.resetPassbookPrinting(memberNo.trim(), passbookType);
      if (resp.success) {
        message.success('Passbook printing reset successfully');
        await handleLoad();
      } else {
        message.error(resp.message || 'Reset failed');
      }
    } catch { message.error('Reset error'); }
    finally { setResetting(false); }
  };

  const depositTracking = data?.depositTracking;
  const loanTracking = data?.loanTracking;
  const activeRows = passbookType === 'D' ? (data?.depositRows ?? []) : (data?.loanRows ?? []);
  const totalPending = activeRows.length;

  // Physical page derived from the user-adjustable setup
  const pageWMm = pageSetup.widthIn * 25.4;
  const pageHMm = pageSetup.heightIn * 25.4;
  const bookHMm = Math.max(pageSetup.bookHeightIn * 25.4, pageHMm);
  const detailLineH = Math.max(2.2,
    (pageHMm - DETAIL_TOP - DETAIL_BOTTOM) / Math.max(1, pageSetup.linesPerPage + DETAIL_HEADER_ROWS));

  const updatePageSetup = (patch: Partial<PageSetup>) => {
    setPageSetup(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PAGE_SETUP_KEY, JSON.stringify(next));
      return next;
    });
  };

  const buildFirstPageBody = () => {
    const m = data!.memberDetails;
    return `<div class="fp">
  <div class="fp-head">
    <div class="fp-title">${passbookType === 'D' ? 'DEPOSIT BOOK' : 'LOAN BOOK'}</div>
    <div class="fp-sub">Espat Karmchari Co-Operative Credit Society Ltd.</div>
    <div class="fp-sub">Bhilai Nagar, DURG-490006 &nbsp;|&nbsp; Reg: A.R/DRG/1796</div>
  </div>
  <table class="fp-tbl">
    <tr><td class="label">Member No.</td><td>: ${m.memberNo}</td>
        <td class="label">Date</td><td>: ${dayjs().format('DD-MM-YYYY')}</td></tr>
    <tr><td class="label">Member Name</td><td colspan="3">: ${m.memberName}</td></tr>
    <tr><td class="label">Address</td><td colspan="3">: ${m.address || ''}</td></tr>
    <tr><td class="label">Membership Date</td>
        <td>: ${m.membershipDate ? dayjs(m.membershipDate).format('DD-MM-YYYY') : ''}</td>
        <td class="label">PF No.</td><td>: ${m.pfNo || ''}</td></tr>
    <tr><td class="label">Passbook Type</td>
        <td colspan="3">: ${passbookType === 'D' ? 'DEPOSIT' : 'LOAN'}</td></tr>
  </table>
  <div class="fp-sign">
    <div>Secretary</div>
    <div>Managing Director</div>
  </div>
</div>`;
  };

  // Split pending rows into passbook pages. The first page resumes below the
  // lines already used (tracking lastLineNo); each following page starts at line 0.
  const buildDetailChunks = (): PrintPageChunk[] => {
    const lines = pageSetup.linesPerPage;
    const tracking = passbookType === 'D' ? depositTracking : loanTracking;
    const usedLines = (((tracking?.lastLineNo ?? 0) % lines) + lines) % lines;
    const usableW = pageWMm - 2 * DETAIL_PAD_X;
    const colsMm = (passbookType === 'D' ? DEPOSIT_COL_SHARE : LOAN_COL_SHARE).map(s => s * usableW);
    const chunks: PrintPageChunk[] = [];
    let idx = 0;
    let startLine = usedLines;
    while (idx < activeRows.length) {
      const slice = activeRows.slice(idx, idx + (lines - startLine));
      const rowsHtml = passbookType === 'D'
        ? (slice as DepositRow[]).map(depositRowHtml).join('')
        : (slice as LoanRow[]).map(loanRowHtml).join('');
      const headerHtml = startLine === 0 ? (passbookType === 'D' ? DEPOSIT_HEADER : LOAN_HEADER) : '';
      chunks.push({
        body: detailPageBody(rowsHtml, headerHtml, colsMm, startLine, detailLineH),
        rowCount: slice.length,
        maxLedgerId: slice.reduce((max, r) => Math.max(max, Number(r.maxLedgerId) || 0), 0),
      });
      idx += slice.length;
      startLine = 0;
    }
    return chunks;
  };

  // The member-details (first) page is printed once, when the passbook is
  // issued. Any printing history on the tracking row means it already exists.
  const firstPageAlreadyPrinted = () => {
    const t = passbookType === 'D' ? depositTracking : loanTracking;
    return !!t && (!!t.printedOn || Number(t.ledgerId) > 0 || Number(t.lastLineNo) > 0);
  };

  const openPreview = async (kind: 'first' | 'details') => {
    if (!data) { message.warning('Load member data first'); return; }
    if (kind === 'details' && totalPending === 0) { message.info('No new transactions to print'); return; }

    if (kind === 'first' && firstPageAlreadyPrinted()) {
      const proceed = await new Promise<boolean>(resolve => {
        Modal.confirm({
          title: 'First page already printed',
          content: 'This passbook already has printing history — member details are normally printed only once, when the passbook is issued. Print the first page again (e.g. for a new/duplicate passbook)?',
          okText: 'Print again',
          cancelText: 'Cancel',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!proceed) return;
    }

    const api = window.electronAPI;
    if (api?.getPrinters && printers.length === 0) {
      api.getPrinters().then(list => {
        setPrinters(list || []);
        if (!printerName) {
          const match = (list || []).find(p => /plq/i.test(p.name)) || (list || []).find(p => p.isDefault);
          if (match) setPrinterName(match.name);
        }
      }).catch(() => { /* printer list is optional */ });
    }
    setPreviewKind(kind);
  };

  // Preview content is derived on the fly so page-setup changes re-render it live
  const previewTitle = previewKind === 'first'
    ? 'Passbook First Page'
    : `Passbook Details - ${passbookType === 'D' ? 'Deposit' : 'Loan'}`;
  const previewPages: PrintPageChunk[] = previewKind && data
    ? (previewKind === 'first'
      ? [{ body: buildFirstPageBody(), rowCount: 0, maxLedgerId: 0 }]
      : buildDetailChunks())
    : [];
  const previewHtml = previewPages.length
    ? buildPrintDoc(previewTitle, previewPages.map(p => p.body), pageWMm, pageHMm, bookHMm, detailLineH, true)
    : '';

  const confirmFlip = (nextPage: number, total: number) => new Promise<boolean>(resolve => {
    Modal.confirm({
      title: 'Flip passbook page',
      content: `Page ${nextPage - 1} of ${total} printed. Flip the passbook to the next page, insert it into the printer, then press Continue.`,
      okText: 'Continue printing',
      cancelText: 'Stop',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

  // Prints page by page (the operator flips the book between pages) and marks
  // rows as printed only after their page has actually printed successfully.
  const handleConfirmPrint = async () => {
    if (!previewKind || !data || previewPages.length === 0) return;
    const kind = previewKind;
    const pages = previewPages;
    const api = window.electronAPI;

    if (!api?.passbookPrint) {
      // Browser dev fallback — no silent printing available
      printInIframe(buildPrintDoc(previewTitle, pages.map(p => p.body), pageWMm, pageHMm, bookHMm, detailLineH));
      const maxLedgerId = Math.max(0, ...pages.map(p => p.maxLedgerId));
      if (kind === 'details' && maxLedgerId > 0) {
        try {
          await apiService.updatePassbookTracking(memberNo.trim(), passbookType, maxLedgerId, totalPending);
          await handleLoad();
        } catch { /* non-fatal */ }
      }
      setPreviewKind(null);
      return;
    }

    setPrinting(true);
    try {
      let printedRows = 0;
      let pagesPrinted = 0;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (!page) continue;
        if (i > 0) {
          const proceed = await confirmFlip(i + 1, pages.length);
          if (!proceed) break;
        }
        const res = await api.passbookPrint({
          html: buildPrintDoc(previewTitle, [page.body], pageWMm, pageHMm, bookHMm, detailLineH),
          widthMm: pageWMm,
          heightMm: bookHMm,
          ...(printerName ? { deviceName: printerName } : {}),
        });
        if (!res?.success) {
          message.error(`Print failed: ${res?.error || 'unknown error'}`);
          break;
        }
        pagesPrinted++;
        if (kind === 'details' && page.maxLedgerId > 0) {
          try {
            await apiService.updatePassbookTracking(memberNo.trim(), passbookType, page.maxLedgerId, page.rowCount);
          } catch { /* non-fatal — reprint can be reset from this screen */ }
          printedRows += page.rowCount;
        }
      }
      if (pagesPrinted === pages.length) {
        message.success(kind === 'first' ? 'First page printed' : `Passbook details printed (${printedRows} transactions)`);
      } else if (pagesPrinted > 0) {
        message.warning(`Stopped after ${pagesPrinted} of ${pages.length} pages — remaining rows are still pending`);
      }
      if (kind === 'details' && printedRows > 0) await handleLoad();
    } finally {
      setPrinting(false);
      setPreviewKind(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#6366f1',
        borderRadius: 6,
        colorBgContainer: isDark ? '#1e293b' : '#ffffff',
        colorBorder: isDark ? '#334155' : '#e2e8f0',
      }
    }}>
      <div className={`h-screen flex flex-col overflow-hidden font-sans ${bg} ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className={`px-4 py-3 flex items-center justify-between shrink-0 ${header}`}>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`text-sm font-black uppercase tracking-wider ${text}`}>Pass Book Printing</h1>
              <p className={`text-[10px] mt-0.5 ${muted}`}>Enter member number to load passbook tracking details</p>
            </div>
          </div>
        </motion.div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4">

          {/* Member Input */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl overflow-hidden shrink-0 ${panel}`}>
            <div className={`px-5 py-3 flex items-center gap-2 ${panelHd}`}>
              <User size={14} className="text-indigo-400" />
              <h2 className={`text-xs font-black uppercase tracking-wider ${text}`}>Member Details</h2>
            </div>
            <div className="p-4 flex flex-wrap gap-5 items-end">
              <div className="space-y-1.5 flex-1 min-w-[180px]">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Member Number</label>
                <div className="flex gap-2">
                  <input
                    value={memberNo}
                    onChange={e => setMemberNo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLoad()}
                    placeholder="e.g. 610031401"
                    className={`flex-1 h-9 border rounded-lg px-3 text-sm focus:outline-none transition-colors ${inpBg}`}
                  />
                  <button onClick={() => setShowMemberLookup(true)}
                    className={`h-9 px-3 rounded-lg transition-all flex items-center gap-1.5 ${btnSec}`}>
                    <Users size={13} />
                  </button>
                  <button onClick={handleLoad} disabled={loading}
                    className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50">
                    {loading ? <Spin size="small" /> : <Search size={13} />} Search
                  </button>
                </div>
                {data?.memberDetails.memberName && (
                  <p className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{data.memberDetails.memberName}</p>
                )}
              </div>

              <div className="space-y-1.5 min-w-[200px]">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Deposit / Loan Passbook</label>
                <Select value={passbookType} onChange={v => setPassbookType(v)} className="w-full" style={{ height: 36 }}>
                  {PASSBOOK_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                </Select>
              </div>

              {data?.memberDetails.address && (
                <div className="space-y-1 min-w-[160px]">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Address</label>
                  <p className={`text-xs ${rowTx}`}>{data.memberDetails.address}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Tracking & Transactions */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className={`rounded-xl overflow-hidden flex-1 flex flex-col min-h-0 ${panel}`}>

            <div className={`px-5 py-3 flex items-center gap-2 shrink-0 ${panelHd}`}>
              <FileText size={14} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
              <h2 className={`text-xs font-black uppercase tracking-wider ${text}`}>Pass Book Printing Details</h2>
              {data && (
                <span className={`ml-auto text-[10px] font-mono ${muted}`}>
                  {totalPending} pending {passbookType === 'D' ? 'deposit' : 'loan'} rows
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {/* Tracking summary row */}
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className={tblHd}>
                    <th className={`text-left px-4 py-2.5 font-bold uppercase tracking-wider border-b ${tblBdr} ${tblHdTx}`}>Tr_Date Printed</th>
                    <th className={`text-center px-4 py-2.5 font-bold uppercase tracking-wider border-b border-l ${tblBdr} ${tblHdTx}`}>
                      <div>Deposit</div><div className={`font-normal normal-case text-[10px] ${subtle}`}>Last Row_Id Printed</div>
                    </th>
                    <th className={`text-center px-4 py-2.5 font-bold uppercase tracking-wider border-b border-l ${tblBdr} ${tblHdTx}`}>
                      <div>Loan</div><div className={`font-normal normal-case text-[10px] ${subtle}`}>Last Row_Id Printed</div>
                    </th>
                    <th className={`text-center px-4 py-2.5 font-bold uppercase tracking-wider border-b border-l ${tblBdr} ${tblHdTx}`}>Last Line No.</th>
                  </tr>
                </thead>
                <tbody>
                  {data ? (
                    <tr className={`border-b transition-colors ${tblBdr} ${isDark ? 'bg-slate-800 hover:bg-slate-700/30' : 'bg-white hover:bg-slate-50'}`}>
                      <td className={`px-4 py-3 font-mono ${rowTx}`}>
                        {(passbookType === 'D' ? depositTracking : loanTracking)?.trDate
                          ? dayjs((passbookType === 'D' ? depositTracking : loanTracking)!.trDate).format('DD-MM-YYYY')
                          : <span className={subtle}>—</span>}
                      </td>
                      <td className={`px-4 py-3 text-center border-l ${tblBdr}`}>
                        <span className={`font-mono font-bold ${depositTracking?.ledgerId ? (isDark ? 'text-indigo-300' : 'text-indigo-600') : subtle}`}>
                          {depositTracking?.ledgerId ?? 0}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-center border-l ${tblBdr}`}>
                        <span className={`font-mono font-bold ${loanTracking?.ledgerId ? (isDark ? 'text-emerald-300' : 'text-emerald-600') : subtle}`}>
                          {loanTracking?.ledgerId ?? 0}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-center border-l ${tblBdr}`}>
                        <span className={`font-mono ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                          {(passbookType === 'D' ? depositTracking : loanTracking)?.lastLineNo ?? 0}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={4} className={`px-4 py-8 text-center text-xs ${muted}`}>
                        {loading ? 'Loading…' : 'Enter a member number and click Search to load passbook details'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pending transactions grid */}
              {data && totalPending > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      Pending: {totalPending} unprinted {passbookType === 'D' ? 'deposit' : 'loan'} transactions
                    </span>
                  </div>

                  <div className={`rounded-lg border overflow-auto ${tblBdr}`}>
                    {passbookType === 'D' ? (
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className={`${tblHd} border-b ${tblBdr}`}>
                            <th rowSpan={2} className={`text-left px-2 py-2 font-bold border-b border-r whitespace-nowrap ${tblBdr} ${tblHdTx}`}>#</th>
                            <th rowSpan={2} className={`text-left px-2 py-2 font-bold border-b border-r whitespace-nowrap ${tblBdr} ${tblHdTx}`}>TrDate</th>
                            <th rowSpan={2} className={`text-left px-2 py-2 font-bold border-b border-r whitespace-nowrap ${tblBdr} ${tblHdTx}`}>Vchr No</th>
                            <th colSpan={3} className={`text-center px-2 py-1 font-bold border-b border-r ${tblBdr} ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Share Value</th>
                            <th colSpan={3} className={`text-center px-2 py-1 font-bold border-b border-r ${tblBdr} ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>Compulsory Deposit</th>
                            <th colSpan={2} className={`text-center px-2 py-1 font-bold border-b border-r ${tblBdr} ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>F.R.S.-1</th>
                            <th className={`text-center px-2 py-1 font-bold border-b ${tblBdr} ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>F.R.S.-2</th>
                          </tr>
                          <tr className={`${isDark ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
                            {['Dr','Cr','Bal','Dr','Cr','Bal','Dr','Cr','Cr'].map((h, i, arr) => (
                              <th key={i} className={`text-right px-2 py-1 font-bold border-b ${i < arr.length-1 ? 'border-r' : ''} ${tblBdr} ${tblHdTx}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(data.depositRows).map((r, i) => (
                            <tr key={i} className={`border-t ${tblBdr} ${i % 2 === 0 ? rowEven : rowOdd}`}>
                              <td className={`px-2 py-1.5 font-mono border-r ${tblBdr} ${subtle}`}>{i + 1}</td>
                              <td className={`px-2 py-1.5 whitespace-nowrap border-r ${tblBdr} ${rowTx}`}>{fmtDate(r.transDate)}</td>
                              <td className={`px-2 py-1.5 font-mono border-r ${tblBdr} ${muted}`}>{r.vchrNo || '—'}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{fmt(r.SH_Dr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmt(r.SH_Cr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono font-bold border-r ${tblBdr} ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{fmt(r.SH_Bal_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{fmt(r.FD_Dr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmt(r.FD_Cr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono font-bold border-r ${tblBdr} ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{fmt(r.FD_Bal_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{fmt(r.FRS_Dr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmt(r.FRS_Cr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>{fmt(r.FRS_Cr_Amt1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className={`${tblHd} border-b ${tblBdr}`}>
                            <th rowSpan={2} className={`text-left px-2 py-2 font-bold border-b border-r ${tblBdr} ${tblHdTx}`}>#</th>
                            <th rowSpan={2} className={`text-left px-2 py-2 font-bold border-b border-r whitespace-nowrap ${tblBdr} ${tblHdTx}`}>TrDate</th>
                            <th rowSpan={2} className={`text-left px-2 py-2 font-bold border-b border-r whitespace-nowrap ${tblBdr} ${tblHdTx}`}>Vchr No</th>
                            <th colSpan={3} className={`text-center px-2 py-1 font-bold border-b border-r ${tblBdr} ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Regular Loan</th>
                            <th colSpan={3} className={`text-center px-2 py-1 font-bold border-b ${tblBdr} ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>Emergency Loan</th>
                          </tr>
                          <tr className={`${isDark ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
                            {['Dr','Cr','Bal','Dr','Cr','Bal'].map((h, i, arr) => (
                              <th key={i} className={`text-right px-2 py-1 font-bold border-b ${i < arr.length-1 ? 'border-r' : ''} ${tblBdr} ${tblHdTx}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(data.loanRows).map((r, i) => (
                            <tr key={i} className={`border-t ${tblBdr} ${i % 2 === 0 ? rowEven : rowOdd}`}>
                              <td className={`px-2 py-1.5 font-mono border-r ${tblBdr} ${subtle}`}>{i + 1}</td>
                              <td className={`px-2 py-1.5 whitespace-nowrap border-r ${tblBdr} ${rowTx}`}>{fmtDate(r.transDate)}</td>
                              <td className={`px-2 py-1.5 font-mono border-r ${tblBdr} ${muted}`}>{r.vchrNo || '—'}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{fmt(r.RLN_Dr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmt(r.RLN_Cr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono font-bold border-r ${tblBdr} ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{fmt(r.RLN_Bal_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{fmt(r.ALN_Dr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border-r ${tblBdr} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmt(r.ALN_Cr_Amt)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{fmt(r.ALN_Bal_Amt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {data && totalPending === 0 && (
                <div className={`px-4 py-6 text-center text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  All transactions have been printed
                </div>
              )}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="flex justify-end gap-3 shrink-0">
            <button onClick={handleReset} disabled={!data || resetting}
              className={`h-9 px-5 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 active:scale-95 disabled:opacity-40 border ${isDark ? 'bg-slate-700 hover:bg-slate-600 border-slate-600' : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-700'}`}>
              {resetting ? <Spin size="small" /> : <RotateCcw size={13} />} Reset Printing
            </button>
            <button onClick={() => openPreview('first')} disabled={!data || printing}
              className="h-9 px-5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-40">
              <FileText size={13} /> Print First Page
            </button>
            <button onClick={() => openPreview('details')} disabled={!data || printing || totalPending === 0}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-40">
              {printing ? <Spin size="small" /> : <Printer size={13} />} Print Details
            </button>
            <button onClick={() => { setData(null); setMemberNo(''); }}
              className="h-9 px-4 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 active:scale-95">
              <X size={13} /> Exit
            </button>
          </motion.div>
        </div>

        <div ref={printRef} className="hidden" />

        <Modal
          title={<div className="flex items-center gap-2"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><Users size={16} className="text-white" /></div><span className="font-black">Member Lookup</span></div>}
          open={showMemberLookup} onCancel={() => setShowMemberLookup(false)} footer={null} width={1000} centered destroyOnClose>
          <MemberLookup isModal onSelect={handleMemberSelect} onClose={() => setShowMemberLookup(false)} />
        </Modal>

        {/* Print preview — exact render of the job sent to the passbook printer */}
        <Modal
          title={<div className="flex items-center gap-2"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><Printer size={16} className="text-white" /></div><span className="font-black">Print Preview — {previewKind === 'first' ? 'First Page' : 'Passbook Details'}</span></div>}
          open={!!previewKind}
          onCancel={() => !printing && setPreviewKind(null)}
          width={880}
          centered
          destroyOnClose
          footer={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 mr-auto">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Printer</span>
                <Select
                  {...(printerName ? { value: printerName } : {})}
                  placeholder="Ask via system dialog"
                  onChange={(v: string) => { setPrinterName(v); localStorage.setItem('passbookPrinterName', v); }}
                  style={{ minWidth: 230 }}
                  disabled={printing}
                  options={printers.map(p => ({ value: p.name, label: p.displayName || p.name }))}
                />
              </div>
              <button onClick={() => setPreviewKind(null)} disabled={printing}
                className={`h-9 px-5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${btnSec}`}>
                Cancel
              </button>
              <button onClick={handleConfirmPrint} disabled={printing}
                className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40">
                {printing ? <Spin size="small" /> : <Printer size={13} />} Print
              </button>
            </div>
          }>
          {previewKind && (
            <div className="space-y-2">
              <div className="flex items-end gap-4 flex-wrap">
                {([
                  { label: 'Page width (in)', key: 'widthIn', step: 0.1, min: 2 },
                  { label: 'Page height (in)', key: 'heightIn', step: 0.1, min: 2 },
                  { label: 'Book height (in)', key: 'bookHeightIn', step: 0.1, min: 2 },
                  { label: 'Lines / page', key: 'linesPerPage', step: 1, min: 5 },
                ] as const).map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className={`block text-[10px] font-bold uppercase tracking-wider ${muted}`}>{f.label}</label>
                    <input
                      type="number" step={f.step} min={f.min} value={pageSetup[f.key]}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v) && v > 0) updatePageSetup({ [f.key]: v } as Partial<PageSetup>);
                      }}
                      className={`w-20 h-8 border rounded-lg px-2 text-xs focus:outline-none ${inpBg}`}
                    />
                  </div>
                ))}
                <span className={`text-[10px] pb-2 ${muted}`}>job = {pageWMm.toFixed(1)} × {bookHMm.toFixed(1)} mm</span>
              </div>
              <iframe
                title="Passbook print preview"
                srcDoc={previewHtml}
                style={{ width: '100%', height: 420, border: 'none', borderRadius: 8, background: '#3f434a' }}
              />
              <p className={`text-[11px] ${muted}`}>
                {previewPages.length} page{previewPages.length > 1 ? 's' : ''}, {pageSetup.linesPerPage} lines per page.
                Content prints from the top of the inserted book; the dashed line in the preview marks where the passbook page (fold) ends.
                {previewPages.length > 1 && ' Pages print one at a time — you will be asked to flip the passbook between pages.'}
              </p>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default PassBookPrinting;
