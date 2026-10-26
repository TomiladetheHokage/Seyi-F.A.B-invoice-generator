import { useEffect, useState } from "react";

import {
  EMPTY_ITEM,
  emptyDraft,
  nextInvoiceNumber,
  todayISO,
  type ExtraChargeDraft,
  type InvoiceDraft,
  type InvoiceErrors,
  type InvoiceItemDraft,
} from "@/lib/invoice";

const DRAFT_KEY = "seyi-fab-invoice-draft-v1";

/** The draft is saved so an accidental refresh doesn't lose work. */
function sanitizeDraft(raw: unknown): InvoiceDraft | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const items = Array.isArray(value["items"])
    ? value["items"].map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
          description: str(row["description"]),
          quantity: str(row["quantity"]),
          unitPrice: str(row["unitPrice"]),
        };
      })
    : [];
  const extras = Array.isArray(value["extras"])
    ? value["extras"].map((extra) => {
        const row = (extra ?? {}) as Record<string, unknown>;
        return { description: str(row["description"]), amount: str(row["amount"]) };
      })
    : [];
  return {
    customerName: str(value["customerName"]),
    attention: str(value["attention"]),
    date: str(value["date"]),
    invoiceNumber: str(value["invoiceNumber"]),
    notes: str(value["notes"]),
    items: items.length > 0 ? items : [{ ...EMPTY_ITEM }],
    deliveryEnabled: value["deliveryEnabled"] === true,
    deliveryAmount: str(value["deliveryAmount"]),
    extras,
  };
}

export function useInvoice() {
  const [draft, setDraft] = useState<InvoiceDraft>(emptyDraft);
  const [errors, setErrors] = useState<InvoiceErrors>({ items: [], extras: [] });
  const [hydrated, setHydrated] = useState(false);

  // Restore the saved draft once, on the client only.
  useEffect(() => {
    let base = emptyDraft();
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = sanitizeDraft(JSON.parse(saved));
        if (parsed) base = parsed;
      }
    } catch {
      // Private mode or corrupted draft — start fresh.
    }
    if (!base.date) base.date = todayISO();
    if (!base.invoiceNumber) base.invoiceNumber = nextInvoiceNumber();
    if (base.items.length === 0) base.items = [{ ...EMPTY_ITEM }];
    setDraft(base);
    setHydrated(true);
  }, []);

  // Save the draft as the user types.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage unavailable — the workflow still works without saving.
    }
  }, [draft, hydrated]);

  const update = <K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateItem = (index: number, patch: Partial<InvoiceItemDraft>) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => setDraft((current) => ({ ...current, items: [...current.items, { ...EMPTY_ITEM }] }));

  const removeItem = (index: number) => {
    setDraft((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }));
  };

  const updateExtra = (index: number, patch: Partial<ExtraChargeDraft>) => {
    setDraft((current) => ({
      ...current,
      extras: current.extras.map((extra, i) => (i === index ? { ...extra, ...patch } : extra)),
    }));
  };

  const addExtra = () =>
    setDraft((current) => ({ ...current, extras: [...current.extras, { description: "", amount: "" }] }));

  const removeExtra = (index: number) => {
    setDraft((current) => ({ ...current, extras: current.extras.filter((_, i) => i !== index) }));
  };

  /** Start a clean invoice with today's date and a fresh number. */
  const reset = () => {
    const fresh = emptyDraft();
    fresh.date = todayISO();
    fresh.invoiceNumber = nextInvoiceNumber();
    setDraft(fresh);
    setErrors({ items: [], extras: [] });
  };

  return {
    draft,
    errors,
    setErrors,
    update,
    updateItem,
    addItem,
    removeItem,
    updateExtra,
    addExtra,
    removeExtra,
    reset,
  };
}
