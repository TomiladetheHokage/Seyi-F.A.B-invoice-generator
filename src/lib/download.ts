/**
 * Trigger a browser download of a generated Blob, with a mobile
 * share-sheet fallback so the file can be saved or sent straight
 * to a customer on WhatsApp.
 */
export function deliverFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
