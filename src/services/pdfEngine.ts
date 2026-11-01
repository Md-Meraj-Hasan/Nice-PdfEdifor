import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
} from 'pdf-lib';
import JSZip from 'jszip';
import {
  ConditionFilter,
  CropMargins,
  PageAnnotation,
  PageSizeStandard,
  SplitMode,
} from '../types/pdf';

// Standard paper dimensions in points (72 points = 1 inch)
export const PAGE_SIZES: Record<PageSizeStandard, { width: number; height: number }> = {
  A4: { width: 595.28, height: 841.89 },
  Letter: { width: 612.0, height: 792.0 },
  Legal: { width: 612.0, height: 1008.0 },
  A3: { width: 841.89, height: 1190.55 },
  A5: { width: 419.53, height: 595.28 },
  Custom: { width: 600.0, height: 800.0 },
};

/**
 * Helper to check if a page index matches the condition filter
 */
export function matchesCondition(
  index: number, // 0-based
  pageWidth: number,
  pageHeight: number,
  condition: ConditionFilter,
  selectedIndices?: number[]
): boolean {
  const pageNum = index + 1; // 1-based
  switch (condition) {
    case 'all':
      return true;
    case 'selected':
      return selectedIndices ? selectedIndices.includes(index) : true;
    case 'odd':
      return pageNum % 2 !== 0;
    case 'even':
      return pageNum % 2 === 0;
    case 'portrait':
      return pageHeight >= pageWidth;
    case 'landscape':
      return pageWidth > pageHeight;
    default:
      return true;
  }
}

/**
 * Parse page range string like "1-3, 5, 8-10" into 0-based index array
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const indices = new Set<number>();
  const parts = rangeStr.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(totalPages, parseInt(endStr, 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        indices.add(num - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Merge multiple PDFs into a single PDF
 */
export async function mergePdfDocuments(
  files: { bytes: Uint8Array; range?: string }[]
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const item of files) {
    const srcDoc = await PDFDocument.load(item.bytes);
    const totalPages = srcDoc.getPageCount();
    const indices = item.range ? parsePageRange(item.range, totalPages) : Array.from({ length: totalPages }, (_, i) => i);

    if (indices.length > 0) {
      const copiedPages = await mergedPdf.copyPages(srcDoc, indices);
      copiedPages.forEach(p => mergedPdf.addPage(p));
    }
  }

  return await mergedPdf.save({ useObjectStreams: true });
}

/**
 * Reorder, remove, or duplicate pages in a PDF
 */
export async function reorderPdfPages(
  bytes: Uint8Array,
  pageOrder: number[] // array of 0-based page indices
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();

  const copiedPages = await newDoc.copyPages(srcDoc, pageOrder);
  copiedPages.forEach(page => newDoc.addPage(page));

  return await newDoc.save({ useObjectStreams: true });
}

/**
 * Rotate pages based on condition and angle (90, 180, 270)
 */
export async function rotatePdfPages(
  bytes: Uint8Array,
  angle: number, // 90, 180, 270
  condition: ConditionFilter,
  selectedIndices?: number[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const total = doc.getPageCount();

  for (let i = 0; i < total; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();

    if (matchesCondition(i, width, height, condition, selectedIndices)) {
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + angle + 360) % 360;
      page.setRotation(degrees(newRotation));
    }
  }

  return await doc.save({ useObjectStreams: true });
}

/**
 * Crop PDF pages with margins and conditions
 */
