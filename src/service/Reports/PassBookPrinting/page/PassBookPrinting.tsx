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
  memberDetails: {
    memberNo: string; memberName: string; address: string; membershipDate: string; pfNo: string;
    dob?: string | null; joiningDate?: string | null; retirementDate?: string | null;
    designation?: string | null; department?: string | null; frsNo?: string | null;
    contactNo?: string | null; email?: string | null; nomineeName?: string | null;
  };
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
// Every variable below is tunable from the preview dialog (numeric fields or by
// dragging the guides) and is saved together in a preset, so a calibrated
// passbook/printer combination can be recalled in one click.
//   foldMm            — fold position measured from the printer feed edge (null = page height)
//   firstPageHalf     — which page of the open book receives the member details
//   firstPageFineMm / firstPageLeftMm — nudge of the member-details print area (down / right)
//   detail*Mm         — margins of the transaction lines on a detail page
interface PageSetup {
  widthIn: number; heightIn: number; bookHeightIn: number; linesPerPage: number;
  foldMm: number | null;
  firstPageHalf: 'top' | 'bottom' | 'full'; firstPageFineMm: number; firstPageLeftMm: number;
  photoReserveMm: number; // width kept blank at the right of the TOP page (photo is stuck there)
  detailTopMm: number; detailBottomMm: number; detailLeftMm: number; detailRightMm: number;
}
const DEFAULT_PAGE_SETUP: PageSetup = {
  widthIn: 6, heightIn: 4, bookHeightIn: 8, linesPerPage: 20,
  foldMm: null,
  firstPageHalf: 'top', firstPageFineMm: 0, firstPageLeftMm: 0, photoReserveMm: 80,
  detailTopMm: 4, detailBottomMm: 4, detailLeftMm: 2, detailRightMm: 2,
};
const PAGE_SETUP_KEY = 'passbookPageSetup';

// Named presets hold ALL of the variables above. Different passbook vendors /
// printers need different values; the user can add, overwrite or delete freely.
interface PageSetupPreset extends PageSetup { name: string; }
const DEFAULT_PRESETS: PageSetupPreset[] = [
  { ...DEFAULT_PAGE_SETUP, name: 'PLQ-35 Standard (6×4)' },
  { ...DEFAULT_PAGE_SETUP, name: 'Compact Passbook (5×3.5)', widthIn: 5, heightIn: 3.5, bookHeightIn: 7, linesPerPage: 18 },
  { ...DEFAULT_PAGE_SETUP, name: 'Wide Passbook (7×4)', widthIn: 7 },
];
const PRESETS_KEY = 'passbookPagePresets';

// Fills any missing/invalid field (old saved data) from the defaults
const normalizeSetup = (raw: Partial<PageSetup> | null | undefined): PageSetup => {
  const r = { ...DEFAULT_PAGE_SETUP, ...(raw || {}) } as PageSetup;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return {
    widthIn: r.widthIn > 0 ? r.widthIn : DEFAULT_PAGE_SETUP.widthIn,
    heightIn: r.heightIn > 0 ? r.heightIn : DEFAULT_PAGE_SETUP.heightIn,
    bookHeightIn: r.bookHeightIn > 0 ? r.bookHeightIn : DEFAULT_PAGE_SETUP.bookHeightIn,
    linesPerPage: r.linesPerPage > 0 ? r.linesPerPage : DEFAULT_PAGE_SETUP.linesPerPage,
    foldMm: typeof r.foldMm === 'number' && r.foldMm > 0 ? r.foldMm : null,
    firstPageHalf: r.firstPageHalf === 'bottom' || r.firstPageHalf === 'full' ? r.firstPageHalf : 'top',
    firstPageFineMm: num(r.firstPageFineMm, 0),
    firstPageLeftMm: num(r.firstPageLeftMm, 0),
    photoReserveMm: Math.max(0, num(r.photoReserveMm, 80)),
    detailTopMm: Math.max(0, num(r.detailTopMm, 4)),
    detailBottomMm: Math.max(0, num(r.detailBottomMm, 4)),
    detailLeftMm: Math.max(0, num(r.detailLeftMm, 2)),
    detailRightMm: Math.max(0, num(r.detailRightMm, 2)),
  };
};

