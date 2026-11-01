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
    // Fallback placeholder thumbnails if rendering fails
    return [];
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
