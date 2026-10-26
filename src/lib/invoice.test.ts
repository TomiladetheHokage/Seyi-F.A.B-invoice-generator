import { describe, expect, it } from "vitest";

import {
  EMPTY_ITEM,
  computeInvoice,
  emptyDraft,
  formatDateLong,
  invoiceFilename,
  itemLineKobo,
  validateInvoice,
  type InvoiceDraft,
} from "./invoice";

describe("money math through computeInvoice", () => {
  it("totals items, delivery and extra charges into the grand total", () => {
    const draft: InvoiceDraft = {
      ...emptyDraft(),
      customerName: "Mrs. Adaeze",
      date: "2026-10-26",
      invoiceNumber: "INV-20261026-001",
      items: [
        { description: "Ankara fabric", quantity: "2", unitPrice: "92,500" },
        { description: "Thread set", quantity: "1", unitPrice: "3500.50" },
      ],
      deliveryEnabled: true,
      deliveryAmount: "2000",
      extras: [{ description: "Packaging", amount: "500" }],
    };

    const invoice = computeInvoice(draft);
    // 2 x 92,500 = 185,000; 1 x 3,500.50 = 350,050 kobo
    expect(invoice.items[0]?.totalKobo).toBe(18500000);
    expect(invoice.items[1]?.totalKobo).toBe(350050);
    expect(invoice.subtotalKobo).toBe(18850050);
    expect(invoice.delivery?.amountKobo).toBe(200000);
    expect(invoice.extras[0]?.amountKobo).toBe(50000);
    expect(invoice.grandTotalKobo).toBe(19100050);
  });

  it("leaves incomplete or invalid rows out of the totals", () => {
    const draft: InvoiceDraft = {
      ...emptyDraft(),
      items: [
        { description: "Valid item", quantity: "1", unitPrice: "1000" },
        { ...EMPTY_ITEM },
        { description: "Bad qty", quantity: "abc", unitPrice: "1000" },
      ],
      deliveryEnabled: true,
      deliveryAmount: "not-a-number",
    };

    const invoice = computeInvoice(draft);
    expect(invoice.items).toHaveLength(1);
    expect(invoice.grandTotalKobo).toBe(100000);
    expect(invoice.delivery).toBeNull();
  });

  it("computes a single item's line total in kobo", () => {
    expect(itemLineKobo({ description: "x", quantity: "1.5", unitPrice: "2000" })).toBe(300000);
    expect(itemLineKobo({ description: "x", quantity: "0", unitPrice: "2000" })).toBeNull();
  });
});

describe("validateInvoice", () => {
  it("requires a customer name and invoice number", () => {
    const errors = validateInvoice({
      ...emptyDraft(),
      items: [{ description: "Item", quantity: "1", unitPrice: "500" }],
    });
    expect(errors.customerName).toBeTruthy();
    expect(errors.invoiceNumber).toBeTruthy();
    expect(errors.items[0]).toBeNull();
  });

  it("ignores fully empty rows but flags partially filled ones", () => {
    const errors = validateInvoice({
      ...emptyDraft(),
      customerName: "Ada",
      invoiceNumber: "INV-1",
      items: [
        { description: "Item", quantity: "1", unitPrice: "500" },
        { description: "", quantity: "", unitPrice: "" },
        { description: "Half done", quantity: "", unitPrice: "500" },
      ],
    });
    expect(errors.items[0]).toBeNull();
    expect(errors.items[1]).toBeNull();
    expect(errors.items[2]).toBeTruthy();
    expect(errors.extras.every((error) => error === null)).toBe(true);
  });

  it("requires at least one valid item", () => {
    const errors = validateInvoice({
      ...emptyDraft(),
      customerName: "Ada",
      invoiceNumber: "INV-1",
      items: [{ description: "", quantity: "", unitPrice: "" }],
    });
    expect(errors.items[0]).toBeTruthy();
  });
});

describe("formatting helpers", () => {
  it("renders dates as '25 October 2026'", () => {
    expect(formatDateLong("2026-10-25")).toBe("25 October 2026");
  });

  it("builds a safe PDF filename from the invoice number", () => {
    expect(invoiceFilename("INV-20261025-001")).toBe("SEYI-FAB-Invoice-INV-20261025-001.pdf");
    expect(invoiceFilename("")).toBe("SEYI-FAB-Invoice-invoice.pdf");
  });
});
