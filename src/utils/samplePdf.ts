import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generate a clean 3-page sample PDF with text, tables, and shapes
 * for testing merge, split, rotate, crop, ocr, and edit tools offline.
 */
export async function createSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontHelvetica = await doc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // --- Page 1: Welcome & Overview ---
  const page1 = doc.addPage([595.28, 841.89]); // A4
  const { width: p1W, height: p1H } = page1.getSize();

  // Header Banner
  page1.drawRectangle({
    x: 0,
    y: p1H - 120,
    width: p1W,
    height: 120,
    color: rgb(0.14, 0.38, 0.92), // Blue
  });

  page1.drawText('PDFMaster Pro Sample Document', {
    x: 40,
    y: p1H - 65,
    size: 24,
    font: fontHelveticaBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Offline PDF Editor & Android APK Suite', {
    x: 40,
    y: p1H - 95,
    size: 14,
    font: fontHelvetica,
    color: rgb(0.85, 0.92, 1),
  });

  // Body content
  page1.drawText('Page 1 of 3 - Document Overview', {
    x: 40,
    y: p1H - 160,
    size: 16,
    font: fontHelveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  const lines = [
    'This sample document is created for testing offline tools:',
    '1. Organize Pages: Drag and drop to reorder, cut/copy/paste, or delete.',
    '2. Crop with Conditions: Crop margins or visual area on odd/even pages.',
    '3. Rotate & Resize: Rotate 90 deg or convert to Letter / Legal / A3.',
    '4. Split Pages: Test splitting by custom range (e.g. 1-2, 3) or single pages.',
    '5. OCR Support: Extract this exact text offline with the OCR tool.',
    '6. Text Editable: Whiteout this text or add signatures, stamps, and new notes.',
  ];

  lines.forEach((line, idx) => {
    page1.drawText(line, {
      x: 40,
      y: p1H - 200 - idx * 26,
      size: 12,
      font: fontHelvetica,
      color: rgb(0.2, 0.25, 0.35),
    });
  });

  // Sample Box / Stamp area
  page1.drawRectangle({
    x: 40,
    y: 120,
    width: 220,
    height: 90,
    borderColor: rgb(0.14, 0.38, 0.92),
    borderWidth: 2,
    color: rgb(0.95, 0.97, 1),
  });

  page1.drawText('OFFLINE READY', {
    x: 60,
    y: 165,
    size: 18,
    font: fontHelveticaBold,
    color: rgb(0.14, 0.38, 0.92),
  });

  page1.drawText('Zero server upload. 100% Client-side.', {
    x: 55,
    y: 140,
    size: 10,
    font: fontHelvetica,
    color: rgb(0.4, 0.45, 0.55),
  });

  // Footer
  page1.drawText('Page 1 / 3 - Generated in-browser', {
    x: p1W / 2 - 80,
    y: 40,
    size: 10,
    font: fontHelvetica,
    color: rgb(0.5, 0.55, 0.65),
  });

  // --- Page 2: Invoice / Data Table ---
  const page2 = doc.addPage([595.28, 841.89]);
  const { width: p2W, height: p2H } = page2.getSize();

  page2.drawText('Page 2 of 3 - Sample Invoice / Data Sheet', {
    x: 40,
    y: p2H - 60,
    size: 18,
    font: fontHelveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  page2.drawText('Invoice #INV-2026-9041 | Date: October 31, 2026', {
    x: 40,
    y: p2H - 85,
    size: 11,
    font: fontHelvetica,
    color: rgb(0.4, 0.45, 0.55),
  });

  // Table header
  page2.drawRectangle({
    x: 40,
    y: p2H - 130,
    width: p2W - 80,
    height: 30,
    color: rgb(0.92, 0.94, 0.98),
  });

  page2.drawText('Description', { x: 55, y: p2H - 120, size: 11, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.35) });
  page2.drawText('Qty', { x: 300, y: p2H - 120, size: 11, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.35) });
  page2.drawText('Rate', { x: 370, y: p2H - 120, size: 11, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.35) });
  page2.drawText('Amount', { x: 460, y: p2H - 120, size: 11, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.35) });

  const rows = [
    { desc: 'Android Native APK Build Script', qty: '1', rate: '$0.00', total: '$0.00' },
    { desc: 'Offline PDF Page Organizer & Splitter', qty: '1', rate: '$0.00', total: '$0.00' },
    { desc: 'Client-side OCR Text Extractor', qty: '1', rate: '$0.00', total: '$0.00' },
    { desc: 'Visual Annotation & Whiteout Redactor', qty: '1', rate: '$0.00', total: '$0.00' },
  ];

  rows.forEach((r, idx) => {
    const y = p2H - 165 - idx * 30;
    page2.drawText(r.desc, { x: 55, y, size: 11, font: fontHelvetica, color: rgb(0.2, 0.25, 0.35) });
    page2.drawText(r.qty, { x: 305, y, size: 11, font: fontHelvetica, color: rgb(0.2, 0.25, 0.35) });
    page2.drawText(r.rate, { x: 375, y, size: 11, font: fontHelvetica, color: rgb(0.2, 0.25, 0.35) });
    page2.drawText(r.total, { x: 465, y, size: 11, font: fontHelveticaBold, color: rgb(0.14, 0.38, 0.92) });
  });

  page2.drawText('Page 2 / 3', {
    x: p2W / 2 - 30,
    y: 40,
    size: 10,
    font: fontHelvetica,
    color: rgb(0.5, 0.55, 0.65),
  });

  // --- Page 3: Certificate / Signature Area ---
  const page3 = doc.addPage([595.28, 841.89]);
  const { width: p3W, height: p3H } = page3.getSize();

  page3.drawRectangle({
    x: 30,
    y: 30,
    width: p3W - 60,
    height: p3H - 60,
    borderColor: rgb(0.8, 0.7, 0.3),
    borderWidth: 3,
  });

  page3.drawText('Page 3 of 3 - Verification & Signature', {
    x: p3W / 2 - 170,
    y: p3H - 120,
    size: 20,
    font: fontHelveticaBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  page3.drawText('Test drawing your digital signature or stamp on this page using the Edit tool!', {
    x: p3W / 2 - 200,
    y: p3H - 170,
    size: 12,
    font: fontHelvetica,
    color: rgb(0.35, 0.4, 0.5),
  });

  // Signature box placeholder
  page3.drawRectangle({
    x: p3W / 2 - 150,
    y: 200,
    width: 300,
    height: 100,
    borderColor: rgb(0.6, 0.65, 0.75),
    borderWidth: 1,
    borderDashArray: [4, 4],
  });

  page3.drawText('Sign Here (Use Edit & Text Tool)', {
    x: p3W / 2 - 95,
    y: 180,
    size: 11,
    font: fontHelvetica,
    color: rgb(0.5, 0.55, 0.65),
  });

  page3.drawText('Page 3 / 3', {
    x: p3W / 2 - 30,
    y: 50,
    size: 10,
    font: fontHelvetica,
    color: rgb(0.5, 0.55, 0.65),
  });

  return await doc.save();
}
