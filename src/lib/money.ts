/**
 * Decimal-safe money helpers.
 *
 * All arithmetic happens in integer kobo (1 naira = 100 kobo) so
 * floating point rounding errors can never creep into totals.
 */

/** Parse a user-typed amount like "92,500" or "92500.50" into kobo. Returns null when invalid. */
export function parseAmountToKobo(raw: string): number | null {
  const cleaned = raw.replace(/[, ]/g, "").replace(/₦/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** Parse a user-typed quantity like "2" or "1.5". Returns null when invalid. */
export function parseQuantity(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Format kobo as naira, e.g. 9250000 -> "₦92,500.00". Deterministic across server and browser. */
export function formatKobo(kobo: number): string {
  const negative = kobo < 0;
  const value = Math.abs(Math.round(kobo));
  const naira = Math.floor(value / 100);
  const koboPart = String(value % 100).padStart(2, "0");
  const grouped = String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}₦${grouped}.${koboPart}`;
}

/** Format a quantity for display: 2 -> "2", 1.5 -> "1.5". */
export function formatQuantity(quantity: number): string {
  return String(Number(quantity.toFixed(2)));
}
