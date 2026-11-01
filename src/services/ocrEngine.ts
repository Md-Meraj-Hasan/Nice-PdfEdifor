import { createWorker } from 'tesseract.js';
import { loadPdfJsDocument, renderPageToCanvas, extractTextFromPage } from './pdfRenderer';

export interface OcrProgress {
  status: string;
  progress: number; // 0 to 100
  page: number;
  totalPages: number;
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
}

/**
 * Perform offline client-side OCR on a PDF document
 */
export async function performPdfOcr(
  bytes: Uint8Array,
  pageNumbers: number[], // 1-based page numbers
  lang = 'eng',
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrPageResult[]> {
  const results: OcrPageResult[] = [];
  const pdfJsDoc = await loadPdfJsDocument(bytes);
  const totalPages = pageNumbers.length;

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    onProgress?.({
      status: 'Initializing OCR engine...',
      progress: 5,
      page: 1,
      totalPages,
    });

    // Try initializing tesseract.js worker
    try {
      worker = await createWorker(lang, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            onProgress?.({
              status: `Recognizing text: ${pct}%`,
              progress: Math.min(95, 20 + pct * 0.7),
              page: results.length + 1,
              totalPages,
            });
          }
        },
      });
    } catch (e) {
      console.warn('Tesseract worker init failed, falling back to embedded PDF text:', e);
    }

    for (let i = 0; i < pageNumbers.length; i++) {
      const pageNum = pageNumbers[i];
      onProgress?.({
        status: `Processing page ${pageNum}...`,
        progress: Math.round(((i + 0.2) / totalPages) * 100),
        page: i + 1,
        totalPages,
      });

      // Step 1: Check embedded digital text first
      const digitalText = await extractTextFromPage(pdfJsDoc, pageNum);

      // If page has sufficient digital text or worker is not available, use it!
      if (digitalText && digitalText.length > 50 && !worker) {
        results.push({
          pageNumber: pageNum,
          text: digitalText,
          confidence: 99,
        });
        continue;
      }

      // Step 2: Render high-res canvas for OCR
      const { canvas } = await renderPageToCanvas(pdfJsDoc, pageNum, 2.0);

      if (worker) {
        const ret = await worker.recognize(canvas);
        const recognizedText = ret.data.text.trim();

        // If OCR returned good text, use it; otherwise fallback to digital text if available
        const finalText = recognizedText.length > 10 ? recognizedText : (digitalText || recognizedText);

        results.push({
          pageNumber: pageNum,
          text: finalText,
          confidence: Math.round(ret.data.confidence),
        });
      } else {
        // Fallback if worker not available
        results.push({
          pageNumber: pageNum,
          text: digitalText || '(No digital text layer found on this page. Scanned image OCR requires internet on first run to cache OCR language model.)',
          confidence: digitalText ? 90 : 0,
        });
      }

      onProgress?.({
        status: `Completed page ${pageNum}`,
        progress: Math.round(((i + 1) / totalPages) * 100),
        page: i + 1,
        totalPages,
      });
    }
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore cleanup error
      }
    }
  }

  return results;
}