export async function cropPdfPages(
  bytes: Uint8Array,
  margins: CropMargins,
  condition: ConditionFilter,
  selectedIndices?: number[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const total = doc.getPageCount();

  // Convert unit to points (1 mm ≈ 2.83465 pt)
  const toPoints = (val: number, dimension: number): number => {
    if (margins.unit === 'mm') return val * 2.83465;
    if (margins.unit === 'percent') return (val / 100) * dimension;
    return val; // pt
  };

  for (let i = 0; i < total; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();

    if (matchesCondition(i, width, height, condition, selectedIndices)) {
      const topPt = toPoints(margins.top, height);
      const bottomPt = toPoints(margins.bottom, height);
      const leftPt = toPoints(margins.left, width);
      const rightPt = toPoints(margins.right, width);

      const newWidth = Math.max(10, width - leftPt - rightPt);
      const newHeight = Math.max(10, height - topPt - bottomPt);
      const newX = leftPt;
      const newY = bottomPt;

      page.setCropBox(newX, newY, newWidth, newHeight);
      page.setMediaBox(newX, newY, newWidth, newHeight);
    }
  }

  return await doc.save({ useObjectStreams: true });
}

/**
 * Resize PDF pages (e.g. A4, Letter) with scaling / margins
 */
export async function resizePdfPages(
  bytes: Uint8Array,
  targetSize: PageSizeStandard,
  customDimensions?: { width: number; height: number },
  orientation: 'portrait' | 'landscape' | 'original' = 'original',
  scaleMode: 'fit' | 'center' | 'stretch' = 'fit',
  condition: ConditionFilter = 'all',
  selectedIndices?: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();
  const total = srcDoc.getPageCount();

  let targetDim = targetSize === 'Custom' && customDimensions
    ? { ...customDimensions }
    : { ...PAGE_SIZES[targetSize] };

  for (let i = 0; i < total; i++) {
    const srcPage = srcDoc.getPage(i);
    const srcDim = srcPage.getSize();

    const isTarget = matchesCondition(i, srcDim.width, srcDim.height, condition, selectedIndices);

    if (!isTarget) {
      const [copied] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copied);
      continue;
    }

    // Determine target width & height based on orientation
    let w = targetDim.width;
    let h = targetDim.height;
    if (orientation === 'landscape' && w < h) {
      [w, h] = [h, w];
    } else if (orientation === 'portrait' && w > h) {
      [w, h] = [h, w];
    } else if (orientation === 'original') {
      const srcIsLandscape = srcDim.width > srcDim.height;
      if (srcIsLandscape && w < h) [w, h] = [h, w];
      if (!srcIsLandscape && w > h) [w, h] = [h, w];
    }

    const newPage = newDoc.addPage([w, h]);
    const [embedded] = await newDoc.embedPages([srcPage]);

    if (scaleMode === 'fit') {
      const scaleX = w / srcDim.width;
      const scaleY = h / srcDim.height;
      const scale = Math.min(scaleX, scaleY);
      const scaledW = srcDim.width * scale;
      const scaledH = srcDim.height * scale;
      const offsetX = (w - scaledW) / 2;
      const offsetY = (h - scaledH) / 2;

      newPage.drawPage(embedded, {
        x: offsetX,
        y: offsetY,
        width: scaledW,
        height: scaledH,
      });
    } else if (scaleMode === 'stretch') {
      newPage.drawPage(embedded, {
        x: 0,
        y: 0,
        width: w,
        height: h,
      });
    } else {
      // Center without scaling
      const offsetX = (w - srcDim.width) / 2;
      const offsetY = (h - srcDim.height) / 2;
      newPage.drawPage(embedded, {
        x: offsetX,
        y: offsetY,
        width: srcDim.width,
        height: srcDim.height,
      });
    }
  }

  return await newDoc.save({ useObjectStreams: true });
}

/**
 * Split PDF according to various conditions:
 * - single: 1 page per PDF
 * - ranges: custom chunks
 * - everyN: chunk size N
 * - odd-even: two files
 * - byOrientation: two files (portrait vs landscape)
 */
