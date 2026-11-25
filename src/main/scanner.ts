// Document scanner support for the desktop app (Windows Image Acquisition, WIA).
// Most scanners on Windows work through WIA. The Windows scan dialog is opened through PowerShell's COM bridge, the user
// scans, and the image comes back as a file. Nothing here talks to the network. Scanners that only support TWAIN are not
// covered (they need a separate library).
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';

export type ScanResult =
  | { ok: true; mime: 'image/jpeg' | 'image/png' | 'image/bmp'; base64: string }
  | { ok: false; reason: 'cancelled' | 'no-scanner' | 'unsupported' | 'too-big' | 'error'; message?: string | undefined };

/** The largest image taken back from a scan (20 MB): a runaway or wrong-resolution scan must not fill the memory. */
export const MAX_SCAN_BYTES = 20 * 1024 * 1024;

/** WIA format id of JPEG. */
const WIA_JPEG = '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}';

/** PowerShell text for single quotes: a quote inside is doubled. */
export const psQuote = (s: string): string => `'${String(s).replace(/'/g, "''")}'`;

/**
 * The script run by PowerShell: opens the Windows scan dialog (device chooser included), saves the image to `outPath`
 * and prints one status word: OK, CANCELLED, NODEVICE or ERROR:<message>.
 */
export function buildWiaScript(outPath: string): string {
  return [
    "$ErrorActionPreference = 'Stop'",
    'try {',
    "  $dlg = New-Object -ComObject WIA.CommonDialog",
    // device type 1 = scanner, intent 1 = colour (blue ink stays blue), bias 0, JPEG, always ask which device, common UI, no cancel error
    `  $img = $dlg.ShowAcquireImage(1, 1, 0, ${psQuote(WIA_JPEG)}, $true, $true, $false)`,
    "  if ($null -eq $img) { Write-Output 'CANCELLED'; exit 0 }",
    `  $img.SaveFile(${psQuote(outPath)})`,
    "  Write-Output 'OK'",
    '} catch {',
    '  $m = $_.Exception.Message',
    "  if ($m -match '0x80210015' -or $m -match 'no WIA device' -or $m -match 'not available') { Write-Output 'NODEVICE' }",
    "  else { Write-Output ('ERROR:' + ($m -replace '[\\r\\n]+', ' ')) }",
    '}',
  ].join('\n');
}

/** The image type from its first bytes (the scanner may hand back a bitmap even when JPEG was asked for). */
export function detectMime(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/bmp' | null {
  if (!buf || buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0x42 && buf[1] === 0x4d) return 'image/bmp';
  return null;
}

/** The status word PowerShell printed (the last non-empty line), turned into a result without the image. */
export function parseStatus(stdout: string): { status: 'OK' | 'CANCELLED' | 'NODEVICE' | 'ERROR'; message?: string } {
  const last = String(stdout ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop() ?? '';
  if (last === 'OK') return { status: 'OK' };
  if (last === 'CANCELLED') return { status: 'CANCELLED' };
  if (last === 'NODEVICE') return { status: 'NODEVICE' };
  if (last.startsWith('ERROR:')) return { status: 'ERROR', message: last.slice(6).trim() };
  return { status: 'ERROR', message: last || 'no answer from the scanner service' };
}

type Exec = (file: string, args: string[], opts: { timeout: number; windowsHide: boolean; maxBuffer: number },
  cb: (err: Error | null, stdout: string, stderr: string) => void) => void;

export interface ScanDeps {
  platform?: string;
  exec?: Exec;
  tmpDir?: string;
  readFile?: (p: string) => Buffer;
  removeFile?: (p: string) => void;
  now?: () => number;
}

/** Runs one scan. The Windows dialog stays open until the user finishes or cancels (at most 10 minutes). */
export async function scanWithWia(deps: ScanDeps = {}): Promise<ScanResult> {
  const platform = deps.platform ?? process.platform;
  if (platform !== 'win32') return { ok: false, reason: 'unsupported' };
  const exec: Exec = deps.exec ?? (execFile as unknown as Exec);
  const tmpDir = deps.tmpDir ?? os.tmpdir();
  const readFile = deps.readFile ?? ((p: string) => fs.readFileSync(p));
  const removeFile = deps.removeFile ?? ((p: string) => { try { fs.unlinkSync(p); } catch { /* already gone */ } });
  const outPath = path.join(tmpDir, `espat-scan-${(deps.now ?? Date.now)()}-${Math.random().toString(36).slice(2, 8)}.jpg`);

  const stdout = await new Promise<string>((resolve, reject) => {
    exec(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-Command', buildWiaScript(outPath)],
      { timeout: 10 * 60 * 1000, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, out) => (err ? reject(err) : resolve(out)),
    );
  }).catch((e: Error) => `ERROR:${e.message}`);

  const status = parseStatus(stdout);
  try {
    if (status.status === 'CANCELLED') return { ok: false, reason: 'cancelled' };
    if (status.status === 'NODEVICE') return { ok: false, reason: 'no-scanner' };
    if (status.status === 'ERROR') return { ok: false, reason: 'error', message: status.message };
    let buf: Buffer;
    try { buf = readFile(outPath); } catch { return { ok: false, reason: 'error', message: 'the scanned file could not be read' }; }
    if (buf.length > MAX_SCAN_BYTES) return { ok: false, reason: 'too-big' };
    const mime = detectMime(buf);
    if (!mime) return { ok: false, reason: 'error', message: 'the scanner returned something that is not an image' };
    return { ok: true, mime, base64: buf.toString('base64') };
  } finally {
    removeFile(outPath);
  }
}
