import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, ImagePlus, RefreshCw, X } from "lucide-react";

import { InvoiceForm } from "@/components/invoice-form";
import { InvoicePreview } from "@/components/invoice-preview";
import { Button } from "@/components/ui/button";
import { useInvoice } from "@/hooks/useInvoice";
import { BUSINESS } from "@/lib/business";
import { deliverFile } from "@/lib/download";
import { computeInvoice, invoiceFilename, validateInvoice } from "@/lib/invoice";
import { formatKobo } from "@/lib/money";
import { generateInvoicePdf } from "@/lib/pdf";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SEYI F.A.B — Invoice Maker" },
      {
        name: "description",
        content:
          "Create, preview and download polished SEYI F.A.B invoices as PDFs, right from your phone.",
      },
      { property: "og:title", content: "SEYI F.A.B — Invoice Maker" },
      {
        property: "og:description",
        content: "Create, preview and download polished SEYI F.A.B invoices as PDFs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const invoice = useInvoice();
  const { draft, errors, setErrors, reset } = invoice;
  const computed = useMemo(() => computeInvoice(draft), [draft]);

  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoSrc(reader.result);
        setLogoName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearCustomLogo = () => {
    setLogoSrc(null);
    setLogoName(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startNew = () => {
    reset();
    clearCustomLogo();
    setDownloadError(null);
  };

  const download = async () => {
    setDownloadError(null);
    const found = validateInvoice(draft);
    setErrors(found);
    const hasErrors =
      Boolean(found.customerName || found.invoiceNumber) ||
      found.items.some(Boolean) ||
      found.extras.some(Boolean);
    if (hasErrors) return;
    setDownloading(true);
    try {
      const blob = await generateInvoicePdf(computed, logoSrc ?? undefined);
      deliverFile(blob, invoiceFilename(computed.invoiceNumber));
    } catch (error) {
      console.error(error);
      setDownloadError("Something went wrong while creating the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const headerLogo = logoSrc ?? BUSINESS.logoUrl;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          {/* <img
            src={headerLogo}
            alt="SEYI F.A.B logo"
            className="h-10 w-10 rounded-lg object-contain"
          /> */}
          <div className="mr-auto">
            <p className="font-display text-base font-bold leading-tight text-brand-brown">
              {BUSINESS.name}
            </p>
            <p className="text-xs text-muted-foreground">{BUSINESS.slogan}</p>
          </div>
          <Button variant="outline" size="sm" onClick={startNew}>
            <RefreshCw /> New invoice
          </Button>
          <Button size="sm" onClick={download} disabled={downloading}>
            <Download /> {downloading ? "Creating PDF…" : "Download PDF"}
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {downloadError ? (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {downloadError}
          </div>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <InvoiceForm invoice={invoice} />

          <div className="lg:sticky lg:top-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-foreground">Preview</h2>
              <p className="text-sm">
                <span className="text-muted-foreground">Total </span>
                <span className="font-bold text-primary">{formatKobo(computed.grandTotalKobo)}</span>
              </p>
            </div>
            <InvoicePreview invoice={computed} logoSrc={logoSrc} />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={download} disabled={downloading}>
                <Download /> {downloading ? "Creating PDF…" : "Download PDF"}
              </Button>
              <input
                ref={fileRef}
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(event) => handleLogoFile(event.target.files?.[0])}
              />
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <ImagePlus /> {logoName ?? "Use a different logo"}
                </label>
              </Button>
              {logoSrc ? (
                <Button variant="ghost" size="sm" onClick={clearCustomLogo}>
                  <X /> Default logo
                </Button>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Your draft saves automatically on this device as you type.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