export async function splitPdfDocuments(
  bytes: Uint8Array,
  mode: SplitMode,
  options: {
    customRanges?: string; // e.g. "1-2, 3-5"
    everyN?: number;
  }
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const srcDoc = await PDFDocument.load(bytes);
  const total = srcDoc.getPageCount();
  const results: { name: string; bytes: Uint8Array }[] = [];

  const createSubDoc = async (indices: number[], name: string) => {
    if (indices.length === 0) return;
    const subDoc = await PDFDocument.create();
    const pages = await subDoc.copyPages(srcDoc, indices);
    pages.forEach(p => subDoc.addPage(p));
    const saved = await subDoc.save({ useObjectStreams: true });
    results.push({ name, bytes: saved });
  };

  if (mode === 'single') {
    for (let i = 0; i < total; i++) {
      await createSubDoc([i], `page_${i + 1}.pdf`);
    }
  } else if (mode === 'everyN') {
    const n = Math.max(1, options.everyN || 1);
    let chunk = 1;
    for (let i = 0; i < total; i += n) {
      const chunkIndices: number[] = [];
      const end = Math.min(i + n, total);
      for (let j = i; j < end; j++) {
        chunkIndices.push(j);
      }
      const rangeLabel = i + 1 === end ? `page_${end}` : `pages_${i + 1}-${end}`;
      await createSubDoc(chunkIndices, `part_${chunk}_${rangeLabel}.pdf`);
      chunk++;
    }
  } else if (mode === 'odd-even') {
    const oddIndices: number[] = [];
    const evenIndices: number[] = [];
    for (let i = 0; i < total; i++) {
      if ((i + 1) % 2 !== 0) oddIndices.push(i);
      else evenIndices.push(i);
    }
    if (oddIndices.length) await createSubDoc(oddIndices, `odd_pages.pdf`);
    if (evenIndices.length) await createSubDoc(evenIndices, `even_pages.pdf`);
  } else if (mode === 'byOrientation') {
    const portraitIndices: number[] = [];
    const landscapeIndices: number[] = [];
    for (let i = 0; i < total; i++) {
      const page = srcDoc.getPage(i);
      const { width, height } = page.getSize();
      if (height >= width) portraitIndices.push(i);
      else landscapeIndices.push(i);
    }
    if (portraitIndices.length) await createSubDoc(portraitIndices, `portrait_pages.pdf`);
    if (landscapeIndices.length) await createSubDoc(landscapeIndices, `landscape_pages.pdf`);
  } else if (mode === 'ranges' && options.customRanges) {
    const chunks = options.customRanges.split(',').map(s => s.trim()).filter(Boolean);
    let index = 1;
    for (const chunk of chunks) {
      const pageIndices = parsePageRange(chunk, total);
      if (pageIndices.length > 0) {
        await createSubDoc(pageIndices, `split_${index}_range_${chunk.replace(/\s+/g, '')}.pdf`);
        index++;
      }
    }
  }

  return results;
}

/**
 * Helper to hex color to rgb [0..1]
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Bake annotations (editable text, whiteout boxes, signatures, stamps, highlights)
 * onto the PDF pages permanently.
 */
export async function bakeAnnotationsIntoPdf(
  bytes: Uint8Array,
  annotationsByPage: Record<number, PageAnnotation[]> // 1-based page numbers
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const fontHelvetica = await doc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const total = doc.getPageCount();

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const annotations = annotationsByPage[pageNum];
    if (!annotations || annotations.length === 0) continue;

    const page = doc.getPage(pageNum - 1);
    const { width, height } = page.getSize();

    for (const ann of annotations) {
      // In PDF coordinate system, (0,0) is bottom-left
      // Convert browser coordinates (top-left) to PDF (bottom-left)
      const pdfX = (ann.x / 100) * width;
      const pdfW = (ann.width / 100) * width;
      const pdfH = (ann.height / 100) * height;
      const pdfY = height - (ann.y / 100) * height - pdfH;

      if (ann.type === 'whiteout') {
        const c = hexToRgb(ann.fillColor || '#ffffff');
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          color: rgb(c.r, c.g, c.b),
        });
      } else if (ann.type === 'text') {
        // Optional background color (e.g. whiteout + text)
        if (ann.bgColor) {
          const bg = hexToRgb(ann.bgColor);
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            color: rgb(bg.r, bg.g, bg.b),
          });
        }

        const tc = hexToRgb(ann.color || '#000000');
        const font = ann.isBold ? fontHelveticaBold : fontHelvetica;
        const fontSize = Math.max(8, ann.fontSize || 14);

        // Draw text lines
        const lines = ann.text.split('\n');
        lines.forEach((line, lineIdx) => {
          page.drawText(line, {
            x: pdfX + 4,
            y: pdfY + pdfH - (lineIdx + 1) * (fontSize * 1.2),
            size: fontSize,
            font,
            color: rgb(tc.r, tc.g, tc.b),
          });
        });
      } else if (ann.type === 'highlight') {
        const hc = hexToRgb(ann.color || '#fef08a');
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          color: rgb(hc.r, hc.g, hc.b),
          opacity: ann.opacity ?? 0.4,
        });
      } else if (ann.type === 'stamp') {
        const sc = hexToRgb(ann.color || '#ef4444');
        // Draw frame box
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          borderWidth: 2,
          borderColor: rgb(sc.r, sc.g, sc.b),
          opacity: 0.9,
        });
        // Draw stamp text in center
        const stampSize = Math.max(10, Math.min(pdfH * 0.45, 24));
        page.drawText(ann.text.toUpperCase(), {
          x: pdfX + 8,
          y: pdfY + pdfH / 2 - stampSize / 2,
          size: stampSize,
          font: fontHelveticaBold,
          color: rgb(sc.r, sc.g, sc.b),
          rotate: degrees(ann.angle || 0),
        });
      } else if (ann.type === 'shape') {
        const stroke = hexToRgb(ann.color || '#000000');
        const fill = ann.fillColor ? hexToRgb(ann.fillColor) : undefined;
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          borderColor: rgb(stroke.r, stroke.g, stroke.b),
          borderWidth: ann.strokeWidth || 2,
          color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
        });
      } else if (ann.type === 'signature' && ann.points && ann.points.length > 0) {
        // Draw signature paths
        const sc = hexToRgb(ann.color || '#1e3a8a');
        for (const stroke of ann.points) {
          if (stroke.length < 2) continue;
          for (let p = 0; p < stroke.length - 1; p++) {
            const p1 = stroke[p];
            const p2 = stroke[p + 1];
            const x1 = pdfX + (p1.x / 100) * pdfW;
            const y1 = pdfY + pdfH - (p1.y / 100) * pdfH;
            const x2 = pdfX + (p2.x / 100) * pdfW;
            const y2 = pdfY + pdfH - (p2.y / 100) * pdfH;

            page.drawLine({
              start: { x: x1, y: y1 },
              end: { x: x2, y: y2 },
              thickness: ann.lineWidth || 2,
              color: rgb(sc.r, sc.g, sc.b),
            });
          }
        }
      }
    }
  }

  return await doc.save({ useObjectStreams: true });
}

