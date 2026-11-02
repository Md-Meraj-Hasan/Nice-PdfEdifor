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
  color: string;
  bgColor: string;
  isBold: boolean;
  isItalic: boolean;
  fontFamily: 'sans-serif' | 'serif' | 'monospace';
  fontName?: string;
  baselineYPct: number;
}

/**
 * Helper to sample the background color from a 2D canvas around a text bounding box.
 */
function sampleBgColorFromCanvas(
  ctx: CanvasRenderingContext2D | null,
  cx: number,
  cy: number,
  cw: number,
  ch: number,
  w: number,
  h: number
): string {
  if (!ctx || w <= 0 || h <= 0) return '#ffffff';
  // Sample 8 points on perimeter and just outside the box
  const points = [
    [cx + 1, cy + 1],
    [cx + cw - 1, cy + 1],
    [cx + 1, cy + ch - 1],
    [cx + cw - 1, cy + ch - 1],
    [cx + cw / 2, Math.max(0, cy - 2)],
    [cx + cw / 2, Math.min(h - 1, cy + ch + 2)],
    [Math.max(0, cx - 2), cy + ch / 2],
    [Math.min(w - 1, cx + cw + 2), cy + ch / 2],
  ];

  const counts: Record<string, number> = {};
  for (const [px, py] of points) {
    const x = Math.max(0, Math.min(w - 1, Math.round(px)));
    const y = Math.max(0, Math.min(h - 1, Math.round(py)));
    try {
      const p = ctx.getImageData(x, y, 1, 1).data;
      if (p[3] === 0) continue; // transparent
      const hex = '#' + [p[0], p[1], p[2]].map(c => c.toString(16).padStart(2, '0')).join('');
      counts[hex] = (counts[hex] || 0) + 1;
    } catch {
      // Ignore
    }
  }

  let best = '#ffffff';
  let max = -1;
  for (const [col, cnt] of Object.entries(counts)) {
    if (cnt > max) {
      max = cnt;
      best = col;
    }
  }
  return best;
}

