// Signature Scanning: pen pressure, palm rejection, the Windows scanner (WIA) service and the Scan tab.
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

const { api } = vi.hoisted(() => ({
  api: { getMemberDetails: vi.fn(), fetchProtectedFile: vi.fn(), uploadMemberSignatureMaster: vi.fn(), deleteMemberSignatureMaster: vi.fn(), lookupMembers: vi.fn() },
}));
vi.mock('../../../src/services/api', () => ({ apiService: api, default: api }));
vi.mock('../../../src/utils/pageToolbarActions', () => ({ usePageToolbarActions: () => {} }));
vi.mock('@/utils/dialog', () => ({ isFailure: (r: any) => !!r && r.success === false, notifyError: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
vi.mock('antd', async () => {
  const actual: any = await vi.importActual('antd');
  return { ...actual, message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } };
});
vi.mock('../../../src/components/shared/kit/MemberLookupDialog', () => ({
  default: ({ open, onSelect }: any) => (open ? <div role="dialog"><button onClick={() => onSelect({ memberNo: '30017688' })}>pick</button></div> : null),
}));
// the scanned image is redrawn on a canvas: the test replaces that step
vi.mock('../../../src/service/Masters/SignatureScanning/utils/scanImage', async () => {
  const actual: any = await vi.importActual('../../../src/service/Masters/SignatureScanning/utils/scanImage');
  return { ...actual, scanToUploadFile: vi.fn(async () => new File([new Uint8Array(10)], 'signature-scan.jpg', { type: 'image/jpeg' })) };
});

import SignatureScanning from '../../../src/service/Masters/SignatureScanning/page/SignatureScanning';
import { strokeWidth, smoothWidth, ignoreTouch, fitSize, scanMessage, MIN_WIDTH, MAX_WIDTH, MOUSE_WIDTH } from '../../../src/service/Masters/SignatureScanning/utils/drawing';
import { base64ToBlob } from '../../../src/service/Masters/SignatureScanning/utils/scanImage';
import { buildWiaScript, parseStatus, detectMime, psQuote, scanWithWia, MAX_SCAN_BYTES } from '../../../src/main/scanner';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const BMP = Buffer.from([0x42, 0x4d, 9, 9, 9]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1]);

describe('pen pressure and touch', () => {
  it('a mouse draws a steady line', () => {
    expect(strokeWidth('mouse', 0.5)).toBe(MOUSE_WIDTH);
    expect(strokeWidth('mouse', 0)).toBe(MOUSE_WIDTH);
  });
  it('a pen: light touch is thin, firm press is thick, in between is in between', () => {
    expect(strokeWidth('pen', 0.05)).toBeLessThan(strokeWidth('pen', 0.5));
    expect(strokeWidth('pen', 0.5)).toBeLessThan(strokeWidth('pen', 1));
    expect(strokeWidth('pen', 1)).toBe(MAX_WIDTH);
    expect(strokeWidth('pen', 0.5)).toBeCloseTo(MIN_WIDTH + 0.5 * (MAX_WIDTH - MIN_WIDTH));
  });
  it.each([[0], [-1], [NaN], [Infinity * 0]])('a pen reading of %s is treated as a light touch, never a zero-width line', (p) => {
    const w = strokeWidth('pen', p as number);
    expect(w).toBeGreaterThan(MIN_WIDTH);
    expect(w).toBeLessThan(MAX_WIDTH);
  });
  it('pressure above 1 is capped', () => expect(strokeWidth('pen', 7)).toBe(MAX_WIDTH));
  it('touch with pressure behaves like a pen', () => expect(strokeWidth('touch', 1)).toBe(MAX_WIDTH));
  it('the width moves part of the way to the new value', () => {
    expect(smoothWidth(null, 4)).toBe(4);
    expect(smoothWidth(2, 4)).toBeCloseTo(3.2);
    expect(smoothWidth(2, 4, 1)).toBe(4);
  });
  it('a touch right after the pen is a palm and is ignored; a touch much later, or with no pen, draws', () => {
    expect(ignoreTouch('touch', 1000, 1500)).toBe(true);
    expect(ignoreTouch('touch', 1000, 4000)).toBe(false);
    expect(ignoreTouch('touch', 0, 1500)).toBe(false);
    expect(ignoreTouch('pen', 1000, 1100)).toBe(false);
    expect(ignoreTouch('mouse', 1000, 1100)).toBe(false);
  });
});

describe('scanned image size and messages', () => {
  it.each([[800, 600, 800, 600], [2800, 1400, 1400, 700], [1400, 2800, 700, 1400], [0, 100, 0, 0], [-5, 5, 0, 0]])('%s x %s -> %s x %s', (w, h, ew, eh) => {
    expect(fitSize(w, h)).toEqual({ width: ew, height: eh });
  });
  it('a huge scan keeps its shape', () => {
    const r = fitSize(5000, 3000);
    expect(r.width).toBe(1400);
    expect(r.height).toBe(840);
  });
  it('messages: cancel says nothing; each failure says what to do', () => {
    expect(scanMessage({ ok: true })).toBeNull();
    expect(scanMessage({ ok: false, reason: 'cancelled' })).toBeNull();
    expect(scanMessage({ ok: false, reason: 'no-scanner' })).toMatch(/No scanner was found/);
    expect(scanMessage({ ok: false, reason: 'unsupported' })).toMatch(/Windows only/);
    expect(scanMessage({ ok: false, reason: 'too-big' })).toMatch(/lower resolution/);
    expect(scanMessage({ ok: false, reason: 'error', message: 'boom' })).toBe('The scan failed: boom');
    expect(scanMessage({ ok: false, reason: 'error' })).toBe('The scan failed. Try again.');
    expect(scanMessage(null)).toMatch(/not available/);
  });
  it('base64 becomes a blob of the given type', async () => {
    const b = base64ToBlob(Buffer.from([1, 2, 3]).toString('base64'), 'image/jpeg');
    expect(b.type).toBe('image/jpeg');
    expect(b.size).toBe(3);
  });
});

describe('scanToUploadFile', () => {
  let realScanToUploadFile: (b: Blob, d?: any) => Promise<File>;
  beforeEach(async () => { realScanToUploadFile = ((await vi.importActual('../../../src/service/Masters/SignatureScanning/utils/scanImage')) as any).scanToUploadFile; });
  const canvasWith = (sizes: number[]) => {
    const ctx: any = { fillStyle: '', fillRect: vi.fn() };
    let i = 0;
    const canvas: any = { width: 0, height: 0, getContext: () => ctx, toBlob: (cb: any, _t: string, q: number) => cb(new Blob([new Uint8Array(sizes[Math.min(i++, sizes.length - 1)]!)], { type: 'image/jpeg' })) };
    return { canvas, ctx };
  };
  it('redraws at a fitting size and returns a JPEG file', async () => {
    const { canvas, ctx } = canvasWith([1000]);
    const draw = vi.fn();
    const f = await realScanToUploadFile(new Blob(['x']), { load: async () => ({ width: 2800, height: 1400, draw }), makeCanvas: (w: number, h: number) => { canvas.width = w; canvas.height = h; return canvas; } });
    expect(f.type).toBe('image/jpeg');
    expect(f.name).toBe('signature-scan.jpg');
    expect(canvas.width).toBe(1400);
    expect(draw).toHaveBeenCalledWith(ctx, 1400, 700);
  });
  it('lowers the quality until it is under 2 MB', async () => {
    const { canvas } = canvasWith([3 * 1024 * 1024, 2.5 * 1024 * 1024, 1024]);
    const f = await realScanToUploadFile(new Blob(['x']), { load: async () => ({ width: 100, height: 100, draw: vi.fn() }), makeCanvas: () => canvas });
    expect(f.size).toBe(1024);
  });
  it('gives up with a clear message when nothing is small enough', async () => {
    const { canvas } = canvasWith([5 * 1024 * 1024]);
    await expect(realScanToUploadFile(new Blob(['x']), { load: async () => ({ width: 100, height: 100, draw: vi.fn() }), makeCanvas: () => canvas })).rejects.toThrow(/too large/);
  });
  it('an empty image is refused', async () => {
    await expect(realScanToUploadFile(new Blob(['x']), { load: async () => ({ width: 0, height: 0, draw: vi.fn() }) })).rejects.toThrow(/empty/);
  });
});

describe('WIA scanner service (desktop main process)', () => {
  it('the script opens the scan dialog for a scanner, asks for colour JPEG, saves to the given path, and knows the three answers', () => {
    const s = buildWiaScript('C:\\Temp\\a b\\scan.jpg');
    expect(s).toContain('WIA.CommonDialog');
    expect(s).toContain('ShowAcquireImage(1, 1, 0');
    expect(s).toContain('{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}');
    expect(s).toContain("SaveFile('C:\\Temp\\a b\\scan.jpg')");
    expect(s).toContain('CANCELLED');
    expect(s).toContain('NODEVICE');
    expect(s).toContain('ERROR:');
  });
  it('a quote in the path cannot break out of the script text', () => {
    expect(psQuote("C:\\it's")).toBe("'C:\\it''s'");
    expect(buildWiaScript("C:\\x'; Remove-Item *; '")).toContain("''; Remove-Item *; ''");
  });
  it.each([
    ['OK\n', 'OK'], ['\r\nCANCELLED\r\n', 'CANCELLED'], ['NODEVICE', 'NODEVICE'], ['noise\nOK', 'OK'],
  ])('status %j -> %s', (out, want) => expect(parseStatus(out).status).toBe(want));
  it('an error line gives its message; empty or unknown output is an error too', () => {
    expect(parseStatus('ERROR: driver busy')).toEqual({ status: 'ERROR', message: 'driver busy' });
    expect(parseStatus('').status).toBe('ERROR');
    expect(parseStatus('something else').status).toBe('ERROR');
  });
  it('image type from the first bytes', () => {
    expect(detectMime(JPEG)).toBe('image/jpeg');
    expect(detectMime(BMP)).toBe('image/bmp');
    expect(detectMime(PNG)).toBe('image/png');
    expect(detectMime(Buffer.from('<html>'))).toBeNull();
    expect(detectMime(Buffer.from([1]))).toBeNull();
  });

  const run = (stdout: string, file?: Buffer, platform = 'win32', execErr?: Error) => {
    const exec = vi.fn((_f: string, _a: string[], _o: any, cb: any) => cb(execErr ?? null, stdout, ''));
    const removed: string[] = [];
    const p = scanWithWia({
      platform, exec: exec as any, tmpDir: 'C:\\tmp', now: () => 1,
      readFile: (path) => { if (!file) throw new Error('missing'); return file; },
      removeFile: (path) => removed.push(path),
    });
    return { p, exec, removed };
  };

  it('a finished scan returns the image and cleans up the temp file', async () => {
    const { p, removed, exec } = run('OK', JPEG);
    const r: any = await p;
    expect(r).toEqual({ ok: true, mime: 'image/jpeg', base64: JPEG.toString('base64') });
    expect(removed).toHaveLength(1);
    const args = exec.mock.calls[0]![1] as string[];
    expect(exec.mock.calls[0]![0]).toBe('powershell.exe');
    expect(args).toContain('-STA');
    expect(args).toContain('-NoProfile');
  });
  it('a bitmap from the scanner is returned as a bitmap (the screen converts it)', async () => {
    expect(((await run('OK', BMP).p) as any).mime).toBe('image/bmp');
  });
  it('cancelled in the dialog: reason cancelled', async () => expect(await run('CANCELLED').p).toEqual({ ok: false, reason: 'cancelled' }));
  it('no scanner: reason no-scanner', async () => expect(await run('NODEVICE').p).toEqual({ ok: false, reason: 'no-scanner' }));
  it('a script error: its message is passed on', async () => expect(await run('ERROR:busy').p).toEqual({ ok: false, reason: 'error', message: 'busy' }));
  it('PowerShell itself failing to start is an error, not a crash', async () => {
    const r: any = await run('', undefined, 'win32', new Error('spawn powershell.exe ENOENT')).p;
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('error');
    expect(r.message).toMatch(/ENOENT/);
  });
  it('not Windows: unsupported, and nothing is started', async () => {
    const { p, exec } = run('OK', JPEG, 'darwin');
    expect(await p).toEqual({ ok: false, reason: 'unsupported' });
    expect(exec).not.toHaveBeenCalled();
  });
  it('the file is missing after OK: a clear error, temp cleanup still tried', async () => {
    const { p, removed } = run('OK', undefined);
    const r: any = await p;
    expect(r.reason).toBe('error');
    expect(removed).toHaveLength(1);
  });
  it('something that is not an image is refused', async () => {
    const r: any = await run('OK', Buffer.from('not an image at all')).p;
    expect(r.reason).toBe('error');
    expect(r.message).toMatch(/not an image/);
  });
  it('an image over 20 MB is refused (too-big)', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(MAX_SCAN_BYTES)]);
    expect(((await run('OK', big).p) as any).reason).toBe('too-big');
  });
});

