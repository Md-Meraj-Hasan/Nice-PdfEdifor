import React, { useState } from 'react';
import {
  Crop,
  Sparkles,
  Layers,
  CheckCircle2,
  Sliders,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ConditionFilter, CropMargins, PdfDocument } from '../../types/pdf';
import { cropPdfPages, parsePageRange } from '../../services/pdfEngine';
import { ZoomableContainer } from '../ZoomableContainer';

interface CropToolProps {
  document: PdfDocument;
  initialPage?: number;
  onUpdateDocumentBytes: (
    bytes: Uint8Array,
    message?: string,
    skipHistoryPush?: boolean,
    changedPageNumbers?: number[],
    updatedThumbnailsDirect?: any[]
  ) => Promise<void>;
}

export const CropTool: React.FC<CropToolProps> = ({
  document,
  initialPage,
  onUpdateDocumentBytes,
}) => {
  const [condition, setCondition] = useState<ConditionFilter>(initialPage ? 'selected' : 'all');
  const [selectedPagesStr, setSelectedPagesStr] = useState<string>(initialPage ? String(initialPage) : '1');
  const [previewPage, setPreviewPage] = useState<number>(initialPage || 1);

  React.useEffect(() => {
    if (initialPage && initialPage >= 1 && initialPage <= document.pageCount) {
      setCondition('selected');
      setSelectedPagesStr(String(initialPage));
      setPreviewPage(initialPage);
    }
  }, [initialPage, document.pageCount]);
  const [margins, setMargins] = useState<CropMargins>({
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
    unit: 'mm',
  });
  const [isApplying, setIsApplying] = useState(false);

  const presets = [
    { label: '5 mm all around', top: 5, bottom: 5, left: 5, right: 5, unit: 'mm' as const },
    { label: '10 mm standard', top: 10, bottom: 10, left: 10, right: 10, unit: 'mm' as const },
    { label: '20 mm Header trim', top: 20, bottom: 5, left: 5, right: 5, unit: 'mm' as const },
    { label: '15 mm Footer trim', top: 5, bottom: 15, left: 5, right: 5, unit: 'mm' as const },
    { label: '5% Margin trim', top: 5, bottom: 5, left: 5, right: 5, unit: 'percent' as const },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setMargins({
      top: p.top,
      bottom: p.bottom,
      left: p.left,
      right: p.right,
      unit: p.unit,
    });
  };

  const handleApplyCrop = async () => {
    try {
      setIsApplying(true);
      const selectedIndices = parsePageRange(selectedPagesStr, document.pageCount);
      const newBytes = await cropPdfPages(
        document.bytes,
        margins,
        condition,
        selectedIndices
      );
      const changedPageNums = condition === 'selected' ? selectedIndices.map(i => i + 1) : undefined;
      await onUpdateDocumentBytes(newBytes, 'Pages cropped successfully', false, changedPageNums);
    } catch (err) {
      console.error(err);
      alert('Failed to crop PDF pages');
    } finally {
      setIsApplying(false);
    }
  };

  // Calculate visual crop overlay percentages for preview
  const getCropOverlayPercent = () => {
    if (margins.unit === 'percent') {
      return {
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right,
      };
    }
    // approximate percentage for mm (assuming A4 approx 210mm x 297mm)
    if (margins.unit === 'mm') {
      return {
        top: Math.min(45, (margins.top / 297) * 100),
        bottom: Math.min(45, (margins.bottom / 297) * 100),
        left: Math.min(45, (margins.left / 210) * 100),
        right: Math.min(45, (margins.right / 210) * 100),
      };
    }
    // pt (approx 595 x 842 pt)
    return {
      top: Math.min(45, (margins.top / 842) * 100),
      bottom: Math.min(45, (margins.bottom / 842) * 100),
      left: Math.min(45, (margins.left / 595) * 100),
      right: Math.min(45, (margins.right / 595) * 100),
    };
  };

  const overlay = getCropOverlayPercent();
  const currentThumb = document.thumbnails[previewPage - 1];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Crop className="w-5 h-5 text-emerald-400" />
          Crop PDF Pages with Any Condition
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Trim margins or white borders. Apply crop rules to all pages, odd/even pages, or specific page selections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Condition Selector */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <label className="block text-xs font-bold text-slate-200">
              Apply Crop Condition:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All Pages' },
                { id: 'selected', label: 'Selected Pages' },
                { id: 'odd', label: 'Odd Pages Only' },
                { id: 'even', label: 'Even Pages Only' },
                { id: 'landscape', label: 'Landscape Only' },
                { id: 'portrait', label: 'Portrait Only' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setCondition(opt.id as ConditionFilter)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                    condition === opt.id
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {condition === 'selected' && (
              <div className="pt-2">
                <label className="block text-xs text-slate-300 mb-1">
                  Page Numbers (e.g. 1, 3-5):
                </label>
                <input
                  type="text"
                  value={selectedPagesStr}
                  onChange={e => setSelectedPagesStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Margins Inputs */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Crop Margins:
              </label>

              {/* Unit Switcher */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                {(['mm', 'pt', 'percent'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => setMargins(m => ({ ...m, unit: u }))}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                      margins.unit === u ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    {u === 'percent' ? '%' : u}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs: Top, Bottom, Left, Right */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Top ({margins.unit}):</label>
                <input
                  type="number"
                  min="0"
                  value={margins.top}
                  onChange={e => setMargins(m => ({ ...m, top: Math.max(0, parseFloat(e.target.value) || 0) }))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bottom ({margins.unit}):</label>
                <input
                  type="number"
                  min="0"
                  value={margins.bottom}
                  onChange={e => setMargins(m => ({ ...m, bottom: Math.max(0, parseFloat(e.target.value) || 0) }))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Left ({margins.unit}):</label>
                <input
                  type="number"
                  min="0"
                  value={margins.left}
                  onChange={e => setMargins(m => ({ ...m, left: Math.max(0, parseFloat(e.target.value) || 0) }))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Right ({margins.unit}):</label>
                <input
                  type="number"
                  min="0"
                  value={margins.right}
                  onChange={e => setMargins(m => ({ ...m, right: Math.max(0, parseFloat(e.target.value) || 0) }))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">Quick Presets:</span>
              <div className="flex flex-wrap gap-2">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-900 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleApplyCrop}
            disabled={isApplying}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 active:scale-98 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isApplying ? 'Applying Crop...' : 'Apply Crop Condition to PDF'}
          </button>
        </div>

        {/* Live Preview Column (5 cols) */}
        <div className="lg:col-span-5 bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-300">
            <span className="font-semibold">Live Crop Preview</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                disabled={previewPage <= 1}
                className="p-1 rounded bg-slate-700 text-slate-300 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>Page {previewPage} / {document.pageCount}</span>
              <button
                onClick={() => setPreviewPage(p => Math.min(document.pageCount, p + 1))}
                disabled={previewPage >= document.pageCount}
                className="p-1 rounded bg-slate-700 text-slate-300 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Thumbnail preview with Crop Box Overlay */}
          <div className="relative aspect-[3/4] w-full max-w-[280px] bg-white rounded-lg shadow-md overflow-hidden flex items-center justify-center my-auto">
            {currentThumb?.dataUrl ? (
              <img
                src={currentThumb.dataUrl}
                alt={`Page ${previewPage}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-slate-400 text-xs">Preview unavailable</div>
            )}

            {/* Red semi-transparent cut boundary */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `inset 0 0 0 9999px rgba(239, 68, 68, 0.28)`,
                clipPath: `polygon(
                  0% 0%, 0% 100%, 
                  ${overlay.left}% 100%, 
                  ${overlay.left}% ${overlay.top}%, 
                  ${100 - overlay.right}% ${overlay.top}%, 
                  ${100 - overlay.right}% ${100 - overlay.bottom}%, 
                  ${overlay.left}% ${100 - overlay.bottom}%, 
                  ${overlay.left}% 100%, 
                  100% 100%, 100% 0%
                )`,
              }}
            />

            {/* Green border around the kept area */}
            <div
              className="absolute pointer-events-none border-2 border-dashed border-emerald-500 bg-emerald-500/10"
              style={{
                top: `${overlay.top}%`,
                bottom: `${overlay.bottom}%`,
                left: `${overlay.left}%`,
                right: `${overlay.right}%`,
              }}
            >
              <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">
                Kept Area
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-3">
            Red area will be trimmed off. Green box is retained.
          </p>
        </div>
      </div>
    </div>
  );
};
