import * as pdfjsLib from 'pdfjs-dist';
import { PageThumbnail } from '../types/pdf';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  // Use cdnjs worker matching pdfjs-dist 4.x
  const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

export async function loadPdfJsDocument(bytes: Uint8Array) {
  // Pass a copy of the buffer because pdfjs-dist can detach ArrayBuffers
  const copy = bytes.slice().buffer;
  const loadingTask = pdfjsLib.getDocument({
    data: copy,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

/**
 * Render a single page to a canvas and return dataUrl
 */
export async function renderPageToCanvas(
  pdfJsDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 1.0
): Promise<{ dataUrl: string; width: number; height: number; canvas: HTMLCanvasElement }> {
  const page = await pdfJsDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render PDF page into canvas
  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.85),
    width: viewport.width,
    height: viewport.height,
    canvas,
  };
}

/**
 * Generate thumbnails for all pages in a document
 */
export async function generateAllThumbnails(
  bytes: Uint8Array,
  targetWidth = 260,
  onProgress?: (current: number, total: number) => void
): Promise<PageThumbnail[]> {
  try {
    const pdfJsDoc = await loadPdfJsDocument(bytes);
    const totalPages = pdfJsDoc.numPages;
    const thumbnails: PageThumbnail[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfJsDoc.getPage(i);
      const initialViewport = page.getViewport({ scale: 1.0 });
      const scale = targetWidth / initialViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        thumbnails.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
          width: initialViewport.width,
          height: initialViewport.height,
          aspectRatio: initialViewport.width / initialViewport.height,
        });
      }

      if (onProgress) {
        onProgress(i, totalPages);
      }
    }

    return thumbnails;
  } catch (err) {
    console.error('Failed to generate thumbnails with pdfjs:', err);
    return [];
  }
}

/**
 * Render thumbnail for a single specific page quickly without reloading other pages
 */
export async function renderSingleThumbnail(
  bytes: Uint8Array,
  pageNumber: number,
  targetWidth = 260
): Promise<PageThumbnail | null> {
  try {
    const pdfJsDoc = await loadPdfJsDocument(bytes);
    if (pageNumber < 1 || pageNumber > pdfJsDoc.numPages) return null;

    const page = await pdfJsDoc.getPage(pageNumber);
    const initialViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / initialViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    return {
      pageNumber,
      dataUrl: canvas.toDataURL('image/jpeg', 0.8),
      width: initialViewport.width,
      height: initialViewport.height,
      aspectRatio: initialViewport.width / initialViewport.height,
    };
  } catch (err) {
    console.warn(`Failed to render single thumbnail for page ${pageNumber}:`, err);
    return null;
  }
}

/**
 * Quick incremental update: only re-render the specific changed pages,
 * preserving all unchanged page thumbnails in memory.
 */
export async function updateSpecificThumbnails(
  oldThumbnails: PageThumbnail[],
  newBytes: Uint8Array,
  changedPageNumbers: number[]
): Promise<PageThumbnail[]> {
  try {
    const pdfJsDoc = await loadPdfJsDocument(newBytes);
    const totalPages = pdfJsDoc.numPages;
    const changedSet = new Set(changedPageNumbers);

    const updated: PageThumbnail[] = [...oldThumbnails];

    // Ensure array length matches new totalPages
    while (updated.length < totalPages) {
      changedSet.add(updated.length + 1);
      updated.push({
        pageNumber: updated.length + 1,
        dataUrl: '',
        width: 595,
        height: 842,
        aspectRatio: 595 / 842,
      });
    }
    if (updated.length > totalPages) {
      updated.length = totalPages;
    }

    // Only render the pages in changedSet
    for (const pageNum of changedSet) {
      if (pageNum < 1 || pageNum > totalPages) continue;
      const page = await pdfJsDoc.getPage(pageNum);
      const initialViewport = page.getViewport({ scale: 1.0 });
      const scale = 260 / initialViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        updated[pageNum - 1] = {
          pageNumber: pageNum,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
          width: initialViewport.width,
          height: initialViewport.height,
          aspectRatio: initialViewport.width / initialViewport.height,
        };
      }
    }

    return updated;
  } catch (err) {
    console.warn('Incremental thumbnail update failed, falling back to full refresh:', err);
    return await generateAllThumbnails(newBytes, 260);
  }
}

/**
 * Extract raw text from a page using pdfjs-dist
 */
export async function extractTextFromPage(
  pdfJsDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  const page = await pdfJsDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const textItems = textContent.items as Array<{ str?: string; hasEOL?: boolean }>;
  return textItems
    .map(item => item.str || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface TextItemWithCoords {
  id: string;
  str: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  fontSize: number;
}

/**
 * Extract text items with exact page coordinate percentages
 * for interactive click-to-edit replacement in EditTool
 */
export async function extractPageTextItemsWithCoords(
  bytes: Uint8Array,
  pageNumber: number
): Promise<TextItemWithCoords[]> {
  try {
    const pdfJsDoc = await loadPdfJsDocument(bytes);
    const page = await pdfJsDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items: TextItemWithCoords[] = [];
    let idCounter = 0;

    for (const item of textContent.items as any[]) {
      if (!item.str || item.str.trim() === '') continue;
      // transform: [scaleX, skewY, skewX, scaleY, tx, ty]
      const tx = item.transform[4] || 0;
      const ty = item.transform[5] || 0;
      const fontHeight = Math.abs(item.transform[0] || item.height || 14);
      const width = item.width || (fontHeight * item.str.length * 0.55);

      const xPct = Math.max(0, Math.min(95, (tx / viewport.width) * 100));
      // PDF ty is distance from bottom; in browser CSS top is distance from top
      const topY = viewport.height - ty - fontHeight;
      const yPct = Math.max(0, Math.min(95, (topY / viewport.height) * 100));
      const widthPct = Math.max(3, Math.min(100, (width / viewport.width) * 100));
      const heightPct = Math.max(2, Math.min(30, (fontHeight / viewport.height) * 100));

      items.push({
        id: `pdf-text-${idCounter++}`,
        str: item.str,
        xPct: Math.round(xPct * 10) / 10,
        yPct: Math.round(yPct * 10) / 10,
        widthPct: Math.round(widthPct * 10) / 10,
        heightPct: Math.round(heightPct * 10) / 10,
        fontSize: Math.round(fontHeight),
      });
    }

    return items;
  } catch (err) {
    console.warn('Failed to extract text items with coords:', err);
    return [];
  }
}
