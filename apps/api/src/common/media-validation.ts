import { BadRequestException } from "@nestjs/common";

const DEFAULT_MAX_BYTES = 2_500_000; // ~2.5MB decoded

/**
 * Validate base64 / data-URL image payloads before storing in DB.
 * Full object storage (S3/R2) is Phase C follow-up; this stops oversized/junk uploads.
 */
export function assertImageDataUrl(
  raw: string | null | undefined,
  opts?: { maxBytes?: number; field?: string }
): string | null {
  if (raw == null) return null;
  const value = raw.trim();
  if (!value) return null;

  const field = opts?.field ?? "image";
  const maxBytes = opts?.maxBytes ?? DEFAULT_MAX_BYTES;

  const match = /^data:(image\/(jpeg|jpg|png|webp|gif));base64,(.+)$/i.exec(
    value
  );
  if (!match) {
    // Allow raw base64 without prefix (legacy clients) but still size-check.
    if (!/^[A-Za-z0-9+/=\s]+$/.test(value) || value.length < 32) {
      throw new BadRequestException(
        `${field} must be a JPEG, PNG, WebP, or GIF data URL`
      );
    }
    const approx = Math.floor((value.replace(/\s/g, "").length * 3) / 4);
    if (approx > maxBytes) {
      throw new BadRequestException(
        `${field} is too large (max ${Math.round(maxBytes / 1024)}KB)`
      );
    }
    return value;
  }

  const b64 = match[3].replace(/\s/g, "");
  const approx = Math.floor((b64.length * 3) / 4);
  if (approx > maxBytes) {
    throw new BadRequestException(
      `${field} is too large (max ${Math.round(maxBytes / 1024)}KB)`
    );
  }
  return value;
}
