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
} from 'lucide-react';
import { useSignatureScanning } from '../hook/useSignatureScanning';
import MemberLookupInput from '../../../../components/shared/MemberLookup/MemberLookupInput';
import type { MemberLookupData } from '../../../../components/shared/MemberLookup/MemberLookupInput';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

type SigMode = 'draw' | 'upload';

const SignatureScanning: React.FC = () => {
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

  // ── Canvas init + non-passive touch listeners (must be imperative) ─────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initCtx = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
    };
    initCtx();

    // Scale raw clientX/Y to canvas internal resolution
    const scaled = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (clientX - r.left) * (canvas.width  / r.width),
        y: (clientY - r.top)  * (canvas.height / r.height),
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // must be non-passive to work
      const t = e.touches[0];
      if (!t) return;
      const p = scaled(t.clientX, t.clientY);
      isDrawingRef.current  = true;
      lastPosRef.current    = p;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      const p = scaled(t.clientX, t.clientY);
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastPosRef.current = p;
      if (!hasDrawingRef.current) { hasDrawingRef.current = true; setHasDrawing(true); }
    };

    const onTouchEnd = () => { isDrawingRef.current = false; };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
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

  // ── Mouse events (React synthetic — no passive constraint) ─────────────────
  const scaledMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width  / r.width),
      y: (e.clientY - r.top)  * (canvas.height / r.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    lastPosRef.current   = scaledMouse(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const pos    = scaledMouse(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
    if (!hasDrawingRef.current) { hasDrawingRef.current = true; setHasDrawing(true); }
  };

  const stopDrawing = () => { isDrawingRef.current = false; };

  // ── Save drawn signature ───────────────────────────────────────────────────
  const saveDrawing = useCallback(async () => {
    if (!hasDrawingRef.current) {
      message.warning('Please draw a signature first');
      return;
    }
    if (!data.memberId) {
      message.warning('Search for a member first');
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

  // ── Member lookup handler ──────────────────────────────────────────────────
  // Called by MemberLookupInput: memberData is set only when a dropdown item is clicked
  const handleMemberSelect = (memberNo: string, memberData?: MemberLookupData) => {
    updateMemberNumber(memberNo);
    if (memberData) {
      // Dropdown selection — fetch full details (incl. signature_image_path)
      searchMember(memberNo);
    }
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
    <div className="app-window">

      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Signature Scanning</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Scan size={12} /> Terminal v3.2
          </p>
        </div>
        <div className="aw-actions">
          <button
            type="button"
            onClick={clearSignature}
            disabled={!data.memberId}
            className="aw-btn aw-btn-danger"
            data-tip="Delete this member's saved signature from the database"
            data-tip-pos="bottom-end"
          >
            <RotateCcw size={13} /> Purge DB
          </button>
          <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost" data-tip="Close this window" data-tip-pos="bottom-end">
            <X size={13} /> Exit
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
              <h2 className="aw-card-title">Member</h2>
              <span className="aw-pill tone-success" style={{ marginLeft: 'auto' }}>
                <i className="aw-status-dot" style={{ background: 'var(--aw-success)' }} />Live
              </span>
            </div>
            <span className="aw-label">Member ID / Name</span>
            <MemberLookupInput
              variant="kit"
              value={data.memberNumber}
              onChange={handleMemberSelect}
              placeholder="Type name, number (or double-space for all)"
              disabled={data.loading}
              showLookupButton={true}
              autoSearch={true}
            />
            {data.memberName && (
              <p className="aw-strong aw-fade-in" style={{ marginTop: 10, color: 'var(--aw-accent)' }}>{data.memberName}</p>
            )}
            {data.loading && (
              <p className="aw-meta" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }} role="status">
                <RefreshCw size={12} className="aw-spin" /> Loading…
              </p>
            )}
          </section>

          {/* ── Signature zone ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Scan size={14} /></span>
              <h2 className="aw-card-title">Signature Zone</h2>
              <span className="aw-meta" style={{ marginLeft: 'auto' }}>
                {data.memberId ? `ID ${data.memberId}` : 'No member selected'}
              </span>
            </div>

            <div className="aw-stack">
              {/* Mode switch */}
              <div className="aw-seg" role="tablist" style={{ maxWidth: 340, ['--seg-index' as any]: sigMode === 'draw' ? 0 : 1, ['--seg-count' as any]: 2 }}>
                <button type="button" role="tab" aria-selected={sigMode === 'draw'} onClick={() => setSigMode('draw')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <PenTool size={13} /> Draw / Sign
                </button>
                <button type="button" role="tab" aria-selected={sigMode === 'upload'} onClick={() => setSigMode('upload')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <UploadIcon size={13} /> Upload File
                </button>
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
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  {/* Placeholder — only shown while blank */}
                  {!hasDrawing && (
                    <div className="pointer-events-none select-none" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#94a3b8' }}>
                      <PenTool size={24} />
                      <span style={{ fontSize: 'var(--type-body-size)', fontWeight: 600 }}>Sign here with mouse or touch</span>
                    </div>
                  )}
                </div>

                <div className="aw-btn-row" style={{ justifyContent: 'space-between' }}>
                  <button type="button" onClick={clearCanvas} disabled={!hasDrawing} className="aw-btn aw-btn-secondary" style={{ flex: 'none' }}>
                    <RotateCcw size={13} /> Clear
                  </button>
                  <button type="button" onClick={saveDrawing} disabled={!hasDrawing || !data.memberId || data.loading} className="aw-btn aw-btn-primary" style={{ flex: 'none' }}>
                    {data.loading ? <RefreshCw size={13} className="aw-spin" /> : <Save size={13} />}
                    {data.loading ? 'Saving…' : 'Save Signature'}
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
                    <strong className="aw-strong">Click or drag file here</strong>
                    <span className="aw-meta">JPG / PNG · max 2 MB</span>
                    {!data.memberId && (
                      <span className="aw-meta" style={{ color: 'var(--aw-danger)' }}>Search for a member first</span>
                    )}
                  </div>
                </Upload>
              </div>

              {/* ── Save result — for both Draw and Upload, dismisses itself after 4 s ── */}
              {saveNotif && (
                <div className={`aw-alert aw-fade-in ${saveNotif.ok ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status" style={{ marginBottom: 0, alignItems: 'center' }}>
                  {saveNotif.ok ? <CheckCircle2 size={16} /> : <X size={16} />}
                  <span style={{ flex: 1 }}>{saveNotif.text}</span>
                  <button type="button" onClick={() => setSaveNotif(null)} className="aw-icon-btn is-sm" aria-label="Dismiss" style={{ color: 'inherit' }}>
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* ── Current saved signature ── */}
              {data.signatureData && (
                <div className="aw-panel aw-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div>
                    <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--aw-success)', textTransform: 'uppercase', fontWeight: 700 }}>
                      <CheckCircle2 size={12} /> Saved signature on record
                    </p>
                    <img
                      src={data.signatureData}
                      alt="Saved Signature"
                      style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', background: '#ffffff', border: '1px solid var(--aw-border-strong)', borderRadius: 8, padding: 6, display: 'block' }}
                    />
                  </div>
                  <p className="aw-meta" style={{ marginLeft: 'auto', textAlign: 'right' }}>Draw or upload<br />to replace</p>
                </div>
              )}

              <p className="aw-meta">JPG / PNG · max 2 MB</p>
            </div>
          </section>

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Building2 size={12} /> Signature Capture</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--aw-accent)' }}><ShieldCheck size={12} /> Secured</span>
      </div>
    </div>
  );
};

export default SignatureScanning;
