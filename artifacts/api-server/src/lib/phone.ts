/**
 * Jordanian mobile-number validation.
 *
 * Rules:
 *  - Exactly 10 digits
 *  - Prefix must be 077, 078, or 079
 *  - No letters, spaces, or symbols (we strip them during normalisation)
 *  - No country-code formats (+962)
 */

export const JORDAN_PHONE_RE = /^(077|078|079)\d{7}$/;
export const PHONE_ERROR_AR = "رقم الهاتف غير صالح";

/**
 * Normalise (strip non-digits) then validate a phone string.
 * Returns { ok: true, phone } on success, { ok: false, error } on failure.
 */
export function validatePhone(
  raw: string,
): { ok: true; phone: string } | { ok: false; error: string } {
  const normalized = (raw ?? "").replace(/\D/g, "");
  if (!JORDAN_PHONE_RE.test(normalized)) {
    return { ok: false, error: PHONE_ERROR_AR };
  }
  return { ok: true, phone: normalized };
}
