// Resize an uploaded image to a max long-edge of 800px and re-encode
// as JPEG (0.82 quality). Returns a base64 data URL — held locally, then
// uploaded to Cloud Storage on sync (see lib/photos.ts) so it never bloats
// the Firestore doc.

export type ImageErrorKind = 'too-large' | 'unsupported' | 'decode-failed' | 'read-failed';

export class ImageError extends Error {
  constructor(public kind: ImageErrorKind, message: string) {
    super(message);
    this.name = 'ImageError';
  }
}

// 12 MB raw upload ceiling — anything larger is almost certainly a wrong-file
// pick (RAW, video, etc). After resize the JPEG is well under 200 KB.
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

const SUPPORTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
]);

export function imageErrorMessage(err: unknown): string {
  if (err instanceof ImageError) {
    switch (err.kind) {
      case 'too-large':
        return 'That image is too large. Try one under 12 MB, or shrink it first.';
      case 'unsupported':
        return "That file type isn't a recognised image. JPEG, PNG, WebP, or HEIC work best.";
      case 'decode-failed':
        return "Couldn't decode that image — it may be corrupt or in a format the browser can't read.";
      case 'read-failed':
        return "Couldn't read that file. If it's on cloud storage, try downloading it locally first.";
    }
  }
  return 'Something went wrong with that image.';
}

export async function resizeImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || (file.type && !SUPPORTED_TYPES.has(file.type))) {
    throw new ImageError('unsupported', `Unsupported MIME type: ${file.type || 'unknown'}`);
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError('too-large', `File is ${(file.size / 1024 / 1024).toFixed(1)} MB`);
  }
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target?.result as string);
    r.onerror = () => rej(new ImageError('read-failed', 'FileReader error'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new ImageError('decode-failed', 'Image element decode failed'));
    i.src = dataUrl;
  });
  const MAX = 800;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('decode-failed', '2D canvas context unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.82);
}
