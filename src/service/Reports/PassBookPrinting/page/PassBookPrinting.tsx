import React, { useState } from 'react';
import { message, Modal } from 'antd';
import { BookOpen, Search, RotateCcw, Printer, FileText, X, ChevronLeft, ChevronRight, Save, Trash2 } from 'lucide-react';
import { isFailure } from '@/utils/dialog';
import dayjs from 'dayjs';
import { apiService } from '../../../../services/api';
import MemberField from '../../../../components/shared/kit/MemberField';
import AwDialog from '../../../../components/shared/kit/AwDialog';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../components/reports/views/ReportShell';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';

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

// Named page-size presets, editable from the preview dialog — different
// passbook vendors/models use different physical sizes. Seeded with a few
// reasonable defaults; the user can rename, add, or delete freely.
interface PageSetupPreset extends PageSetup { name: string; }
const DEFAULT_PRESETS: PageSetupPreset[] = [
  { name: 'PLQ-35 Standard (6×4)', widthIn: 6, heightIn: 4, bookHeightIn: 8, linesPerPage: 20 },
  { name: 'Compact Passbook (5×3.5)', widthIn: 5, heightIn: 3.5, bookHeightIn: 7, linesPerPage: 18 },
  { name: 'Wide Passbook (7×4)', widthIn: 7, heightIn: 4, bookHeightIn: 8, linesPerPage: 20 },
];
const PRESETS_KEY = 'passbookPagePresets';

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
    <td class="hd" colspan="3">RD/CD</td>
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
  const [previewKind, setPreviewKind] = useState<'first' | 'details' | null>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [pageSetup, setPageSetup] = useState<PageSetup>(() => {
    try {
      const saved = { ...DEFAULT_PAGE_SETUP, ...JSON.parse(localStorage.getItem(PAGE_SETUP_KEY) || '{}') };
      if (saved.widthIn > 0 && saved.heightIn > 0 && saved.bookHeightIn > 0 && saved.linesPerPage > 0) return saved as PageSetup;
    } catch { /* fall through to defaults */ }
    return DEFAULT_PAGE_SETUP;
  });
  const [presets, setPresets] = useState<PageSetupPreset[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PRESETS_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch { /* fall through to defaults */ }
    return DEFAULT_PRESETS;
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [printers, setPrinters] = useState<Array<{ name: string; displayName?: string; isDefault?: boolean }>>([]);
  const [printerName, setPrinterName] = useState<string>(() => localStorage.getItem('passbookPrinterName') || '');

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
    setSelectedPreset(''); // manual edit no longer matches any saved preset
  };

  const persistPresets = (next: PageSetupPreset[]) => {
    setPresets(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
  };

  const applyPreset = (name: string) => {
    const preset = presets.find(p => p.name === name);
    if (!preset) return;
    const { name: _n, ...setup } = preset;
    setPageSetup(setup);
    localStorage.setItem(PAGE_SETUP_KEY, JSON.stringify(setup));
    setSelectedPreset(name);
  };

  const saveCurrentAsPreset = () => {
    const name = newPresetName.trim();
    if (!name) return;
    const withoutSameName = presets.filter(p => p.name !== name);
    persistPresets([...withoutSameName, { name, ...pageSetup }]);
    setSelectedPreset(name);
    setNewPresetName('');
    setSavingPreset(false);
  };

  const deleteSelectedPreset = () => {
    if (!selectedPreset) return;
    persistPresets(presets.filter(p => p.name !== selectedPreset));
    setSelectedPreset('');
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

    setPreviewPageIndex(0);
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
  // Shown one page at a time (Prev/Next below) rather than a long stacked
  // scroll, so each physical passbook page can be checked individually.
  const clampedPageIndex = Math.min(previewPageIndex, Math.max(0, previewPages.length - 1));
  const currentPreviewPage = previewPages[clampedPageIndex];
  const previewHtml = currentPreviewPage
    ? buildPrintDoc(previewTitle, [currentPreviewPage.body], pageWMm, pageHMm, bookHMm, detailLineH, true)
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
          const tracked = await apiService.updatePassbookTracking(memberNo.trim(), passbookType, maxLedgerId, totalPending);
          if (isFailure(tracked)) { message.warning('The passbook was printed but the printed rows could not be recorded, so a reprint may repeat them. Please try again or reset the passbook from this screen.'); } else await handleLoad();
        } catch { message.warning('The passbook was printed but the printed rows could not be recorded, so a reprint may repeat them. Please try again or reset the passbook from this screen.'); }
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
            const tracked = await apiService.updatePassbookTracking(memberNo.trim(), passbookType, page.maxLedgerId, page.rowCount);
            if (isFailure(tracked)) message.warning('The passbook was printed but the printed rows could not be recorded, so a reprint may repeat them. Please try again or reset the passbook from this screen.');
          } catch { message.warning('The passbook was printed but the printed rows could not be recorded, so a reprint may repeat them. Please try again or reset the passbook from this screen.'); }
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
  const activeTracking = passbookType === 'D' ? depositTracking : loanTracking;
  const kindLabel = passbookType === 'D' ? 'deposit' : 'loan';
  const drCell = (v: number) => <td className="is-right" style={{ color: 'var(--aw-danger)' }}>{v > 0 && <CrDrIndicator type="debit" className="mr-1" />}{fmt(v)}</td>;
  const crCell = (v: number) => <td className="is-right is-success">{v > 0 && <CrDrIndicator type="credit" className="mr-1" />}{fmt(v)}</td>;
  const balCell = (v: number) => <td className="is-right is-accent">{fmt(v)}</td>;

  return (
    <ReportShell
      className="pbp-page"
      title="Pass Book Printing"
      desc="Enter a member number to load the passbook tracking details"
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset} disabled={!data || resetting}><RotateCcw size={14} className={resetting ? 'aw-spin' : undefined} /> Reset printing</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={() => openPreview('first')} disabled={!data || printing}><FileText size={14} /> Print first page</button>
          <button type="button" className="aw-btn aw-btn-primary" onClick={() => openPreview('details')} disabled={!data || printing || totalPending === 0}><Printer size={14} className={printing ? 'aw-spin' : undefined} /> Print details</button>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setData(null); setMemberNo(''); }}><X size={14} /> Exit</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Member" icon={<BookOpen size={14} />}>
            <div>
              <label className="aw-label" htmlFor="pbp-member">Member number</label>
              <MemberField id="pbp-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={() => handleLoad()} placeholder="e.g. 610031401" />
            </div>
            <div>
              <label className="aw-label" htmlFor="pbp-type">Deposit / loan passbook</label>
              <select id="pbp-type" className="aw-input" value={passbookType} onChange={e => setPassbookType(e.target.value as 'D' | 'L')}>
                {PASSBOOK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <button type="button" className="aw-btn aw-btn-secondary" onClick={() => handleLoad()} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Search'}
            </button>
            {data?.memberDetails.memberName && <p className="aw-strong">{data.memberDetails.memberName}</p>}
            {data?.memberDetails.address && (
              <div><span className="aw-label">Address</span><p className="aw-meta">{data.memberDetails.address}</p></div>
            )}
          </ParamCard>
          {data && <StatCards items={[{ label: `Pending ${kindLabel} rows`, value: String(totalPending), tone: totalPending > 0 ? 'warning' : 'success' }]} />}
        </>
      }
      footerLeft="Pass Book Printing"
      footerRight={data ? `Member ${data.memberDetails.memberNo}` : ''}
    >
      {!data ? (
        <ReportEmpty icon={<BookOpen size={34} />} title={loading ? 'Loading…' : 'No Member Loaded'} hint="Enter a member number and click Search to load passbook details" />
      ) : (
        <>
          <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="aw-main-head">
              <span className="aw-card-title">Pass Book Printing Details</span>
              <span className="aw-meta">{totalPending} pending {kindLabel} rows</span>
            </div>
            <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
              <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                <table className="aw-table">
                  <thead>
                    <tr>
                      <th>Tr_Date printed</th>
                      <th className="is-center">Deposit: last Row_Id printed</th>
                      <th className="is-center">Loan: last Row_Id printed</th>
                      <th className="is-center">Last line no.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{activeTracking?.trDate ? dayjs(activeTracking.trDate).format('DD-MM-YYYY') : <span className="is-muted">—</span>}</td>
                      <td className="is-center is-accent">{depositTracking?.ledgerId ?? 0}</td>
                      <td className="is-center is-accent">{loanTracking?.ledgerId ?? 0}</td>
                      <td className="is-center">{activeTracking?.lastLineNo ?? 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {totalPending > 0 ? (
            <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="aw-main-head">
                <span className="aw-card-title">Pending: {totalPending} unprinted {kindLabel} transactions</span>
              </div>
              <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
                <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                  {passbookType === 'D' ? (
                    <table className="aw-table">
                      <thead>
                        <tr>
                          <th rowSpan={2}>#</th><th rowSpan={2}>TrDate</th><th rowSpan={2}>Vchr no</th>
                          <th colSpan={3} className="is-center">Share value</th>
                          <th colSpan={3} className="is-center">Compulsory deposit</th>
                          <th colSpan={2} className="is-center">F.R.S.-1</th>
                          <th className="is-center">F.R.S.-2</th>
                        </tr>
                        <tr>
                          {['Dr', 'Cr', 'Bal', 'Dr', 'Cr', 'Bal', 'Dr', 'Cr', 'Cr'].map((h, i) => <th key={i} className="is-right">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {data.depositRows.map((r, i) => (
                          <tr key={i}>
                            <td className="is-muted">{i + 1}</td>
                            <td>{fmtDate(r.transDate)}</td>
                            <td className="is-muted">{r.vchrNo || '—'}</td>
                            {drCell(r.SH_Dr_Amt)}{crCell(r.SH_Cr_Amt)}{balCell(r.SH_Bal_Amt)}
                            {drCell(r.FD_Dr_Amt)}{crCell(r.FD_Cr_Amt)}{balCell(r.FD_Bal_Amt)}
                            {drCell(r.FRS_Dr_Amt)}{crCell(r.FRS_Cr_Amt)}{crCell(r.FRS_Cr_Amt1)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="aw-table">
                      <thead>
                        <tr>
                          <th rowSpan={2}>#</th><th rowSpan={2}>TrDate</th><th rowSpan={2}>Vchr no</th>
                          <th colSpan={3} className="is-center">Regular loan</th>
                          <th colSpan={3} className="is-center">Emergency loan</th>
                        </tr>
                        <tr>
                          {['Dr', 'Cr', 'Bal', 'Dr', 'Cr', 'Bal'].map((h, i) => <th key={i} className="is-right">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {data.loanRows.map((r, i) => (
                          <tr key={i}>
                            <td className="is-muted">{i + 1}</td>
                            <td>{fmtDate(r.transDate)}</td>
                            <td className="is-muted">{r.vchrNo || '—'}</td>
                            {drCell(r.RLN_Dr_Amt)}{crCell(r.RLN_Cr_Amt)}{balCell(r.RLN_Bal_Amt)}
                            {drCell(r.ALN_Dr_Amt)}{crCell(r.ALN_Cr_Amt)}{balCell(r.ALN_Bal_Amt)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <p className="aw-meta" style={{ textAlign: 'center', color: 'var(--aw-success)', fontWeight: 700 }}>All transactions have been printed</p>
          )}
        </>
      )}

      {/* Print preview: an exact render of the job sent to the passbook printer */}
      <AwDialog open={!!previewKind} title={`Print Preview — ${previewKind === 'first' ? 'First Page' : 'Passbook Details'}`} icon={<Printer size={14} />} maxWidth="56rem" onClose={() => { if (!printing) setPreviewKind(null); }}>
        {previewKind && (
          <div className="aw-stack">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <label className="aw-label" htmlFor="pbp-preset">Preset</label>
                <select id="pbp-preset" className="aw-input" value={selectedPreset} onChange={e => e.target.value && applyPreset(e.target.value)} style={{ minWidth: 200 }}>
                  <option value="">Custom</option>
                  {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              {!savingPreset ? (
                <button type="button" className="aw-btn aw-btn-secondary" onClick={() => { setNewPresetName(selectedPreset || ''); setSavingPreset(true); }}><Save size={14} /> Save as preset</button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <input
                    autoFocus
                    className="aw-input"
                    aria-label="Preset name"
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCurrentAsPreset(); if (e.key === 'Escape') setSavingPreset(false); }}
                    placeholder="Preset name"
                  />
                  <button type="button" className="aw-btn aw-btn-primary" onClick={saveCurrentAsPreset} disabled={!newPresetName.trim()}>Save</button>
                  <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setSavingPreset(false)}>Cancel</button>
                </div>
              )}
              {selectedPreset && (
                <button type="button" className="aw-btn aw-btn-ghost" onClick={deleteSelectedPreset} aria-label="Delete this preset" title="Delete this preset"><Trash2 size={14} /></button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
              {([
                { label: 'Page width (in)', key: 'widthIn', step: 0.1, min: 2 },
                { label: 'Page height (in)', key: 'heightIn', step: 0.1, min: 2 },
                { label: 'Book height (in)', key: 'bookHeightIn', step: 0.1, min: 2 },
                { label: 'Lines / page', key: 'linesPerPage', step: 1, min: 5 },
              ] as const).map(fld => (
                <div key={fld.key}>
                  <label className="aw-label" htmlFor={`pbp-${fld.key}`}>{fld.label}</label>
                  <input
                    id={`pbp-${fld.key}`}
                    className="aw-input"
                    style={{ width: 90 }}
                    type="number" step={fld.step} min={fld.min} value={pageSetup[fld.key]}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v) && v > 0) updatePageSetup({ [fld.key]: v } as Partial<PageSetup>);
                    }}
                  />
                </div>
              ))}
              <span className="aw-meta">job = {pageWMm.toFixed(1)} × {bookHMm.toFixed(1)} mm</span>
            </div>
            <iframe
              title="Passbook print preview"
              srcDoc={previewHtml}
              style={{ width: '100%', height: 420, border: 'none', borderRadius: 8, background: '#3f434a' }}
            />
            {previewPages.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setPreviewPageIndex(i => Math.max(0, i - 1))} disabled={clampedPageIndex === 0}><ChevronLeft size={14} /> Prev</button>
                <span className="aw-meta">Page {clampedPageIndex + 1} of {previewPages.length}</span>
                <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setPreviewPageIndex(i => Math.min(previewPages.length - 1, i + 1))} disabled={clampedPageIndex === previewPages.length - 1}>Next <ChevronRight size={14} /></button>
              </div>
            )}
            <p className="aw-meta">
              {previewPages.length} page{previewPages.length > 1 ? 's' : ''}, {pageSetup.linesPerPage} lines per page.
              Content prints from the top of the inserted book; the dashed line in the preview marks where the passbook page (fold) ends.
              {previewPages.length > 1 && ' Pages print one at a time — you will be asked to flip the passbook between pages.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--aw-border)', paddingTop: 12 }}>
              <div style={{ marginRight: 'auto' }}>
                <label className="aw-label" htmlFor="pbp-printer">Printer</label>
                <select
                  id="pbp-printer"
                  className="aw-input"
                  style={{ minWidth: 230 }}
                  value={printerName}
                  onChange={e => { setPrinterName(e.target.value); localStorage.setItem('passbookPrinterName', e.target.value); }}
                  disabled={printing}
                >
                  <option value="">Ask via system dialog</option>
                  {printers.map(p => <option key={p.name} value={p.name}>{p.displayName || p.name}</option>)}
                </select>
              </div>
              <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setPreviewKind(null)} disabled={printing}>Cancel</button>
              <button type="button" className="aw-btn aw-btn-primary" onClick={handleConfirmPrint} disabled={printing}>
                <Printer size={14} className={printing ? 'aw-spin' : undefined} /> Print
              </button>
            </div>
          </div>
        )}
      </AwDialog>
    </ReportShell>
  );
};

export default PassBookPrinting;
