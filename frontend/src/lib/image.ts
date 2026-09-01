// Lightweight client-side image optimization: decodes a File, draws it onto a
// canvas at a sensible working resolution, and re-encodes iteratively until it
// fits under the target size (default 100KB) while keeping as much sharpness and
// quality as possible. Returns a compact JPEG data URL that is safe to send in a
// request body. This keeps uploads fast and never requires storing large images.
export async function optimizeImage(file: File, opts?: { maxWidth?: number; maxHeight?: number; maxKB?: number }): Promise<string> {
  const maxWidth = opts?.maxWidth ?? 1600;
  const maxHeight = opts?.maxHeight ?? 1600;
  const maxKB = opts?.maxKB ?? 100;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxWidth || h > maxHeight) {
      const scale = Math.min(maxWidth / w, maxHeight / h, 1);
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser.');

    // JPEG strips alpha; flatten onto a white background so we don't get black boxes.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    let quality = 0.85;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length / 1024 > maxKB && quality > 0.35) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the image file.'));
    img.src = src;
  });
}