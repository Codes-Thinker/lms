/** Browser-side image compress before upload (chat / fees). */
export async function compressImageFile(
  file: File,
  opts?: { maxSide?: number; quality?: number }
): Promise<{ dataUrl: string; name: string }> {
  const maxSide = opts?.maxSide ?? 1280;
  const quality = opts?.quality ?? 0.68;

  if (!file.type.startsWith("image/")) {
    throw new Error("Only images are supported");
  }

  // Small files: skip canvas work.
  if (file.size < 90_000) {
    const dataUrl = await readAsDataUrl(file);
    return { dataUrl, name: file.name };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    const dataUrl = await readAsDataUrl(file);
    return { dataUrl, name: file.name };
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base = file.name.replace(/\.\w+$/, "") || "photo";
  return { dataUrl, name: `${base}.jpg` };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
