// page/SignatureScanning.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConfigProvider, Upload, message } from 'antd';
import {
  Fingerprint,
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
      const p = scaled(e.touches[0].clientX, e.touches[0].clientY);
      isDrawingRef.current  = true;
      lastPosRef.current    = p;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const p = scaled(e.touches[0].clientX, e.touches[0].clientY);
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
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 8 } }}>
      <div className="sig-scan h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-100 overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-2 py-1 flex items-center justify-between z-10 shrink-0 shadow-lg border-b-2 border-indigo-600">
          <div className="flex items-center gap-1.5">
            <div className="bg-indigo-600 p-1 rounded border border-indigo-400">
              <Fingerprint size={12} className="text-white" />
            </div>
            <div>
              <h1 className="fz-tiny font-black text-white tracking-wide leading-none uppercase">
                Signature Scanning
              </h1>
              <div className="flex items-center gap-1 mt-0.5 fz-nano font-black text-indigo-300 uppercase tracking-wider leading-none">
                <Scan size={7} className="text-indigo-400" /> Terminal v3.2
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearSignature}
              disabled={!data.memberId}
              className="h-5 px-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white rounded fz-micro font-black transition-all flex items-center gap-1 active:scale-95 uppercase tracking-wide border border-white/20"
              title="Delete saved signature from DB"
            >
              <RotateCcw size={10} /> Purge DB
            </button>
            <div className="h-3 w-px bg-slate-700" />
            <button
              onClick={handleExit}
              className="h-5 px-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded fz-micro font-black transition-all flex items-center gap-1 active:scale-95 uppercase tracking-wide border border-rose-500/30"
            >
              <X size={10} /> Exit
            </button>
          </div>
        </div>

        {/* ── Workspace ── */}
        <div className="flex-1 overflow-auto p-1.5 bg-slate-50">
          <div className="max-w-4xl mx-auto space-y-1.5">

            {/* ── Identity strip ── */}
            <div className="bg-white border-2 border-slate-300 rounded shadow-sm flex overflow-visible">
              {/* Icon pillar */}
              <div className="w-12 shrink-0 bg-gradient-to-br from-slate-900 to-indigo-900 flex flex-col justify-center items-center py-3 gap-1">
                <div className="bg-indigo-500/20 p-1.5 rounded border border-indigo-400/30 text-indigo-300">
                  <IdCard size={14} />
                </div>
                <div className="flex items-center gap-0.5 text-emerald-400 text-[5px] font-black uppercase tracking-wide">
                  <CheckCircle2 size={6} /> Live
                </div>
              </div>

              {/* Lookup field */}
              <div className="flex-1 p-2 overflow-visible">
                <label className="block fz-label font-black text-slate-500 uppercase tracking-wide mb-1">
                  Member ID / Name
                </label>
                {/* MemberLookupInput — same control used in Member Master */}
                <MemberLookupInput
                  value={data.memberNumber}
                  onChange={handleMemberSelect}
                  placeholder="Type name, number (or double-space for all)"
                  disabled={data.loading}
                  showLookupButton={true}
                  autoSearch={true}
                />
                {data.memberName && (
                  <p className="mt-1 fz-body font-black text-indigo-700 truncate">
                    {data.memberName}
                  </p>
                )}
                {data.loading && (
                  <p className="mt-0.5 fz-micro text-slate-400 font-bold">Loading…</p>
                )}
              </div>
            </div>

            {/* ── Signature zone ── */}
            <div className="bg-white border-2 border-indigo-400 rounded shadow-sm overflow-visible">

              {/* Zone header */}
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-2 py-1 border-b-2 border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Scan size={11} className="text-indigo-700" />
                  <span className="fz-micro font-black text-indigo-900 uppercase tracking-wide">
                    Signature Zone
                  </span>
                </div>
                <div className="px-1.5 py-0.5 bg-indigo-600 text-white rounded fz-nano font-black uppercase border border-indigo-500">
                  Active
                </div>
              </div>

              {/* ── Tab bar ── */}
              <div className="flex border-b-2 border-indigo-100 bg-slate-50">
                <button
                  onClick={() => setSigMode('draw')}
                  className={`flex items-center gap-1 px-4 py-1.5 fz-micro font-black uppercase tracking-wide border-b-2 transition-all ${
                    sigMode === 'draw'
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/50'
                  }`}
                >
                  <PenTool size={9} /> Draw / Sign
                </button>
                <button
                  onClick={() => setSigMode('upload')}
                  className={`flex items-center gap-1 px-4 py-1.5 fz-micro font-black uppercase tracking-wide border-b-2 transition-all ${
                    sigMode === 'upload'
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/50'
                  }`}
                >
                  <UploadIcon size={9} /> Upload File
                </button>
              </div>

              {/* ── Draw tab ── */}
              <div className={sigMode === 'draw' ? 'block' : 'hidden'}>
                {/* Canvas */}
                <div className="relative bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full cursor-crosshair border-b border-indigo-100 select-none"
                    style={{ touchAction: 'none', display: 'block', height: 180 }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  {/* Placeholder overlay — only shown when blank */}
                  {!hasDrawing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                      <PenTool size={22} className="text-indigo-200 mb-1" />
                      <span className="fz-micro font-black text-slate-300 uppercase tracking-widest">
                        Sign here with mouse or touch
                      </span>
                    </div>
                  )}
                </div>

                {/* Draw controls */}
                <div className="px-2 py-1.5 bg-slate-50 flex items-center justify-between border-t border-slate-200">
                  <button
                    onClick={clearCanvas}
                    disabled={!hasDrawing}
                    className="h-6 px-2.5 bg-white hover:bg-slate-100 disabled:opacity-30 rounded border-2 border-slate-300 fz-micro font-black text-slate-600 flex items-center gap-1 uppercase tracking-wide transition-all"
                  >
                    <RotateCcw size={8} /> Clear
                  </button>
                  <button
                    onClick={saveDrawing}
                    disabled={!hasDrawing || !data.memberId || data.loading}
                    className="h-6 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded fz-micro font-black flex items-center gap-1.5 uppercase tracking-wide transition-all shadow-sm"
                  >
                    <Save size={8} />
                    {data.loading ? 'Saving…' : 'Save Signature'}
                  </button>
                </div>

              </div>

              {/* ── Upload tab ── */}
              <div className={`p-3 ${sigMode === 'upload' ? 'block' : 'hidden'}`}>
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
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 transition-all ${
                      data.memberId
                        ? 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/40 cursor-pointer'
                        : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <UploadIcon size={24} className="text-indigo-300" />
                    <p className="fz-mini font-black text-indigo-900 uppercase tracking-wide">
                      Click or drag file here
                    </p>
                    <p className="fz-micro text-slate-500">JPG / PNG · max 2 MB</p>
                    {!data.memberId && (
                      <p className="fz-micro text-rose-500 font-black mt-1">
                        Search for a member first
                      </p>
                    )}
                  </div>
                </Upload>
              </div>

              {/* ── Save result toast — appears for both Draw and Upload, auto-dismisses 4 s ── */}
              {saveNotif && (
                <div
                  className={`mx-2 mt-1 mb-1 px-3 py-2 rounded-lg flex items-center justify-between gap-2 border-2 fz-micro font-black uppercase tracking-wide shadow-sm ${
                    saveNotif.ok
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-rose-50 border-rose-400 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {saveNotif.ok
                      ? <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      : <X         size={13} className="text-rose-600   shrink-0" />}
                    <span>{saveNotif.text}</span>
                  </div>
                  <button
                    onClick={() => setSaveNotif(null)}
                    className="opacity-40 hover:opacity-100 transition-opacity shrink-0"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              {/* ── Current saved signature preview ── */}
              {data.signatureData && (
                <div className="border-t-2 border-indigo-100 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-3">
                  <div>
                    <p className="fz-nano font-black text-emerald-700 uppercase tracking-wide flex items-center gap-0.5 mb-1">
                      <CheckCircle2 size={7} /> Saved Signature on Record
                    </p>
                    <img
                      src={data.signatureData}
                      alt="Saved Signature"
                      className="max-h-[72px] max-w-[220px] object-contain bg-white border-2 border-emerald-200 rounded p-1 shadow-sm"
                    />
                  </div>
                  <p className="fz-micro text-emerald-600 font-black uppercase tracking-wide leading-tight ml-auto">
                    Draw or upload<br />to replace
                  </p>
                </div>
              )}

              {/* Zone footer */}
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50 px-2 py-1 flex items-center justify-between border-t border-indigo-100">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-indigo-600 font-black fz-nano uppercase tracking-wide">
                    <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" /> Live
                  </div>
                  {data.memberId && (
                    <span className="fz-nano font-black text-slate-400 uppercase tracking-wide">ID {data.memberId}</span>
                  )}
                </div>
                <p className="fz-nano text-indigo-400 font-black tracking-wide uppercase">JPG / PNG · max 2 MB</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-2 py-0.5 bg-white border-t-2 border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <Building2 size={8} className="text-slate-400" />
            <span className="fz-micro font-black text-slate-500 uppercase tracking-wide">
              Signature Capture
            </span>
          </div>
          <ShieldCheck size={10} className="text-indigo-500" />
        </div>
      </div>

      <style>{`
        .ant-input {
          box-shadow: inset 0 1px 2px 0 rgba(0,0,0,0.05) !important;
          font-weight: 900 !important;
        }
        .ant-input:focus {
          box-shadow: 0 0 0 2px rgba(99,102,241,0.1) !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }

        /* ── Dark mode (page uses hardcoded light tints the global layer can't reach) ── */
        /* Neutralise the LIGHT gradient tints only — the dark slate header keeps its gradient. */
        html.dark .sig-scan .from-indigo-50,
        html.dark .sig-scan .from-emerald-50,
        html.dark .sig-scan .from-slate-50 { background-image: none !important; background-color: #1e293b !important; }
        html.dark .sig-scan .text-indigo-900,
        html.dark .sig-scan .text-emerald-700,
        html.dark .sig-scan .text-emerald-800 { color: #e2e8f0 !important; }
        html.dark .sig-scan .text-indigo-700,
        html.dark .sig-scan .text-indigo-600,
        html.dark .sig-scan .text-emerald-600 { color: #a5b4fc !important; }
        html.dark .sig-scan .text-slate-500,
        html.dark .sig-scan .text-slate-400,
        html.dark .sig-scan .text-slate-300 { color: #94a3b8 !important; }
        html.dark .sig-scan .border-slate-200,
        html.dark .sig-scan .border-slate-300,
        html.dark .sig-scan .border-indigo-100,
        html.dark .sig-scan .border-indigo-200 { border-color: #334155 !important; }
        /* The canvas + saved-signature image intentionally stay white — you sign in dark ink on white. */
      `}</style>
    </ConfigProvider>
  );
};

export default SignatureScanning;
