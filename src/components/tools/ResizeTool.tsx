import React, { useState } from 'react';
import {
  Maximize2,
  Sparkles,
  Layers,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { ConditionFilter, PageSizeStandard, PdfDocument } from '../../types/pdf';
import { resizePdfPages, parsePageRange, PAGE_SIZES } from '../../services/pdfEngine';

interface ResizeToolProps {
  document: PdfDocument;
  onUpdateDocumentBytes: (bytes: Uint8Array, message?: string) => Promise<void>;
}

export const ResizeTool: React.FC<ResizeToolProps> = ({
  document,
  onUpdateDocumentBytes,
}) => {
  const [targetSize, setTargetSize] = useState<PageSizeStandard>('A4');
  const [customWidth, setCustomWidth] = useState<number>(600);
  const [customHeight, setCustomHeight] = useState<number>(800);
  const [orientation, setOrientation] = useState<'original' | 'portrait' | 'landscape'>('portrait');
  const [scaleMode, setScaleMode] = useState<'fit' | 'center' | 'stretch'>('fit');
  const [condition, setCondition] = useState<ConditionFilter>('all');
  const [selectedPagesStr, setSelectedPagesStr] = useState<string>('1');
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyResize = async () => {
    try {
      setIsApplying(true);
      const selectedIndices = parsePageRange(selectedPagesStr, document.pageCount);
      const newBytes = await resizePdfPages(
        document.bytes,
        targetSize,
        targetSize === 'Custom' ? { width: customWidth, height: customHeight } : undefined,
        orientation,
        scaleMode,
        condition,
        selectedIndices
      );
      await onUpdateDocumentBytes(newBytes, `Resized pages to ${targetSize}`);
    } catch (err) {
      console.error(err);
      alert('Failed to resize PDF pages');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Maximize2 className="w-5 h-5 text-indigo-400" />
          Page Size & Dimensions Resizer
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Standardize page dimensions to A4, Letter, Legal, or Custom sizes. Scales content proportionally with margins and optimizes stream size.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Paper Size Standards */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3">
          <label className="block text-xs font-bold text-slate-200">
            Target Page Size Standard:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['A4', 'Letter', 'Legal', 'A3', 'A5', 'Custom'] as PageSizeStandard[]).map(sz => (
              <button
                key={sz}
                onClick={() => setTargetSize(sz)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between transition ${
                  targetSize === sz
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                <span>{sz}</span>
                {sz !== 'Custom' && (
                  <span className="text-[10px] opacity-75">
                    {Math.round(PAGE_SIZES[sz].width)}x{Math.round(PAGE_SIZES[sz].height)}pt
                  </span>
                )}
              </button>
            ))}
          </div>

          {targetSize === 'Custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Width (pt):</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={e => setCustomWidth(parseFloat(e.target.value) || 100)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Height (pt):</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={e => setCustomHeight(parseFloat(e.target.value) || 100)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Orientation & Scaling */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-2">
              Orientation:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'portrait', label: 'Portrait' },
                { id: 'landscape', label: 'Landscape' },
                { id: 'original', label: 'Keep Original' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setOrientation(opt.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                    orientation === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-2">
              Content Scaling Mode:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'fit', label: 'Fit to Page' },
                { id: 'center', label: 'Center (100%)' },
                { id: 'stretch', label: 'Stretch to Fill' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setScaleMode(opt.id as any)}
                  className={`px-2 py-2 rounded-xl text-xs font-semibold border transition ${
                    scaleMode === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Condition Filter */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3">
        <label className="block text-xs font-bold text-slate-200">
          Apply To:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'all', label: 'All Pages' },
            { id: 'selected', label: 'Selected Pages' },
            { id: 'odd', label: 'Odd Pages Only' },
            { id: 'even', label: 'Even Pages Only' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setCondition(opt.id as ConditionFilter)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                condition === opt.id
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {condition === 'selected' && (
          <div className="pt-2">
            <input
              type="text"
              placeholder="e.g. 1, 3-5"
              value={selectedPagesStr}
              onChange={e => setSelectedPagesStr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
        )}

        <button
          onClick={handleApplyResize}
          disabled={isApplying}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950 active:scale-98 transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {isApplying ? 'Resizing Pages...' : `Resize Pages to ${targetSize}`}
        </button>
      </div>
    </div>
  );
};
