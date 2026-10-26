import { BUSINESS } from "@/lib/business";
import type { ComputedInvoice } from "@/lib/invoice";
import { formatKobo, formatQuantity } from "@/lib/money";

/**
 * A faithful, screen-sized mirror of the printed PDF invoice so the
 * user always sees exactly what the customer will receive.
 */
export function InvoicePreview({
  invoice,
  logoSrc,
}: {
  invoice: ComputedInvoice;
  logoSrc?: string | null;
}) {
  const totalsRows = [
    { label: "Subtotal", kobo: invoice.subtotalKobo },
    ...(invoice.delivery
      ? [{ label: invoice.delivery.label, kobo: invoice.delivery.amountKobo }]
      : []),
    ...invoice.extras.map((extra) => ({ label: extra.label, kobo: extra.amountKobo })),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-md">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {logoSrc ? (
              <img src={logoSrc} alt="Business logo" className="h-30 w-30 rounded-lg object-contain" />
            ) : null}
            <div>
              {/* <p className="font-display text-lg font-bold leading-tight text-brand-brown">
                {BUSINESS.name}
              </p>
              <p className="text-xs text-muted-foreground">{BUSINESS.slogan}</p> */}
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-bold tracking-wide text-primary">INVOICE</p>
            <p className="mt-0.5 text-xs font-semibold text-foreground">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">{invoice.dateDisplay}</p>
          </div>
        </div>
        <div className="mt-4 border-t-2 border-brand-brown" />

        {/* Billed to */}
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Billed to
          </p>
          <p className="mt-1 font-semibold text-foreground">{invoice.customerName || "—"}</p>
          {invoice.attention ? (
            <p className="text-sm text-muted-foreground">Attn: {invoice.attention}</p>
          ) : null}
        </div>

        {/* Notes */}
        {invoice.notes ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{invoice.notes}</p>
          </div>
        ) : null}

        {/* Items table */}
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_3rem_5.5rem_5.5rem] gap-2 bg-secondary px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Description</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Amount</span>
          </div>
          {invoice.items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No items yet — fill in the form to see them here.
            </p>
          ) : (
            invoice.items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_3rem_5.5rem_5.5rem] gap-2 border-t border-border px-3 py-2.5 text-sm"
              >
                <span className="text-foreground">{item.description}</span>
                <span className="text-center text-foreground">{formatQuantity(item.quantity)}</span>
                <span className="text-right text-foreground">{formatKobo(item.unitKobo)}</span>
                <span className="text-right font-medium text-foreground">
                  {formatKobo(item.totalKobo)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="ml-auto mt-4 w-full max-w-[17rem] space-y-1.5 text-sm">
          {totalsRows.map((row, index) => (
            <div key={index} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="text-foreground">{formatKobo(row.kobo)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between gap-4 border-t-2 border-brand-brown pt-2">
            <span className="text-sm font-bold text-foreground">Grand total</span>
            <span className="text-sm font-bold text-primary">{formatKobo(invoice.grandTotalKobo)}</span>
          </div>
        </div>

        {/* Payment details */}
        <div className="mt-6 rounded-lg border border-border bg-secondary p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Payment details
          </p>
          <p className="mt-1 font-display font-bold text-brand-brown">{BUSINESS.name}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {BUSINESS.bankAccounts.map((account) => (
              <li key={account.bank} className="flex justify-between gap-4">
                <span className="font-medium text-foreground">{account.bank}</span>
                <span className="text-muted-foreground">{account.accountNumber}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Closing message */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-primary" aria-hidden="true" />
          <p className="font-display text-sm font-bold text-brand-brown">{BUSINESS.closingMessage}</p>
          <span className="h-px w-8 bg-primary" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
