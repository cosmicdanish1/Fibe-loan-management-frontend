// Turning a scanner answer into a file that can be uploaded as a signature (JPEG, at most 2 MB).
import { fitSize } from './drawing';

/** Base64 text to a Blob of the given type. */
export function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** The upload limit of the signature route. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/**
 * A scanned image (often a large bitmap) is redrawn at a sensible size and saved as JPEG, so it fits the 2 MB limit and
 * the stored picture is small. Quality steps down until it fits. Throws when no setting makes it small enough.
 */
export async function scanToUploadFile(
  blob: Blob,
  deps: {
    load?: (b: Blob) => Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }>;
    makeCanvas?: (w: number, h: number) => HTMLCanvasElement;
  } = {},
): Promise<File> {
  const load = deps.load ?? (async (b: Blob) => {
    const bmp = await createImageBitmap(b);
    return { width: bmp.width, height: bmp.height, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => ctx.drawImage(bmp, 0, 0, w, h) };
  });
  const makeCanvas = deps.makeCanvas ?? ((w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; });
  const img = await load(blob);
  const size = fitSize(img.width, img.height);
  if (!size.width) throw new Error('The scanned image is empty.');
  const canvas = makeCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The image could not be prepared.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size.width, size.height);
  img.draw(ctx, size.width, size.height);
  for (const quality of [0.92, 0.8, 0.65, 0.5]) {
    const out: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (out && out.size <= MAX_UPLOAD_BYTES) return new File([out], 'signature-scan.jpg', { type: 'image/jpeg' });
  }
  throw new Error('The scanned image is too large even after reducing it. Scan at a lower resolution.');
}