/**
 * Pack multiple PDF files into a single ZIP blob for download
 */
export async function createZipFromPdfList(
  files: { name: string; bytes: Uint8Array }[]
): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.bytes);
  }
  return await zip.generateAsync({ type: 'blob' });
}

export interface EncryptionStatus {
  encrypted: boolean;
  algorithm?: string;
  version?: number;
  revision?: number;
  keyLength?: number;
}

export interface EncryptOptions {
  ownerPassword?: string;
  algorithm?: 'AES-256' | 'RC4';
  allowPrinting?: boolean;
  allowModifying?: boolean;
  allowCopying?: boolean;
  allowAnnotating?: boolean;
}

/**
 * Check if a PDF document is password-protected/encrypted
 */
export async function checkPdfEncryption(bytes: Uint8Array): Promise<EncryptionStatus> {
  try {
    const { isEncrypted } = await import('@pdfsmaller/pdf-decrypt');
    const result = await isEncrypted(bytes);
    return {
      encrypted: Boolean(result?.encrypted),
      algorithm: result?.algorithm,
      version: result?.version,
      revision: result?.revision,
      keyLength: result?.keyLength,
    };
  } catch (err) {
    console.warn('Error checking encryption:', err);
    return { encrypted: false };
  }
}

/**
 * Encrypt PDF with password using pdf-lib and standard AES-256 or RC4 security handler
 */
export async function encryptPdfDocument(
  bytes: Uint8Array,
  userPassword: string,
  options?: EncryptOptions
): Promise<Uint8Array> {
  // First ensure PDF is clean and loaded properly with pdf-lib
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const cleanBytes = await srcDoc.save({ useObjectStreams: false });

  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  const encrypted = await encryptPDF(cleanBytes, userPassword, {
    ownerPassword: options?.ownerPassword || userPassword,
    algorithm: options?.algorithm || 'AES-256',
    allowPrinting: options?.allowPrinting ?? true,
    allowModifying: options?.allowModifying ?? false,
    allowCopying: options?.allowCopying ?? true,
    allowAnnotating: options?.allowAnnotating ?? true,
  });

  return new Uint8Array(encrypted);
}

/**
 * Decrypt PDF and remove password protection completely using pdf-lib
 */
export async function decryptPdfDocument(
  bytes: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const { decryptPDF } = await import('@pdfsmaller/pdf-decrypt');
  const decryptedBytes = await decryptPDF(bytes, password);

  // Validate the decrypted bytes load cleanly with pdf-lib without encryption
  const unlockedDoc = await PDFDocument.load(decryptedBytes, { ignoreEncryption: false });
  return await unlockedDoc.save({ useObjectStreams: true });
}