const MM_TO_PX = 96 / 25.4;  // CSS px per mm at 100% preview zoom
const DETAIL_HEADER_ROWS = 2; // group row + Dr/Cr/Bal row
// Column shares of the usable width (they always fill the full page width):
// DATE column + equal amount columns
const DEPOSIT_COL_SHARE = [0.13, ...Array(9).fill(0.87 / 9)];
const LOAN_COL_SHARE = [0.13, ...Array(6).fill(0.87 / 6)];

interface PrintPageChunk { body: string; rowCount: number; maxLedgerId: number; extra?: string | undefined; }

// extraAreas: additional page-sized blocks on the same sheet (used when the member
// details span the whole open book — top page + bottom page in one job)
interface PrintDocOpts { offsetMm?: number; offsetXMm?: number; leftMm?: number; extraAreas?: Array<{ html: string; topMm: number }>; }

const buildPrintDoc = (title: string, pageBodies: string[], wMm: number, pageHMm: number, bookHMm: number, lineHMm: number, opts: PrintDocOpts = {}) => {
  const { offsetMm = 0, offsetXMm = 0, leftMm = 2, extraAreas = [] } = opts;
  const zoneTop = Math.max(0, offsetMm);
  const gridFontPt = Math.min(9.5, lineHMm * 2.835 * 0.72); // scale text with row pitch
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: ${wMm.toFixed(2)}mm ${bookHMm.toFixed(2)}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; color: #000; }
  .page { width: ${wMm.toFixed(2)}mm; height: ${bookHMm.toFixed(2)}mm; overflow: hidden; position: relative; page-break-after: always; background: #fff; }
  .page:last-child { page-break-after: auto; }
  .pagearea { width: 100%; height: ${pageHMm.toFixed(2)}mm; margin-top: ${zoneTop.toFixed(2)}mm; left: ${offsetXMm.toFixed(2)}mm; overflow: hidden; position: relative; }
  table.grid { border-collapse: collapse; table-layout: fixed; margin-left: ${leftMm}mm; font-size: ${gridFontPt.toFixed(1)}pt; }
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
  .fp-title2 { text-align: center; font-size: 11pt; font-weight: bold; letter-spacing: 2px; border-bottom: 2px solid #000; padding-bottom: 1.5mm; }
  table.fp-tbl.sm { font-size: 9pt; margin-top: 2mm; }
  .fp-tbl.sm td { padding: 0.9mm 1.5mm; font-size: 8.5pt; }
  .fp-tbl.sm td.label { width: 22%; white-space: normal; }
  .fp-boxes { margin-top: auto; display: flex; gap: 4mm; }
  .fp-box { flex: 1; text-align: center; font-size: 8pt; }
  .fp-box .sq { height: 17mm; border: 0.4mm solid #000; margin-bottom: 1mm; }
</style></head><body>${pageBodies.map(b => `<div class="page"><div class="pagearea">${b}</div>${extraAreas.map(x => `<div class="pagearea" style="position:absolute;top:${Math.max(0, x.topMm).toFixed(2)}mm;margin-top:0">${x.html}</div>`).join('')}</div>`).join('')}</body></html>`;
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
const detailPageBody = (rowsHtml: string, headerHtml: string, colsMm: number[], startLine: number, lineHMm: number, topMm: number) => {
  const skipMm = topMm + (headerHtml ? 0 : (DETAIL_HEADER_ROWS + startLine) * lineHMm);
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
  const [previewZoom, setPreviewZoom] = useState(0.75);
  const [pageSetup, setPageSetup] = useState<PageSetup>(() => {
    try {
      return normalizeSetup(JSON.parse(localStorage.getItem(PAGE_SETUP_KEY) || '{}'));
    } catch { /* fall through to defaults */ }
    return DEFAULT_PAGE_SETUP;
  });
  const [presets, setPresets] = useState<PageSetupPreset[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PRESETS_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) {
        return saved.map((p: Partial<PageSetupPreset>) => ({ ...normalizeSetup(p), name: String(p?.name ?? 'Preset') }));
      }
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
    (pageHMm - pageSetup.detailTopMm - pageSetup.detailBottomMm) / Math.max(1, pageSetup.linesPerPage + DETAIL_HEADER_ROWS));
  // Fold: where the bottom page of the open book begins, measured from the feed edge
  const foldMm = Math.min(Math.max(1, pageSetup.foldMm ?? pageHMm), Math.max(1, bookHMm - 1));

  // Where the member-details page prints: the top page starts at the feed edge,
  // the bottom page starts at the fold; fine/left are calibration nudges.
  // 'top' = top page only, 'bottom' = bottom page only, 'full' = both pages in one job
  const firstHalf = pageSetup.firstPageHalf;
  const firstPageBaseMm = firstHalf === 'bottom' ? foldMm : 0;
  const firstPageOffsetMm = Math.max(0, firstPageBaseMm + pageSetup.firstPageFineMm);
  const firstPageLeftMm = Math.max(0, pageSetup.firstPageLeftMm);
  const firstBottomAreaMm = Math.max(0, foldMm + pageSetup.firstPageFineMm); // 2nd area in 'full'

  // Options handed to the print-document builder for the given kind of print
  const docOpts = (kind: 'first' | 'details' | null, page?: PrintPageChunk): PrintDocOpts => kind === 'first'
    ? {
      offsetMm: firstPageOffsetMm, offsetXMm: firstPageLeftMm, leftMm: pageSetup.detailLeftMm,
      extraAreas: page?.extra ? [{ html: page.extra, topMm: firstBottomAreaMm }] : [],
    }
    : { leftMm: pageSetup.detailLeftMm };

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
    const next = normalizeSetup(setup);
    setPageSetup(next);
    localStorage.setItem(PAGE_SETUP_KEY, JSON.stringify(next));
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

  const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fdate = (d?: string | null) => (d ? dayjs(d).format('DD-MM-YYYY') : '');

  // TOP page of the open book: personal / service particulars + three signature boxes
  const buildFirstPageTopBody = () => {
    const m = data!.memberDetails;
    const row = (l1: string, v1: string, l2?: string, v2?: string) => l2
      ? `<tr><td class="label">${l1}</td><td>: ${esc(v1)}</td><td class="label">${l2}</td><td>: ${esc(v2)}</td></tr>`
      : `<tr><td class="label">${l1}</td><td colspan="3">: ${esc(v1)}</td></tr>`;
    // Right-hand strip stays blank: the member's photo is stuck there
    return `<div class="fp" style="padding-right:${(pageSetup.photoReserveMm + 3).toFixed(1)}mm">
  <div class="fp-title2">MEMBER PARTICULARS</div>
  <table class="fp-tbl sm">
    ${row('Date of Birth', fdate(m.dob), 'Date of Joining Service', fdate(m.joiningDate))}
    ${row('Date of Retirement', fdate(m.retirementDate), 'Designation', m.designation || '')}
    ${row('Department', m.department || '', 'FRS No.', m.frsNo || '')}
    ${row('Contact No.', m.contactNo || '', 'Email ID', m.email || '')}
    ${row('Nominee Name', m.nomineeName || '')}
    <tr><td class="label">Successor Name</td><td colspan="3">: ____________________________________</td></tr>
  </table>
  <div class="fp-boxes">
    <div class="fp-box"><div class="sq"></div>Member Signature 1</div>
    <div class="fp-box"><div class="sq"></div>Member Signature 2</div>
    <div class="fp-box"><div class="sq"></div>Member Signature 3</div>
  </div>
</div>`;
  };

  // BOTTOM page of the open book: society heading + identity block
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
    const usableW = Math.max(20, pageWMm - pageSetup.detailLeftMm - pageSetup.detailRightMm);
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
        body: detailPageBody(rowsHtml, headerHtml, colsMm, startLine, detailLineH, pageSetup.detailTopMm),
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
      ? [{
        body: firstHalf === 'bottom' ? buildFirstPageBody() : buildFirstPageTopBody(),
        extra: firstHalf === 'full' ? buildFirstPageBody() : undefined,
        rowCount: 0, maxLedgerId: 0,
      }]
      : buildDetailChunks())
    : [];
  // Shown one page at a time (Prev/Next below) rather than a long stacked
  // scroll, so each physical passbook page can be checked individually.
  const clampedPageIndex = Math.min(previewPageIndex, Math.max(0, previewPages.length - 1));
  const currentPreviewPage = previewPages[clampedPageIndex];
  const previewHtml = currentPreviewPage
    ? buildPrintDoc(previewTitle, [currentPreviewPage.body], pageWMm, pageHMm, bookHMm, detailLineH, docOpts(previewKind, currentPreviewPage))
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
      printInIframe(buildPrintDoc(previewTitle, pages.map(p => p.body), pageWMm, pageHMm, bookHMm, detailLineH, docOpts(kind, pages[0])));
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
          html: buildPrintDoc(previewTitle, [page.body], pageWMm, pageHMm, bookHMm, detailLineH, docOpts(kind, page)),
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

  // ─── Preview guides (drag & drop) ────────────────────────────────────────────
  const pxPerMm = MM_TO_PX * previewZoom;
  const mmPx = (mm: number) => mm * pxPerMm;
  const snapMm = (v: number) => Math.round(v * 2) / 2; // 0.5 mm steps

  // Starts a pointer drag; onMove receives the distance moved in millimetres
  const beginDrag = (e: React.PointerEvent, onMove: (dxMm: number, dyMm: number) => void) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const move = (ev: PointerEvent) => onMove((ev.clientX - sx) / pxPerMm, (ev.clientY - sy) / pxPerMm);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const guideTag = (bg: string, pos: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', background: bg, color: '#fff', fontSize: 10, fontWeight: 700,
    padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none', ...pos,
  });

  const hGuide = (key: string, topMm: number, color: string, label: string, onDown: (e: React.PointerEvent) => void, dashed = true) => (
    <div key={key} onPointerDown={onDown} title={label}
      style={{ position: 'absolute', left: 0, right: 0, top: mmPx(topMm) - 6, height: 12, cursor: 'ns-resize', touchAction: 'none', zIndex: 2 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 5, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
      <span style={guideTag(color, { left: 4, top: -9 })}>{label}</span>
    </div>
  );

  const vGuide = (key: string, leftMm: number, color: string, label: string, onDown: (e: React.PointerEvent) => void, dashed = true) => (
    <div key={key} onPointerDown={onDown} title={label}
      style={{ position: 'absolute', top: 0, bottom: 0, left: mmPx(leftMm) - 6, width: 12, cursor: 'ew-resize', touchAction: 'none', zIndex: 2 }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 5, borderLeft: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
      <span style={guideTag(color, { left: 8, top: 20 + (key === 'mr' ? 18 : 0) })}>{label}</span>
    </div>
  );

  const numField = (id: string, label: string, value: number, onChange: (v: number) => void, step: number) => (
    <div key={id}>
      <label className="aw-label" htmlFor={`pbp-${id}`}>{label}</label>
      <input
        id={`pbp-${id}`}
        className="aw-input"
        style={{ width: '100%' }}
        type="number" step={step} value={Number(value.toFixed(2))}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  const activeTracking = passbookType === 'D' ? depositTracking : loanTracking;
  const kindLabel = passbookType === 'D' ? 'deposit' : 'loan';
  const drCell = (v: number) => <td className="is-right" style={{ color: 'var(--aw-danger)' }}>{v > 0 && <CrDrIndicator type="debit" className="mr-1" />}{fmt(v)}</td>;
  const crCell = (v: number) => <td className="is-right is-success">{v > 0 && <CrDrIndicator type="credit" className="mr-1" />}{fmt(v)}</td>;
  const balCell = (v: number) => <td className="is-right is-accent">{fmt(v)}</td>;

  return (
    <ReportShell
      className="pbp-page aw-calm"
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
            <p className="aw-meta" style={{ textAlign: 'center', color: 'var(--aw-success)', fontWeight: 600 }}>All transactions have been printed</p>
          )}
        </>
      )}

      {/* Print preview: an exact render of the job sent to the passbook printer */}
      <AwDialog open={!!previewKind} title={`Print Preview — ${previewKind === 'first' ? 'First Page' : 'Passbook Details'}`} icon={<Printer size={14} />} maxWidth="68rem" onClose={() => { if (!printing) setPreviewKind(null); }}>
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
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
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
            <p className="aw-meta">
              Drag the coloured guides in the preview — fold line, green print area, margins, page width and book height — or type exact values on the right.
              Everything is saved automatically and stored in a preset when you press “Save as preset”.
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 auto', maxWidth: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <label className="aw-label" htmlFor="pbp-zoom" style={{ margin: 0 }}>Zoom</label>
                  <select id="pbp-zoom" className="aw-input" style={{ width: 90 }} value={previewZoom} onChange={e => setPreviewZoom(parseFloat(e.target.value))}>
                    {[0.5, 0.75, 1, 1.25].map(z => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
                  </select>
                  <span className="aw-meta">job = {pageWMm.toFixed(1)} × {bookHMm.toFixed(1)} mm</span>
                </div>
                <div style={{ background: '#3f434a', borderRadius: 8, padding: 14, maxHeight: 540, maxWidth: '100%', overflow: 'auto' }}>
                  <div style={{ position: 'relative', width: mmPx(pageWMm), height: mmPx(bookHMm), margin: '0 auto', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.5)', userSelect: 'none' }}>
                    <iframe
                      title="Passbook print preview"
                      srcDoc={previewHtml}
                      scrolling="no"
                      style={{ position: 'absolute', left: 0, top: 0, width: pageWMm * MM_TO_PX, height: bookHMm * MM_TO_PX, border: 'none', transform: `scale(${previewZoom})`, transformOrigin: '0 0', pointerEvents: 'none' }}
                    />
                    {/* the two pages of the open book, split at the fold */}
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: mmPx(foldMm), background: 'repeating-linear-gradient(135deg, rgba(0,0,0,.03) 0 12px, rgba(0,0,0,.08) 12px 24px)', pointerEvents: 'none' }}>
                      <span style={guideTag('#64748b', { right: 4, bottom: 4 })}>TOP PAGE OF BOOK</span>
                    </div>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: mmPx(foldMm), height: mmPx(Math.max(0, bookHMm - foldMm)), background: 'repeating-linear-gradient(135deg, rgba(0,0,0,.03) 0 12px, rgba(0,0,0,.08) 12px 24px)', pointerEvents: 'none' }}>
                      <span style={guideTag('#64748b', { right: 4, bottom: 4 })}>BOTTOM PAGE OF BOOK</span>
                    </div>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, background: '#1e293b', color: '#fff', fontSize: 10, fontWeight: 700, textAlign: 'center', padding: '2px 0', pointerEvents: 'none' }}>▲ PRINTER FEED EDGE (book enters here)</div>

                    {/* print area — drag to move (member-details page); bottom handle resizes */}
                    <div
                      onPointerDown={previewKind === 'first' ? (e => {
                        const fine0 = pageSetup.firstPageFineMm, left0 = pageSetup.firstPageLeftMm;
                        beginDrag(e, (dx, dy) => updatePageSetup({
                          firstPageFineMm: snapMm(Math.max(-firstPageBaseMm, fine0 + dy)),
                          firstPageLeftMm: snapMm(Math.max(0, left0 + dx)),
                        }));
                      }) : undefined}
                      style={{
                        position: 'absolute', left: mmPx(previewKind === 'first' ? firstPageLeftMm : 0), top: mmPx(previewKind === 'first' ? firstPageOffsetMm : 0),
                        width: mmPx(pageWMm - (previewKind === 'first' ? firstPageLeftMm : 0)), height: mmPx(pageHMm),
                        border: '2px solid #16a34a', background: 'rgba(22,163,74,.07)', boxSizing: 'border-box',
                        cursor: previewKind === 'first' ? 'move' : 'default', touchAction: 'none',
                      }}
                    >
                      <span style={guideTag('#16a34a', { right: 4, top: 4 })}>PRINT AREA{previewKind === 'first' ? ' — drag to move' : ''}</span>
                    </div>

                    {/* photo strip kept blank at the right of the top page */}
                    {previewKind === 'first' && firstHalf !== 'bottom' && pageSetup.photoReserveMm > 0 && (
                      <div style={{
                        position: 'absolute', top: mmPx(firstPageOffsetMm), height: mmPx(pageHMm),
                        left: mmPx(Math.max(0, pageWMm - pageSetup.photoReserveMm)), width: mmPx(Math.min(pageWMm, pageSetup.photoReserveMm)),
                        background: 'repeating-linear-gradient(45deg, rgba(234,88,12,.10) 0 8px, rgba(234,88,12,.20) 8px 16px)',
                        border: '2px dashed #ea580c', boxSizing: 'border-box', pointerEvents: 'none',
                      }}>
                        <span style={guideTag('#ea580c', { left: 4, bottom: 4 })}>PHOTO AREA — kept blank</span>
                      </div>
                    )}

                    {/* complete book: second print area on the bottom page */}
                    {previewKind === 'first' && firstHalf === 'full' && (
                      <div style={{
                        position: 'absolute', left: mmPx(firstPageLeftMm), top: mmPx(firstBottomAreaMm),
                        width: mmPx(pageWMm - firstPageLeftMm), height: mmPx(pageHMm),
                        border: '2px solid #16a34a', background: 'rgba(22,163,74,.07)', boxSizing: 'border-box', pointerEvents: 'none',
                      }}>
                        <span style={guideTag('#16a34a', { right: 4, top: 4 })}>PRINT AREA — bottom page</span>
                      </div>
                    )}

                    {/* detail margins (transaction lines) */}
                    {previewKind === 'details' && <>
                      {hGuide('mt', pageSetup.detailTopMm, '#2563eb', 'FIRST LINE', e => {
                        const v0 = pageSetup.detailTopMm;
                        beginDrag(e, (_dx, dy) => updatePageSetup({ detailTopMm: snapMm(Math.max(0, v0 + dy)) }));
                      })}
                      {hGuide('mb', pageHMm - pageSetup.detailBottomMm, '#2563eb', 'LAST LINE', e => {
                        const v0 = pageSetup.detailBottomMm;
                        beginDrag(e, (_dx, dy) => updatePageSetup({ detailBottomMm: snapMm(Math.max(0, v0 - dy)) }));
                      })}
                      {vGuide('ml', pageSetup.detailLeftMm, '#2563eb', 'LEFT', e => {
                        const v0 = pageSetup.detailLeftMm;
                        beginDrag(e, (dx) => updatePageSetup({ detailLeftMm: snapMm(Math.max(0, v0 + dx)) }));
                      })}
                      {vGuide('mr', pageWMm - pageSetup.detailRightMm, '#2563eb', 'RIGHT', e => {
                        const v0 = pageSetup.detailRightMm;
                        beginDrag(e, (dx) => updatePageSetup({ detailRightMm: snapMm(Math.max(0, v0 - dx)) }));
                      })}
                    </>}

                    {/* print-area height */}
                    {hGuide('ph', (previewKind === 'first' ? firstPageOffsetMm : 0) + pageHMm, '#16a34a', 'PAGE HEIGHT', e => {
                      const h0 = pageHMm, fold0 = foldMm;
                      beginDrag(e, (_dx, dy) => updatePageSetup({ heightIn: Math.max(2, Math.round((h0 + dy) / 25.4 * 100) / 100), foldMm: fold0 }));
                    }, false)}
                    {/* fold */}
                    {hGuide('fold', foldMm, '#dc2626', 'FOLD — drag', e => {
                      const f0 = foldMm;
                      beginDrag(e, (_dx, dy) => updatePageSetup({ foldMm: Math.min(Math.max(10, snapMm(f0 + dy)), bookHMm - 5) }));
                    })}
                    {/* job width / book height */}
                    {vGuide('w', pageWMm - 1, '#7c3aed', 'WIDTH', e => {
                      const w0 = pageWMm;
                      beginDrag(e, (dx) => updatePageSetup({ widthIn: Math.max(2, Math.round((w0 + dx) / 25.4 * 100) / 100) }));
                    }, false)}
                    {hGuide('bh', bookHMm - 1, '#7c3aed', 'BOOK HEIGHT', e => {
                      const b0 = bookHMm;
                      beginDrag(e, (_dx, dy) => updatePageSetup({ bookHeightIn: Math.max(2, Math.round((b0 + dy) / 25.4 * 100) / 100) }));
                    }, false)}
                  </div>
                </div>
              </div>

              <div style={{ flex: '1 1 250px', minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <fieldset style={{ border: '1px solid var(--aw-border)', borderRadius: 8, padding: 10 }}>
                  <legend className="aw-label" style={{ padding: '0 6px' }}>Page &amp; book</legend>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {numField('widthIn', 'Page width (in)', pageSetup.widthIn, v => v > 0 && updatePageSetup({ widthIn: v }), 0.05)}
                    {numField('heightIn', 'Page height (in)', pageSetup.heightIn, v => v > 0 && updatePageSetup({ heightIn: v }), 0.05)}
                    {numField('bookHeightIn', 'Book height (in)', pageSetup.bookHeightIn, v => v > 0 && updatePageSetup({ bookHeightIn: v }), 0.05)}
                    {numField('linesPerPage', 'Lines / page', pageSetup.linesPerPage, v => v >= 1 && updatePageSetup({ linesPerPage: Math.round(v) }), 1)}
                    {numField('foldMm', 'Fold from feed edge (mm)', foldMm, v => v > 0 && updatePageSetup({ foldMm: v }), 0.5)}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="button" className="aw-btn aw-btn-ghost" onClick={() => updatePageSetup({ foldMm: null })} disabled={pageSetup.foldMm === null} title="Fold follows the page height">Fold: auto</button>
                    </div>
                  </div>
                </fieldset>

                {previewKind === 'first' ? (
                  <fieldset style={{ border: '1px solid var(--aw-border)', borderRadius: 8, padding: 10 }}>
                    <legend className="aw-label" style={{ padding: '0 6px' }}>Member details (first page)</legend>
                    <span className="aw-label">Prints on</span>
                    <p className="aw-meta" style={{ margin: '2px 0 6px' }}>
                      Top page = particulars + 3 signature boxes · Bottom page = society heading + member identity · Complete book = both in one print.
                    </p>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      {([['top', 'Top page'], ['bottom', 'Bottom page'], ['full', 'Complete book']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          className={`aw-btn ${pageSetup.firstPageHalf === val ? 'aw-btn-primary' : 'aw-btn-secondary'}`}
                          onClick={() => updatePageSetup({ firstPageHalf: val })}
                          aria-pressed={pageSetup.firstPageHalf === val}
                        >{label}</button>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {numField('firstPageFineMm', 'Nudge down (mm)', pageSetup.firstPageFineMm, v => updatePageSetup({ firstPageFineMm: v }), 0.5)}
                      {numField('firstPageLeftMm', 'Nudge right (mm)', pageSetup.firstPageLeftMm, v => v >= 0 && updatePageSetup({ firstPageLeftMm: v }), 0.5)}
                      {numField('photoReserveMm', 'Photo area at top-right (mm)', pageSetup.photoReserveMm, v => v >= 0 && updatePageSetup({ photoReserveMm: v }), 1)}
                    </div>
                  </fieldset>
                ) : (
                  <fieldset style={{ border: '1px solid var(--aw-border)', borderRadius: 8, padding: 10 }}>
                    <legend className="aw-label" style={{ padding: '0 6px' }}>Transaction lines (detail pages)</legend>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {numField('detailTopMm', 'First line from top (mm)', pageSetup.detailTopMm, v => v >= 0 && updatePageSetup({ detailTopMm: v }), 0.5)}
                      {numField('detailBottomMm', 'Bottom margin (mm)', pageSetup.detailBottomMm, v => v >= 0 && updatePageSetup({ detailBottomMm: v }), 0.5)}
                      {numField('detailLeftMm', 'Left margin (mm)', pageSetup.detailLeftMm, v => v >= 0 && updatePageSetup({ detailLeftMm: v }), 0.5)}
                      {numField('detailRightMm', 'Right margin (mm)', pageSetup.detailRightMm, v => v >= 0 && updatePageSetup({ detailRightMm: v }), 0.5)}
                    </div>
                    <p className="aw-meta" style={{ marginTop: 6 }}>Line pitch: {detailLineH.toFixed(2)} mm</p>
                  </fieldset>
                )}

                <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setPageSetup(DEFAULT_PAGE_SETUP); localStorage.setItem(PAGE_SETUP_KEY, JSON.stringify(DEFAULT_PAGE_SETUP)); setSelectedPreset(''); }}>
                  <RotateCcw size={14} /> Reset all to defaults
                </button>
              </div>
            </div>
            {previewPages.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setPreviewPageIndex(i => Math.max(0, i - 1))} disabled={clampedPageIndex === 0}><ChevronLeft size={14} /> Prev</button>
                <span className="aw-meta">Page {clampedPageIndex + 1} of {previewPages.length}</span>
                <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setPreviewPageIndex(i => Math.min(previewPages.length - 1, i + 1))} disabled={clampedPageIndex === previewPages.length - 1}>Next <ChevronRight size={14} /></button>
              </div>
            )}
            <p className="aw-meta">
              {previewPages.length} page{previewPages.length > 1 ? 's' : ''}, {pageSetup.linesPerPage} lines per page.
              The preview shows the whole open book as inserted: the green box is the print area, the red dashed line is the fold, and the dark bar is the edge that enters the printer first.
              Detail pages print from the top page of the book.
              {previewPages.length > 1 && ' Pages print one at a time — you will be asked to flip the passbook between pages.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--aw-border)', paddingTop: 12 }}>
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
