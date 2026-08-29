/**
 * Client-side image downscaling.
 *
 * ViS-Go runs on Firebase's free Spark plan, which has no Cloud Storage, so
 * uploaded images are kept as data URLs inside Firestore documents. Firestore
 * rejects any document over 1 MiB, and base64 inflates a file by about a third
 * — meaning a 1 MB photo becomes a ~1.37 MB string and the whole write fails.
 *
 * So every picked image is re-encoded here before it is stored: scaled to fit a
 * bounding box and saved as JPEG, shrinking quality step by step until it fits
 * the byte budget. A 5 MB phone photo comes out around 60–120 KB.
 */

export interface ResizeOptions {
  /** Longest edge of the output, in pixels. */
  maxDimension?: number;
  /** Hard ceiling for the resulting data URL, in bytes. */
  maxBytes?: number;
}

export type ResizeResult =
  | { status: 'ok'; dataUrl: string; bytes: number }
  | { status: 'failed'; reason: 'NOT_IMAGE' | 'DECODE_FAILED' | 'TOO_LARGE' };

const DEFAULTS = { maxDimension: 640, maxBytes: 380_000 };

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Revoking immediately is safe: the bitmap is already decoded.
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('DECODE_FAILED'));
    };
    img.src = url;
  });
}

export async function resizeImageFile(file: File, options: ResizeOptions = {}): Promise<ResizeResult> {
  const { maxDimension, maxBytes } = { ...DEFAULTS, ...options };

  if (!file.type.startsWith('image/')) return { status: 'failed', reason: 'NOT_IMAGE' };

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return { status: 'failed', reason: 'DECODE_FAILED' };
  }

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { status: 'failed', reason: 'DECODE_FAILED' };

  // JPEG has no alpha channel; without this, transparent PNGs come out black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of [0.85, 0.72, 0.6, 0.45, 0.3]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    // A data URL is ASCII, so its character count is its byte count.
    if (dataUrl.length <= maxBytes) {
      return { status: 'ok', dataUrl, bytes: dataUrl.length };
    }
  }

  return { status: 'failed', reason: 'TOO_LARGE' };
}

/** Per-language message for a failed resize. */
export function resizeFailureMessage(reason: 'NOT_IMAGE' | 'DECODE_FAILED' | 'TOO_LARGE', vi: boolean): string {
  if (reason === 'NOT_IMAGE') {
    return vi ? 'Tệp bạn chọn không phải là ảnh.' : 'That file is not an image.';
  }
  if (reason === 'DECODE_FAILED') {
    return vi ? 'Không đọc được ảnh này. Hãy thử ảnh khác.' : 'Could not read that image. Try another one.';
  }
  return vi
    ? 'Ảnh quá lớn kể cả sau khi nén. Hãy chọn ảnh có kích thước nhỏ hơn.'
    : 'The image is still too large after compression. Please pick a smaller one.';
}
