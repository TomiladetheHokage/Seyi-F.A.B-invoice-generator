import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { useInvoice } from "@/hooks/useInvoice";
import { itemLineKobo } from "@/lib/invoice";
import { formatKobo } from "@/lib/money";

type InvoiceControls = ReturnType<typeof useInvoice>;

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

const amountInputMode = { inputMode: "decimal" as const };

export function InvoiceForm({ invoice }: { invoice: InvoiceControls }) {
  const {
    draft,
    errors,
    update,
    updateItem,
    addItem,
    removeItem,
    updateExtra,
    addExtra,
    removeExtra,
  } = invoice;

  return (
    <div className="space-y-4">
      {/* Customer */}
      <Section title="Customer" hint="Who is this invoice for?">
        <div className="space-y-3">
          <div>
            <Label htmlFor="customerName">Customer name</Label>
            <Input
              id="customerName"
              className="mt-1"
              value={draft.customerName}
              onChange={(event) => update("customerName", event.target.value)}
              placeholder="e.g. Mrs. Adaeze Okafor"
              autoComplete="off"
            />
            <FieldError message={errors.customerName} />
          </div>
          <div>
            <Label htmlFor="attention">Attention (optional)</Label>
            <Input
              id="attention"
              className="mt-1"
              value={draft.attention}
              onChange={(event) => update("attention", event.target.value)}
              placeholder="e.g. The Admin Officer"
              autoComplete="off"
            />
          </div>
        </div>
      </Section>

      {/* Invoice details */}
      <Section title="Invoice details">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              className="mt-1"
              value={draft.date}
              onChange={(event) => update("date", event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="invoiceNumber">Invoice number</Label>
            <Input
              id="invoiceNumber"
              className="mt-1"
              value={draft.invoiceNumber}
              onChange={(event) => update("invoiceNumber", event.target.value)}
              autoComplete="off"
            />
            <FieldError message={errors.invoiceNumber} />
          </div>
        </div>
      </Section>

      {/* Items */}
      <Section title="Items" hint="Description, quantity and price for each item.">
        <div className="space-y-3">
          {draft.items.map((item, index) => {
            const line = itemLineKobo(item);
            return (
              <div key={index} className="rounded-lg border border-border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <Input
                    className="flex-1"
                    value={item.description}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                    placeholder="Item description"
                    aria-label={`Item ${index + 1} description`}
                    autoComplete="off"
                  />
                  <Input
                    className="sm:w-20"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: event.target.value })}
                    placeholder="Qty"
                    aria-label={`Item ${index + 1} quantity`}
                    {...amountInputMode}
                    autoComplete="off"
                  />
                  <Input
                    className="sm:w-32"
                    value={item.unitPrice}
                    onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
                    placeholder="Unit price"
                    aria-label={`Item ${index + 1} unit price`}
                    {...amountInputMode}
                    autoComplete="off"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => removeItem(index)}
                    disabled={draft.items.length === 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="mt-1 flex items-start justify-between gap-2">
                  <FieldError message={errors.items[index]} />
                  {line !== null ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Line total: <strong className="font-semibold text-foreground">{formatKobo(line)}</strong>
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus /> Add item
          </Button>
        </div>
      </Section>

      {/* Delivery & extra charges */}
      <Section title="Delivery & extra charges" hint="Delivery is optional; add any other charges below.">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="deliveryEnabled">Add delivery charge</Label>
              <p className="text-xs text-muted-foreground">Show a delivery amount on the invoice.</p>
            </div>
            <Switch
              id="deliveryEnabled"
              checked={draft.deliveryEnabled}
              onCheckedChange={(checked) => update("deliveryEnabled", checked)}
            />
          </div>
          {draft.deliveryEnabled ? (
            <div>
              <Label htmlFor="deliveryAmount">Delivery amount (₦)</Label>
              <Input
                id="deliveryAmount"
                className="mt-1 sm:w-40"
                value={draft.deliveryAmount}
                onChange={(event) => update("deliveryAmount", event.target.value)}
                placeholder="0.00"
                {...amountInputMode}
                autoComplete="off"
              />
            </div>
          ) : null}

          {draft.extras.map((extra, index) => (
            <div key={index} className="rounded-lg border border-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <Input
                  className="flex-1"
                  value={extra.description}
                  onChange={(event) => updateExtra(index, { description: event.target.value })}
                  placeholder="Charge description (e.g. Packaging)"
                  aria-label={`Extra charge ${index + 1} description`}
                  autoComplete="off"
                />
                <Input
                  className="sm:w-32"
                  value={extra.amount}
                  onChange={(event) => updateExtra(index, { amount: event.target.value })}
                  placeholder="Amount"
                  aria-label={`Extra charge ${index + 1} amount`}
                  {...amountInputMode}
                  autoComplete="off"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove extra charge ${index + 1}`}
                  onClick={() => removeExtra(index)}
                >
                  <Trash2 />
                </Button>
              </div>
              <FieldError message={errors.extras[index]} />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addExtra}>
            <Plus /> Add extra charge
          </Button>
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes (optional)" hint="Anything else the customer should know.">
        <Textarea
          value={draft.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="e.g. Payment is expected within 7 days."
          rows={3}
        />
      </Section>
    </div>
  );
}
