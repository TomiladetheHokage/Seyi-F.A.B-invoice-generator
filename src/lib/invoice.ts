import { parseAmountToKobo, parseQuantity } from "./money";

// ------------------------------------------------------------
// Draft types (what the form holds)
// ------------------------------------------------------------

export interface InvoiceItemDraft {
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface ExtraChargeDraft {
  description: string;
  amount: string;
}

export interface InvoiceDraft {
  customerName: string;
  attention: string;
  /** ISO date (yyyy-mm-dd) from the date input. */
  date: string;
  invoiceNumber: string;
  notes: string;
  items: InvoiceItemDraft[];
  deliveryEnabled: boolean;
  deliveryAmount: string;
  extras: ExtraChargeDraft[];
}

// ------------------------------------------------------------
// Computed types (what the preview and PDF render)
// ------------------------------------------------------------

export interface ComputedItem {
  description: string;
  quantity: number;
  unitKobo: number;
  totalKobo: number;
}

export interface ComputedCharge {
  label: string;
  amountKobo: number;
}

export interface ComputedInvoice {
  customerName: string;
  attention: string;
  date: string;
  /** Human date, e.g. "25 October 2026". */
  dateDisplay: string;
  invoiceNumber: string;
  notes: string;
  items: ComputedItem[];
  subtotalKobo: number;
  delivery: ComputedCharge | null;
  extras: ComputedCharge[];
  extrasTotalKobo: number;
  grandTotalKobo: number;
}

export interface InvoiceErrors {
  customerName?: string;
  invoiceNumber?: string;
  /** One entry per item row: an error message, or null when the row is fine. */
  items: (string | null)[];
  /** One entry per extra-charge row: an error message, or null when the row is fine. */
  extras: (string | null)[];
}

export const EMPTY_ITEM: InvoiceItemDraft = { description: "", quantity: "", unitPrice: "" };
export const EMPTY_EXTRA: ExtraChargeDraft = { description: "", amount: "" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-10-25" -> "25 October 2026". Timezone-independent. */
export function formatDateLong(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, y, mo, d] = match;
  if (!y || !mo || !d) return iso;
  const month = MONTHS[Number(mo) - 1];
  return month ? `${Number(d)} ${month} ${y}` : iso;
}

/** Today's date as yyyy-mm-dd using the device's local time. Browser only. */
export function todayISO(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * A unique, readable invoice number like INV-20261025-001.
 * The daily sequence is kept in localStorage so numbers stay
 * unique on this device even across sessions.
 */
export function nextInvoiceNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  if (typeof window === "undefined") return `INV-${ymd}-001`;
  const key = `seyi-fab-invoice-seq-${ymd}`;
  const next = (Number(window.localStorage.getItem(key)) || 0) + 1;
  window.localStorage.setItem(key, String(next));
  return `INV-${ymd}-${String(next).padStart(3, "0")}`;
}

export function emptyDraft(): InvoiceDraft {
  return {
    customerName: "",
    attention: "",
    date: "",
    invoiceNumber: "",
    notes: "",
    items: [{ ...EMPTY_ITEM }],
    deliveryEnabled: false,
    deliveryAmount: "",
    extras: [],
  };
}

/** Line total for an item in kobo, or null when the row is invalid/incomplete. */
export function itemLineKobo(item: InvoiceItemDraft): number | null {
  const quantity = parseQuantity(item.quantity);
  const unit = parseAmountToKobo(item.unitPrice);
  if (quantity === null || unit === null || quantity <= 0) return null;
  return Math.round(quantity * unit);
}

/**
 * Turn a draft into the exact numbers the preview and PDF show.
 * Rows or charges that are empty or invalid are simply left out —
 * they never affect the total.
 */
export function computeInvoice(draft: InvoiceDraft): ComputedInvoice {
  const items: ComputedItem[] = [];
  for (const item of draft.items) {
    const description = item.description.trim();
    if (!description) continue;
    const quantity = parseQuantity(item.quantity);
    const unit = parseAmountToKobo(item.unitPrice);
    if (quantity === null || unit === null || quantity <= 0) continue;
    items.push({ description, quantity, unitKobo: unit, totalKobo: Math.round(quantity * unit) });
  }
  const subtotalKobo = items.reduce((sum, item) => sum + item.totalKobo, 0);

  let delivery: ComputedCharge | null = null;
  if (draft.deliveryEnabled) {
    const amount = parseAmountToKobo(draft.deliveryAmount);
    if (amount !== null && amount > 0) delivery = { label: "Delivery", amountKobo: amount };
  }

  const extras: ComputedCharge[] = [];
  for (const extra of draft.extras) {
    const label = extra.description.trim();
    const amount = parseAmountToKobo(extra.amount);
    if (label && amount !== null && amount > 0) extras.push({ label, amountKobo: amount });
  }
  const extrasTotalKobo = extras.reduce((sum, extra) => sum + extra.amountKobo, 0);

  return {
    customerName: draft.customerName.trim(),
    attention: draft.attention.trim(),
    date: draft.date,
    dateDisplay: formatDateLong(draft.date),
    invoiceNumber: draft.invoiceNumber.trim(),
    notes: draft.notes.trim(),
    items,
    subtotalKobo,
    delivery,
    extras,
    extrasTotalKobo,
    grandTotalKobo: subtotalKobo + (delivery?.amountKobo ?? 0) + extrasTotalKobo,
  };
}

/** Form validation. Fully empty rows are ignored; partially filled rows must be valid. */
export function validateInvoice(draft: InvoiceDraft): InvoiceErrors {
  const errors: InvoiceErrors = { items: [], extras: [] };
  if (!draft.customerName.trim()) errors.customerName = "Customer name is required.";
  if (!draft.invoiceNumber.trim()) errors.invoiceNumber = "Invoice number is required.";

  draft.items.forEach((item, index) => {
    const hasAny = item.description.trim() || item.quantity.trim() || item.unitPrice.trim();
    if (!hasAny) {
      errors.items[index] = null;
      return;
    }
    if (!item.description.trim()) {
      errors.items[index] = "Add a description for this item.";
      return;
    }
    const quantity = parseQuantity(item.quantity);
    if (quantity === null || quantity <= 0) {
      errors.items[index] = "Quantity must be a number greater than zero.";
      return;
    }
    const unit = parseAmountToKobo(item.unitPrice);
    if (unit === null) {
      errors.items[index] = "Enter a valid unit price (0 or more).";
    } else {
      errors.items[index] = null;
    }
  });

  const hasValidItem = draft.items.some(
    (item) => item.description.trim() !== "" && itemLineKobo(item) !== null,
  );
  if (!hasValidItem) errors.items[0] = errors.items[0] ?? "Add at least one item with a description, quantity and price.";

  draft.extras.forEach((extra, index) => {
    const hasAny = extra.description.trim() || extra.amount.trim();
    if (!hasAny) {
      errors.extras[index] = null;
      return;
    }
    if (!extra.description.trim()) {
      errors.extras[index] = "Add a description for this charge.";
      return;
    }
    const amount = parseAmountToKobo(extra.amount);
    errors.extras[index] = amount === null ? "Enter a valid amount (0 or more)." : null;
  });

  return errors;
}

/** "INV-20261025-001" -> "SEYI-FAB-Invoice-INV-20261025-001.pdf". */
export function invoiceFilename(invoiceNumber: string): string {
  const slug =
    invoiceNumber
      .trim()
      .replace(/[^A-Za-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "invoice";
  return `SEYI-FAB-Invoice-${slug}.pdf`;
}
