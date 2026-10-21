import { PDFParse } from "pdf-parse";

/** Read the text layer locally; image-only/unsupported PDFs use the remote parser. */
export async function readPdfText(buffer: Buffer): Promise<string | null> {
  const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
  try {
    const result = await parser.getText();
    const text = result.pages.map((page) => page.text).join("\n\n").trim();
    return text.length >= 30 && result.pages.every(page => page.text.trim().length >= 30) ? text : null;
  } catch {
    return null;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

/** Bound page count and raster size before sending scans to vision. Never truncate pages. */
export async function renderPdfPages(buffer: Buffer): Promise<string[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
  try {
    const info = await parser.getInfo();
    if (info.total < 1 || info.total > 3) throw new Error("pdf_page_limit");
    const result = await parser.getScreenshot({ desiredWidth: 1200, imageDataUrl: true, imageBuffer: false });
    const images = result.pages.map(page => page.dataUrl);
    if (images.length !== info.total || images.some(url => !url.startsWith("data:image/png;base64,")))
      throw new Error("unreadable_file");
    if (images.reduce((size, url) => size + url.length, 0) > 12 * 1024 * 1024)
      throw new Error("file_too_large");
    return images;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
