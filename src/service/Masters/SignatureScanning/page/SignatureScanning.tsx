// page/SignatureScanning.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, message } from 'antd';
import {
  IdCard,
  RotateCcw,
  X,
  Upload as UploadIcon,
  Scan,
  ShieldCheck,
  Building2,
  CheckCircle2,
  PenTool,
  Save,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import { useSignatureScanning } from '../hook/useSignatureScanning';
import MemberField from '../../../../components/shared/kit/MemberField';
import { strokeWidth, smoothWidth, ignoreTouch, scanMessage } from '../utils/drawing';
import { base64ToBlob, scanToUploadFile } from '../utils/scanImage';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';

type SigMode = 'draw' | 'upload' | 'scan';

const SignatureScanning: React.FC = () => {
  const { t } = useTranslation();
  const {
    data,
    updateMemberNumber,
    clearSignature,
    uploadFile,
    searchMember,
  } = useSignatureScanning();

  const [sigMode, setSigMode] = useState<SigMode>('draw');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [saveNotif, setSaveNotif] = useState<{ ok: boolean; text: string } | null>(null);

  // Auto-dismiss save notification after 4 s
  useEffect(() => {
    if (!saveNotif) return;
    const t = setTimeout(() => setSaveNotif(null), 4000);
    return () => clearTimeout(t);
  }, [saveNotif]);

  // Canvas drawing — all drawing state in refs to avoid stale closures in event listeners
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const isDrawingRef    = useRef(false);
  const lastPosRef      = useRef({ x: 0, y: 0 });
  const hasDrawingRef   = useRef(false);

  // ── Canvas init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  // ── Clear canvas ───────────────────────────────────────────────────────────
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // restore stroke styles after fill
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    isDrawingRef.current  = false;
    hasDrawingRef.current = false;
    setHasDrawing(false);
  }, []);

  // Auto-clear canvas when a different member is loaded
  useEffect(() => {
    clearCanvas();
  }, [data.memberId, clearCanvas]);

  // ── Pointer events: mouse, touch and pen (graphics tablet / signature pad in tablet mode) ──
  // A pen reports pressure, so a light touch draws a thin line and a firm press a thick one.
  const lastPenRef   = useRef(0);
  const widthRef     = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const scaledPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) * (canvas.width / (r.width || 1)), y: (clientY - r.top) * (canvas.height / (r.height || 1)) };
  };

  const drawTo = (clientX: number, clientY: number, pointerType: string, pressure: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pos = scaledPoint(clientX, clientY);
    const w = smoothWidth(widthRef.current, strokeWidth(pointerType, pressure));
    widthRef.current = w;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
    if (!hasDrawingRef.current) { hasDrawingRef.current = true; setHasDrawing(true); }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') lastPenRef.current = Date.now();
    if (ignoreTouch(e.pointerType, lastPenRef.current, Date.now())) return; // a palm resting on the pad
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* not supported */ }
    pointerIdRef.current = e.pointerId;
    isDrawingRef.current = true;
    widthRef.current = null;
    lastPosRef.current = scaledPoint(e.clientX, e.clientY);
    drawTo(e.clientX, e.clientY, e.pointerType, e.pressure); // a tap leaves a dot
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || e.pointerId !== pointerIdRef.current) return;
    if (e.pointerType === 'pen') lastPenRef.current = Date.now();
    // a fast pen gives several points between two events; using all of them keeps the line smooth
    const native: any = e.nativeEvent;
    const coalesced: PointerEvent[] = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const points: PointerEvent[] = coalesced.length ? coalesced : [native];
    for (const p of points) drawTo(p.clientX, p.clientY, e.pointerType, p.pressure);
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
    isDrawingRef.current = false;
    pointerIdRef.current = null;
    widthRef.current = null;
  };

  // ── Scanner (Windows scan dialog, desktop app only) ────────────────────────
  const canScan = typeof window !== 'undefined' && typeof (window as any).electronAPI?.scanDocument === 'function';
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<{ url: string; file: File } | null>(null);
  useEffect(() => () => { if (scanPreview) URL.revokeObjectURL(scanPreview.url); }, [scanPreview]);

  const scanNow = async () => {
    if (!data.memberId || scanning) return;
    setScanning(true);
    try {
      const r = await (window as any).electronAPI.scanDocument();
      const msg = scanMessage(r);
      if (msg) { setSaveNotif({ ok: false, text: t(msg) }); return; }
      if (!r?.ok) return; // cancelled in the scan dialog
      const file = await scanToUploadFile(base64ToBlob(r.base64, r.mime));
      setScanPreview({ url: URL.createObjectURL(file), file });
    } catch (err: any) {
      setSaveNotif({ ok: false, text: err?.message ? String(err.message) : t('The scan failed. Try again.') });
    } finally {
      setScanning(false);
    }
  };

  const saveScan = async () => {
    if (!scanPreview) return;
    const ok = await uploadFile(scanPreview.file);
    setSaveNotif(ok ? { ok: true, text: 'Signature saved to database successfully' } : { ok: false, text: 'Failed to save signature — check connection and retry' });
    if (ok) setScanPreview(null);
  };

  // ── Save drawn signature ───────────────────────────────────────────────────
  const saveDrawing = useCallback(async () => {
    if (!hasDrawingRef.current) {
      message.warning(t('Please draw a signature first'));
      return;
    }
    if (!data.memberId) {
      message.warning(t('Search for a member first'));
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setSaveNotif({ ok: false, text: 'Could not capture drawing — try again' });
        return;
      }
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const ok = await uploadFile(file);
      if (ok) {
        clearCanvas();
        setSaveNotif({ ok: true, text: 'Signature saved to database successfully' });
      } else {
        setSaveNotif({ ok: false, text: 'Failed to save signature — check connection and retry' });
      }
    }, 'image/png');
  }, [uploadFile, clearCanvas, data.memberId]);

  // ── Member lookup ──────────────────────────────────────────────────────────
  // The shared lookup dialog (as in Member Master): the magnifier button, F2 or a quick double space open it, and
  // Enter in the box loads the member number that was typed.
  const handleMemberPicked = (member: { memberNo: string }) => {
    updateMemberNumber(String(member.memberNo));
    searchMember(String(member.memberNo));
  };

  const handleExit = () => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('window-close');
    }
  };

  usePageToolbarActions({
    onSave: saveDrawing,
    saveLabel: data.loading ? 'Saving…' : 'Save Signature',
    saveEnabled: !(!hasDrawing || !data.memberId || data.loading),
  });

  return (
    <div className="app-window aw-calm">

      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Signature Scanning')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scan size={12} /> {t('Terminal v3.2')}
          </p>
        </div>
        <div className="aw-actions">
          <button
            type="button"
            onClick={() => { if (window.confirm(t('Delete the saved signature of this member? This cannot be undone.'))) clearSignature(); }}
            disabled={!data.memberId}
            className="aw-btn aw-btn-danger"
            data-tip={t("Delete this member's saved signature from the database")}
            data-tip-pos="bottom-end"
          >
            <RotateCcw size={13} /> {t('Purge DB')}
          </button>
          <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost" data-tip={t('Close this window')} data-tip-pos="bottom-end">
            <X size={13} /> {t('Exit')}
          </button>
        </div>
      </div>

      {/* ── Workspace ── */}
      <div className="aw-content">
        <div className="aw-stack aw-narrow" style={{ maxWidth: 880 }}>

          {/* ── Identity ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><IdCard size={14} /></span>
              <h2 className="aw-card-title">{t('Member')}</h2>
              <span className="aw-pill tone-success" style={{ marginLeft: 'auto' }}>
                <i className="aw-status-dot" style={{ background: 'var(--aw-success)' }} />{t('Live')}
              </span>
            </div>
            <span className="aw-label">{t('Member ID / Name')}</span>
            <MemberField
              value={data.memberNumber}
              onChange={updateMemberNumber}
              onSelect={handleMemberPicked}
              onSubmit={(v) => { if (v.trim()) searchMember(v.trim()); }}
              placeholder={t('Type the member number, or press F2 / the search button')}
              ariaLabel={t('Member number')}
              disabled={data.loading}
              shortcuts
            />
            {data.memberName && (
              <p className="aw-strong aw-fade-in" style={{ marginTop: 10, color: 'var(--aw-accent)' }}>{data.memberName}</p>
            )}
            {data.loading && (
              <p className="aw-meta" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }} role="status">
                <RefreshCw size={12} className="aw-spin" /> {t('Loading…')}
              </p>
            )}
          </section>

          {/* ── Signature zone ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Scan size={14} /></span>
              <h2 className="aw-card-title">{t('Signature zone')}</h2>
              <span className="aw-meta" style={{ marginLeft: 'auto' }}>
                {data.memberId ? `ID ${data.memberId}` : t('No member selected')}
              </span>
            </div>

            <div className="aw-stack">
              {/* Mode switch */}
              <div className="aw-seg" role="tablist" style={{ maxWidth: 340, ['--seg-index' as any]: sigMode === 'draw' ? 0 : sigMode === 'upload' ? 1 : 2, ['--seg-count' as any]: canScan ? 3 : 2 }}>
                <button type="button" role="tab" aria-selected={sigMode === 'draw'} onClick={() => setSigMode('draw')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <PenTool size={13} /> {t('Draw / Sign')}
                </button>
                <button type="button" role="tab" aria-selected={sigMode === 'upload'} onClick={() => setSigMode('upload')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <UploadIcon size={13} /> {t('Upload File')}
                </button>
                {canScan && (
                  <button type="button" role="tab" aria-selected={sigMode === 'scan'} onClick={() => setSigMode('scan')}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <ScanLine size={13} /> {t('Scan')}
                  </button>
                )}
              </div>

              {/* ── Draw tab (kept mounted so a drawing survives switching tabs) ── */}
              <div className="aw-stack" style={{ display: sigMode === 'draw' ? 'flex' : 'none' }}>
                <div className="aw-canvas-wrap">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full cursor-crosshair select-none"
                    style={{ touchAction: 'none', display: 'block', height: 190 }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                  />
                  {/* Placeholder — only shown while blank */}
                  {!hasDrawing && (
                    <div className="pointer-events-none select-none" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8' }}>
                      <PenTool size={24} />
                      <span style={{ fontSize: 'var(--type-body-size)', fontWeight: 600 }}>{t('Sign here with mouse or touch')}</span>
                    </div>
                  )}
                </div>

                <div className="aw-btn-row" style={{ justifyContent: 'space-between' }}>
                  <button type="button" onClick={clearCanvas} disabled={!hasDrawing} className="aw-btn aw-btn-secondary" style={{ flex: 'none' }}>
                    <RotateCcw size={13} /> {t('Clear')}
                  </button>
                  <button type="button" onClick={saveDrawing} disabled={!hasDrawing || !data.memberId || data.loading} className="aw-btn aw-btn-primary" style={{ flex: 'none' }}>
                    {data.loading ? <RefreshCw size={13} className="aw-spin" /> : <Save size={13} />}
                    {data.loading ? t('Saving…') : t('Save Signature')}
                  </button>
                </div>
              </div>

              {/* ── Upload tab ── */}
              <div style={{ display: sigMode === 'upload' ? 'block' : 'none' }}>
                <Upload
                  name="signature"
                  showUploadList={false}
                  beforeUpload={async (file) => {
                    const ok = await uploadFile(file);
                    setSaveNotif(
                      ok
                        ? { ok: true,  text: 'Signature saved to database successfully' }
                        : { ok: false, text: 'Failed to save signature — check connection and retry' }
                    );
                    return false;
                  }}
                  accept="image/png,image/jpeg"
                  disabled={data.loading || !data.memberId}
                >
                  <div className={`aw-dropzone ${!data.memberId ? 'is-disabled' : ''}`}>
                    <UploadIcon size={26} style={{ color: 'var(--aw-accent)' }} />
                    <strong className="aw-strong">{t('Click or drag file here')}</strong>
                    <span className="aw-meta">{t('JPG / PNG · max 2 MB')}</span>
                    {!data.memberId && (
                      <span className="aw-meta" style={{ color: 'var(--aw-danger)' }}>{t('Search for a member first')}</span>
                    )}
                  </div>
                </Upload>
              </div>

              {/* ── Scan tab: the Windows scan dialog ── */}
              {canScan && (
                <div className="aw-stack" style={{ display: sigMode === 'scan' ? 'flex' : 'none' }}>
                  <p className="aw-meta">{t('Place the signed paper in the scanner and press Scan. The Windows scan window opens: choose the scanner, scan, and the picture comes back here to check before it is saved.')}</p>
                  <div className="aw-btn-row">
                    <button type="button" onClick={scanNow} disabled={!data.memberId || scanning || data.loading} className="aw-btn aw-btn-primary" style={{ flex: 'none' }}>
                      {scanning ? <RefreshCw size={13} className="aw-spin" /> : <ScanLine size={13} />}
                      {scanning ? t('Waiting for the scanner…') : t('Scan')}
                    </button>
                    {!data.memberId && <span className="aw-meta" style={{ color: 'var(--aw-danger)' }}>{t('Search for a member first')}</span>}
                  </div>
                  {scanPreview && (
                    <div className="aw-panel aw-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <img src={scanPreview.url} alt={t('Scanned signature')} style={{ maxHeight: 140, maxWidth: 320, objectFit: 'contain', background: '#ffffff', border: '1px solid var(--aw-border-strong)', borderRadius: 8, padding: 6 }} />
                      <div className="aw-btn-row" style={{ marginLeft: 'auto' }}>
                        <button type="button" onClick={() => setScanPreview(null)} className="aw-btn aw-btn-secondary" style={{ flex: 'none' }}>{t('Discard')}</button>
                        <button type="button" onClick={saveScan} disabled={data.loading} className="aw-btn aw-btn-primary" style={{ flex: 'none' }}><Save size={13} /> {t('Save this scan')}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Save result — for both Draw and Upload, dismisses itself after 4 s ── */}
              {saveNotif && (
                <div className={`aw-alert aw-fade-in ${saveNotif.ok ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status" style={{ marginBottom: 0, alignItems: 'center' }}>
                  {saveNotif.ok ? <CheckCircle2 size={16} /> : <X size={16} />}
                  <span style={{ flex: 1 }}>{saveNotif.text}</span>
                  <button type="button" onClick={() => setSaveNotif(null)} className="aw-icon-btn is-sm" aria-label={t('Dismiss')} style={{ color: 'inherit' }}>
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* ── Current saved signature ── */}
              {data.signatureData && (
                <div className="aw-panel aw-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div>
                    <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--aw-success)', fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> {t('Saved signature on record')}
                    </p>
                    <img
                      src={data.signatureData}
                      alt={t('Saved Signature')}
                      style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', background: '#ffffff', border: '1px solid var(--aw-border-strong)', borderRadius: 8, padding: 6, display: 'block' }}
                    />
                  </div>
                  <p className="aw-meta" style={{ marginLeft: 'auto', textAlign: 'right' }}>{t('Draw or upload')}<br />{t('to replace')}</p>
                </div>
              )}

              <p className="aw-meta">{t('JPG / PNG · max 2 MB')}</p>
            </div>
          </section>

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Building2 size={12} /> {t('Signature Capture')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--aw-accent)' }}><ShieldCheck size={12} /> {t('Secured')}</span>
      </div>
    </div>
  );
};

export default SignatureScanning;