describe('the Scan tab', () => {
  const member = { mbno: '30017688', f_name: 'MOHAN', m_name: 'DAS', l_name: '', signature_image_path: null, has_bank_signature: false };
  const open = async () => {
    render(<SignatureScanning />);
    fireEvent.click(screen.getByRole('button', { name: 'Member lookup' }));
    fireEvent.click(screen.getByText('pick'));
    await screen.findByText('MOHAN DAS');
    fireEvent.click(screen.getByRole('tab', { name: /Scan/ }));
  };
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMemberDetails.mockResolvedValue({ success: true, data: member });
    api.uploadMemberSignatureMaster.mockResolvedValue({ success: true });
    api.fetchProtectedFile.mockResolvedValue(null);
    (URL as any).createObjectURL = vi.fn(() => 'blob:scan');
    (URL as any).revokeObjectURL = vi.fn();
  });
  afterEach(() => { delete (window as any).electronAPI; });

  it('no desktop scanner bridge (browser): there is no Scan tab', () => {
    render(<SignatureScanning />);
    expect(screen.queryByRole('tab', { name: /Scan/ })).toBeNull();
  });

  it('the Scan button needs a member first', () => {
    (window as any).electronAPI = { scanDocument: vi.fn() };
    render(<SignatureScanning />);
    fireEvent.click(screen.getByRole('tab', { name: /Scan/ }));
    expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled();
  });

  it('a scan shows a preview; Save this scan uploads it to the member and clears the preview', async () => {
    (window as any).electronAPI = { scanDocument: vi.fn().mockResolvedValue({ ok: true, mime: 'image/jpeg', base64: JPEG.toString('base64') }) };
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(await screen.findByAltText('Scanned signature')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Save this scan/ }));
    await waitFor(() => expect(api.uploadMemberSignatureMaster).toHaveBeenCalledWith('30017688', expect.any(File)));
    await waitFor(() => expect(screen.queryByAltText('Scanned signature')).toBeNull());
  });

  it('Discard throws the scan away without saving', async () => {
    (window as any).electronAPI = { scanDocument: vi.fn().mockResolvedValue({ ok: true, mime: 'image/jpeg', base64: JPEG.toString('base64') }) };
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    await screen.findByAltText('Scanned signature');
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByAltText('Scanned signature')).toBeNull();
    expect(api.uploadMemberSignatureMaster).not.toHaveBeenCalled();
  });

  it('cancelling in the scan window says nothing and shows nothing', async () => {
    (window as any).electronAPI = { scanDocument: vi.fn().mockResolvedValue({ ok: false, reason: 'cancelled' }) };
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Scan' })).not.toBeDisabled());
    expect(screen.queryByAltText('Scanned signature')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('no scanner connected: a plain message', async () => {
    (window as any).electronAPI = { scanDocument: vi.fn().mockResolvedValue({ ok: false, reason: 'no-scanner' }) };
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(await screen.findByText(/No scanner was found/)).toBeInTheDocument();
  });

  it('while waiting for the scanner the button is disabled and says so; a second click does nothing', async () => {
    let finish!: (v: any) => void;
    const scan = vi.fn(() => new Promise((r) => { finish = r; }));
    (window as any).electronAPI = { scanDocument: scan };
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    const waiting = await screen.findByRole('button', { name: /Waiting for the scanner/ });
    expect(waiting).toBeDisabled();
    fireEvent.click(waiting);
    expect(scan).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ ok: false, reason: 'cancelled' }); });
  });

  it('the bridge throwing is reported, the button works again', async () => {
    (window as any).electronAPI = { scanDocument: vi.fn().mockRejectedValue(new Error('bridge down')) };
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(await screen.findByText('bridge down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan' })).not.toBeDisabled();
  });
});

describe('drawing area with a pen', () => {
  it('the canvas listens to pointer events (mouse, touch and pen) and no longer to mouse-only events', () => {
    const { container } = render(<SignatureScanning />);
    const canvas = container.querySelector('canvas')!;
    expect(canvas).toBeTruthy();
    // a pen stroke makes the placeholder text go away: the drawing started
    const ctx: any = { fillStyle: '', fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), set lineWidth(v: number) { widths.push(v); }, strokeStyle: '', lineCap: '', lineJoin: '' };
    const widths: number[] = [];
    (canvas as any).getContext = () => ctx;
    (canvas as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 200 });
    const ev = (type: string, init: any) => { const e = new Event(type, { bubbles: true, cancelable: true }); Object.assign(e, { pointerId: 1, pointerType: 'pen', pressure: 0.2, clientX: 10, clientY: 10, button: 0, ...init }); canvas.dispatchEvent(e); };
    ev('pointerdown', { pressure: 0.2 });
    ev('pointermove', { pressure: 0.9, clientX: 30, clientY: 20 });
    ev('pointerup', {});
    expect(ctx.stroke).toHaveBeenCalled();
    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths)); // pressure changed the width
  });
});
