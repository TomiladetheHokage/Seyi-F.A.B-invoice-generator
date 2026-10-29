import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";

import inter400Url from "@/assets/fonts/Inter-400.ttf?url";
import inter600Url from "@/assets/fonts/Inter-600.ttf?url";
import inter700Url from "@/assets/fonts/Inter-700.ttf?url";
import lora400Url from "@/assets/fonts/Lora-400.ttf?url";
import lora700Url from "@/assets/fonts/Lora-700.ttf?url";

import { BUSINESS } from "./business";
import { formatKobo, formatQuantity } from "./money";
import type { ComputedInvoice } from "./invoice";

// ------------------------------------------------------------
// Page geometry (A4 portrait, PDF points: 1 pt = 1/72 inch)
// ------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 50;
const RIGHT = PAGE_W - M;
const CONTENT_W = PAGE_W - 2 * M;
/** Content must end above this line to leave room for the footer. */
const BOTTOM = 70;

// Brand colours (match the design tokens in src/styles.css)
function hex(color: string): RGB {
  const n = parseInt(color.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
const COLORS = {
  brown: hex("#583424"),
  terra: hex("#BE6F45"),
  cream: hex("#F3EBDB"),
  ink: hex("#3D2513"),
  muted: hex("#7C6A57"),
  line: hex("#E3D8C5"),
};

// Table columns - adjusted for proper spacing with large amounts
const DESC_X = M + 8;
const DESC_W = 290;
const QTY_X = 372;
const UNIT_X = 450;  // Moved left from 468 to create more space
const AMT_X = RIGHT - 6;

/**
 * Keep every drawn string inside the glyph range of the embedded
 * subset fonts (Latin + ₦ + common punctuation). Rare characters
 * (e.g. emoji) become "?" instead of failing the whole PDF.
 */
function safe(text: string): string {
  return text.replace(/[^\u0020-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20A6]/g, "?");
}

/**
 * Generate the SEYI F.A.B invoice as a real, standalone PDF.
 *
 * The document is drawn from data (not a screenshot): vector-sharp
 * text, aligned amounts, the logo embedded in the file, and clean
 * page flow when an invoice is long enough to need a second page.
 */
export async function generateInvoicePdf(
  invoice: ComputedInvoice,
  customLogoSrc?: string,
): Promise<Blob> {
  const fontkitModule = await import("@pdf-lib/fontkit");
  const fontkit = (("default" in fontkitModule ? fontkitModule.default : fontkitModule) as unknown) as Parameters<
    PDFDocument["registerFontkit"]
  >[0];

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const fonts = (await Promise.all(
    [inter400Url, inter600Url, inter700Url, lora400Url, lora700Url].map(async (url) =>
      doc.embedFont(await fetch(url).then((res) => res.arrayBuffer()), { subset: true }),
    ),
  )) as [PDFFont, PDFFont, PDFFont, PDFFont, PDFFont];
  const [i400, i600, i700, l400, l700] = fonts;

  doc.setTitle(`Invoice ${invoice.invoiceNumber} — ${BUSINESS.name}`);
  doc.setAuthor(BUSINESS.name);
  doc.setSubject("Invoice");
  doc.setCreator(`${BUSINESS.name} Invoices`);

  // ---- Logo (embedded into the PDF itself) ----
  let logo: PDFImage | undefined;
  try {
    const src = customLogoSrc ?? BUSINESS.logoUrl;
    const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
    logo = bytes[0] === 0x89 && bytes[1] === 0x50 ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    // A missing or unreadable logo must never block the invoice.
    logo = undefined;
  }

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  const pages: PDFPage[] = [page];
  /** Distance from the top of the page to the next text baseline. */
  let cursor = 0;

  const draw = (
    p: PDFPage,
    text: string,
    x: number,
    baselineTop: number,
    size: number,
    font: PDFFont,
    color: RGB,
    align?: "right" | "center",
  ) => {
    let px = x;
    const width = font.widthOfTextAtSize(text, size);
    if (align === "right") px = x - width;
    else if (align === "center") px = x - width / 2;
    p.drawText(text, { x: px, y: PAGE_H - baselineTop, size, font, color });
  };

  const wrap = (font: PDFFont, text: string, size: number, maxWidth: number): string[] => {
    const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (words.length === 0) return [];
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(attempt, size) <= maxWidth) {
        line = attempt;
        continue;
      }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          if (chunk && font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const addPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
  };

  const ensureSpace = (needed: number) => {
    if (cursor + needed > PAGE_H - BOTTOM) {
      addPage();
      cursor = 56;
    }
  };

  // ---- Header ----
  const LOGO_SIZE = 90;
  const LOGO_WIDTH = 120;
  const LOGO_TOP = 20;
  if (logo) {
    page.drawImage(logo, { x: M, y: PAGE_H - LOGO_TOP - LOGO_SIZE, width: LOGO_WIDTH, height: LOGO_SIZE });
  }
  const brandX = logo ? M + LOGO_WIDTH + 14 : M;
  // draw(page, safe(BUSINESS.name), brandX, LOGO_TOP + 22, 15, l700, COLORS.brown);
  // draw(page, safe(BUSINESS.slogan), brandX, LOGO_TOP + 38, 9.5, l400, COLORS.muted);
  // Vertically center INVOICE text alongside the logo
  const invoiceMidY = LOGO_TOP + LOGO_SIZE / 2;
  draw(page, "INVOICE", RIGHT, invoiceMidY - 10, 22, l700, COLORS.terra, "right");
  draw(page, safe(invoice.invoiceNumber), RIGHT, invoiceMidY + 12, 10, i600, COLORS.ink, "right");
  draw(page, safe(invoice.dateDisplay), RIGHT, invoiceMidY + 26, 10, i400, COLORS.muted, "right");
  page.drawLine({
    start: { x: M, y: PAGE_H - (LOGO_TOP + LOGO_SIZE + 10) },
    end: { x: RIGHT, y: PAGE_H - (LOGO_TOP + LOGO_SIZE + 10) },
    thickness: 1,
    color: COLORS.brown,
  });

  // ---- Customer ----
  cursor = LOGO_TOP + LOGO_SIZE + 28;
  draw(page, "BILLED TO", M, cursor, 8, i600, COLORS.muted);
  cursor += 16;
  draw(page, safe(invoice.customerName || "—"), M, cursor, 13, i600, COLORS.ink);
  cursor += 17;
  if (invoice.attention) {
    draw(page, safe(`Attn: ${invoice.attention}`), M, cursor, 10, i400, COLORS.muted);
    cursor += 14;
  }
  cursor += 6;

  // ---- Notes ----
  if (invoice.notes) {
    draw(page, "NOTES", M, cursor, 8, i600, COLORS.muted);
    cursor += 16;
    for (const line of wrap(i400, invoice.notes, 10, CONTENT_W)) {
      ensureSpace(13);
      draw(page, safe(line), M, cursor, 10, i400, COLORS.ink);
      cursor += 13;
    }
    cursor += 8;
  }

  // ---- Items table ----
  const drawTableHeader = (y: number): number => {
    page.drawRectangle({
      x: M,
      y: PAGE_H - (y + 11),
      width: CONTENT_W,
      height: 17,
      color: COLORS.cream,
    });
    draw(page, "DESCRIPTION", DESC_X, y + 9, 7.5, i600, COLORS.muted);
    draw(page, "QTY", QTY_X, y + 9, 7.5, i600, COLORS.muted, "center");
    draw(page, "UNIT PRICE", UNIT_X, y + 9, 7.5, i600, COLORS.muted, "right");
    draw(page, "AMOUNT", AMT_X, y + 9, 7.5, i600, COLORS.muted, "right");
    return y + 26;
  };

  cursor = drawTableHeader(cursor);

  for (const item of invoice.items) {
    const lines = wrap(i400, item.description, 10, DESC_W);
    const rowH = Math.max(lines.length * 13, 14) + 10;
    if (cursor + rowH > PAGE_H - BOTTOM) {
      addPage();
      cursor = drawTableHeader(56);
    }
    lines.forEach((line, li) => draw(page, safe(line), DESC_X, cursor + li * 13, 10, i400, COLORS.ink));
    draw(page, safe(formatQuantity(item.quantity)), QTY_X, cursor, 10, i400, COLORS.ink, "center");
    draw(page, safe(formatKobo(item.unitKobo)), UNIT_X, cursor, 10, i400, COLORS.ink, "right");
    draw(page, safe(formatKobo(item.totalKobo)), AMT_X, cursor, 10, i400, COLORS.ink, "right");
    cursor += rowH;
    page.drawLine({
      start: { x: M, y: PAGE_H - cursor - 3 },
      end: { x: RIGHT, y: PAGE_H - cursor - 3 },
      thickness: 0.5,
      color: COLORS.line,
    });
  }

  // ---- Totals ----
  const totalsRows: { label: string; kobo: number }[] = [
    { label: "Subtotal", kobo: invoice.subtotalKobo },
    ...(invoice.delivery ? [{ label: invoice.delivery.label, kobo: invoice.delivery.amountKobo }] : []),
    ...invoice.extras.map((extra) => ({ label: extra.label, kobo: extra.amountKobo })),
  ];
  const totalsHeight = 10 + totalsRows.length * 16 + 32;
  ensureSpace(totalsHeight);

  cursor += 10;
  for (const row of totalsRows) {
    draw(page, safe(row.label), UNIT_X, cursor, 10, i400, COLORS.muted, "right");
    draw(page, safe(formatKobo(row.kobo)), AMT_X, cursor, 10, i400, COLORS.ink, "right");
    cursor += 16;
  }
  cursor += 2;
  // The separator spans from the label column left edge to the right edge.
  page.drawLine({
    start: { x: UNIT_X - 130, y: PAGE_H - cursor },
    end: { x: AMT_X, y: PAGE_H - cursor },
    thickness: 1,
    color: COLORS.brown,
  });
  cursor += 12;
  // Measure the grand total amount first so we can push the label far enough
  // left to never collide, even with very large numbers (₦1,000,000.00+).
  const grandTotalText = safe(formatKobo(invoice.grandTotalKobo));
  const grandTotalW = i700.widthOfTextAtSize(grandTotalText, 12.5);
  const labelRightX = AMT_X - grandTotalW - 12; // at least 12 pt gap
  draw(page, "GRAND TOTAL", labelRightX, cursor, 11, i700, COLORS.ink, "right");
  draw(page, grandTotalText, AMT_X, cursor, 12.5, i700, COLORS.terra, "right");
  cursor += 30;

  // ---- VAT note ----
  const vatNote = "Please note the above payment is without VAT";
  draw(page, vatNote, AMT_X - grandTotalW - 8, cursor, 8.5, i400, COLORS.muted, "right");
  cursor += 20;

  // ---- Payment details ----
  const accounts = BUSINESS.bankAccounts;
  const hasAccountNames = accounts.some((account) => account.accountName.trim() !== "");
  const paymentInnerH = 30 + accounts.length * (hasAccountNames ? 24 : 15) + 4;
  const boxH = paymentInnerH + 12;
  ensureSpace(boxH + 48);

  const boxTop = cursor;
  page.drawRectangle({
    x: M,
    y: PAGE_H - boxTop - boxH,
    width: CONTENT_W,
    height: boxH,
    color: COLORS.cream,
    borderColor: COLORS.line,
    borderWidth: 0.75,
  });
  let by = boxTop + 16;
  draw(page, "PAYMENT DETAILS", M + 14, by, 12, i700, COLORS.muted);
  by += 20;
  draw(page, safe(BUSINESS.name), M + 14, by, 14, l700, COLORS.brown);
  by += 18;
  for (const account of accounts) {
    draw(page, safe(account.bank), M + 14, by, 13, i700, COLORS.ink);
    draw(page, safe(account.accountNumber), M + 14 + 100, by, 13, i700, COLORS.ink);
    if (account.accountName.trim() !== "") {
      draw(page, safe(`Acct name: ${account.accountName}`), M + 14 + 260, by, 11, i600, COLORS.muted);
      by += 24;
    } else {
      by += 18;
    }
  }
  cursor = boxTop + boxH + 14;

  // ---- Closing message ----
  ensureSpace(40);
  const message = safe(BUSINESS.closingMessage);
  const messageW = l700.widthOfTextAtSize(message, 13);
  const centerX = PAGE_W / 2;
  page.drawLine({
    start: { x: centerX - messageW / 2 - 42, y: PAGE_H - cursor + 4 },
    end: { x: centerX - messageW / 2 - 14, y: PAGE_H - cursor + 4 },
    thickness: 1,
    color: COLORS.terra,
  });
  page.drawLine({
    start: { x: centerX + messageW / 2 + 14, y: PAGE_H - cursor + 4 },
    end: { x: centerX + messageW / 2 + 42, y: PAGE_H - cursor + 4 },
    thickness: 1,
    color: COLORS.terra,
  });
  draw(page, message, centerX, cursor, 13, l700, COLORS.brown, "center");

  // ---- Footers ----
  pages.forEach((p, index) => {
    p.drawLine({
      start: { x: M, y: 48 },
      end: { x: RIGHT, y: 48 },
      thickness: 0.5,
      color: COLORS.line,
    });
    draw(p, safe(`${BUSINESS.name} \u00B7 ${BUSINESS.slogan}`), PAGE_W / 2, PAGE_H - 36, 8, i400, COLORS.muted, "center");
    if (pages.length > 1) {
      draw(p, `Page ${index + 1} of ${pages.length}`, RIGHT, PAGE_H - 36, 8, i400, COLORS.muted, "right");
    }
  });

  const bytes = await doc.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}