/**
 * Extract text items with exact page coordinates, font style, text color,
 * background color, and baseline for high-fidelity click-to-edit replacement in EditTool.
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
    const ops = await page.getOperatorList();

    // Render page to offscreen canvas to sample true pixel background colors
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    if (typeof document !== 'undefined') {
      try {
        canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        }
      } catch (renderErr) {
        console.warn('Canvas rendering for bg sampling skipped:', renderErr);
      }
    }

    // Parse operator list to extract sequential color and font states for showText operations
    let currentColor = '#000000';
    let currentFontId = '';
    let currentFontSize = 14;
    const opTextStates: { color: string; fontId: string; fontSize: number }[] = [];

    const OPS = (pdfjsLib as any).OPS || {};
    const setFillRGB = OPS.setFillRGBColor ?? 21;
    const setFillGray = OPS.setFillGray ?? 22;
    const setFillCMYK = OPS.setFillCMYKColor ?? 23;
    const setFontOp = OPS.setFont ?? 25;
    const showTextOp = OPS.showText ?? 28;
    const showSpacedOp = OPS.showSpacedText ?? 29;

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];

      if (fn === setFillRGB || fn === setFillGray || fn === setFillCMYK) {
        if (typeof args[0] === 'string' && args[0].startsWith('#')) {
          currentColor = args[0];
        } else if (args.length === 1 && typeof args[0] === 'number') {
          const g = Math.round(args[0] * 255).toString(16).padStart(2, '0');
          currentColor = `#${g}${g}${g}`;
        } else if (args.length === 3) {
          currentColor = '#' + args.map((v: number) => Math.round(v <= 1 ? v * 255 : v).toString(16).padStart(2, '0')).join('');
        } else if (args.length === 4) {
          const [c, m, y, k] = args;
          const r = Math.round(255 * (1 - c) * (1 - k));
          const g = Math.round(255 * (1 - m) * (1 - k));
          const b = Math.round(255 * (1 - y) * (1 - k));
          currentColor = '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
        }
      } else if (fn === setFontOp) {
        currentFontId = args[0] || '';
        currentFontSize = args[1] || currentFontSize;
      } else if (fn === showTextOp || fn === showSpacedOp) {
        opTextStates.push({
          color: currentColor,
          fontId: currentFontId,
          fontSize: currentFontSize,
        });
      }
    }

    const items: TextItemWithCoords[] = [];
    let idCounter = 0;
    let opIndex = 0;

    for (const item of textContent.items as any[]) {
      if (!item.str || item.str.trim() === '') continue;

      const matchedOp = opTextStates[opIndex] || null;
      opIndex++;

      // In PDF.js transform: [scaleX, skewY, skewX, scaleY, tx, ty]
      const tx = item.transform[4] || 0;
      const ty = item.transform[5] || 0; // Baseline in PDF coordinates
      const fontHeight = Math.abs(
        matchedOp?.fontSize ||
        Math.hypot(item.transform[0] || 0, item.transform[1] || 0) ||
        item.height ||
        14
      );
      const width = item.width || (fontHeight * item.str.length * 0.55);

      // Glyph envelope relative to baseline:
      // Descent is approx -0.28 * fontHeight, ascent is approx +0.95 * fontHeight
      const coverBottom = ty - (fontHeight * 0.28);
      const coverTop = ty + (fontHeight * 0.95);
      const coverHeight = coverTop - coverBottom;

      // Convert to browser coordinates (top-left is 0,0)
      const topY = viewport.height - coverTop;
      const xPct = Math.max(0, Math.min(99, (tx / viewport.width) * 100));
      const yPct = Math.max(0, Math.min(99, (topY / viewport.height) * 100));
      const widthPct = Math.max(0.5, Math.min(100, (width / viewport.width) * 100));
      const heightPct = Math.max(0.5, Math.min(50, (coverHeight / viewport.height) * 100));
      const baselineYPct = Math.max(0, Math.min(100, ((viewport.height - ty) / viewport.height) * 100));

      // Font style & family detection
      const fontId = matchedOp?.fontId || item.fontName || '';
      let isBold = false;
      let isItalic = false;
      let fontFamily: 'sans-serif' | 'serif' | 'monospace' = 'sans-serif';
      let fontName = 'Helvetica';

      let fontObj: any = null;
      try {
        if ((page as any).commonObjs?.has?.(fontId)) {
          fontObj = (page as any).commonObjs.get(fontId);
        }
      } catch {}

      const styleInfo = textContent.styles?.[fontId];
      const rawName = (fontObj?.loadedName || fontObj?.name || styleInfo?.fontFamily || '').toLowerCase();

      if (fontObj?.bold === true || /bold|black|heavy|bld|demi|w[789]/i.test(rawName)) {
        isBold = true;
      }
      if (fontObj?.italic === true || /italic|oblique|slanted/i.test(rawName)) {
        isItalic = true;
      }

      if (
        fontObj?.serif === true ||
        styleInfo?.fontFamily === 'serif' ||
        /times|roman|georgia|garamond|baskerville|serif|cambria/i.test(rawName)
      ) {
        fontFamily = 'serif';
        fontName = 'Times';
      } else if (
        fontObj?.monospace === true ||
        styleInfo?.fontFamily === 'monospace' ||
        /courier|mono|consolas|menlo|monaco/i.test(rawName)
      ) {
        fontFamily = 'monospace';
        fontName = 'Courier';
      } else {
        fontFamily = 'sans-serif';
        fontName = 'Helvetica';
      }

      // Sample true background color from rendered canvas
      const cx = (xPct / 100) * (canvas?.width || viewport.width);
      const cy = (yPct / 100) * (canvas?.height || viewport.height);
      const cw = (widthPct / 100) * (canvas?.width || viewport.width);
      const ch = (heightPct / 100) * (canvas?.height || viewport.height);
      const sampledBgColor = sampleBgColorFromCanvas(
        ctx,
        cx,
        cy,
        cw,
        ch,
        canvas?.width || viewport.width,
        canvas?.height || viewport.height
      );

      const resolvedColor = matchedOp?.color || '#000000';

      items.push({
        id: `pdf-text-${idCounter++}`,
        str: item.str,
        xPct: Math.round(xPct * 100) / 100,
        yPct: Math.round(yPct * 100) / 100,
        widthPct: Math.round(widthPct * 100) / 100,
        heightPct: Math.round(heightPct * 100) / 100,
        fontSize: Math.round(fontHeight),
        color: resolvedColor,
        bgColor: sampledBgColor,
        isBold,
        isItalic,
        fontFamily,
        fontName,
        baselineYPct: Math.round(baselineYPct * 100) / 100,
      });
    }

    return items;
  } catch (err) {
    console.warn('Failed to extract text items with coords:', err);
    return [];
  }
}
