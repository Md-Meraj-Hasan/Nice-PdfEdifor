import React, { useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';
import { ConditionFilter, PdfDocument } from '../../types/pdf';
import { rotatePdfPages, parsePageRange } from '../../services/pdfEngine';

interface RotateToolProps {
  document: PdfDocument;
  onUpdateDocumentBytes: (bytes: Uint8Array, message?: string) => Promise<void>;
}

export const RotateTool: React.FC<RotateToolProps> = ({
  document,
  onUpdateDocumentBytes,
}) => {
  const [angle, setAngle] = useState<number>(90);
  const [condition, setCondition] = useState<ConditionFilter>('all');
  const [selectedPagesStr, setSelectedPagesStr] = useState<string>('1');
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyRotate = async (targetAngle: number = angle) => {
    try {
      setIsApplying(true);
      const selectedIndices = parsePageRange(selectedPagesStr, document.pageCount);
      const newBytes = await rotatePdfPages(
        document.bytes,
        targetAngle,
        condition,
        selectedIndices
      );
      await onUpdateDocumentBytes(newBytes, `Rotated pages by ${targetAngle}°`);
    } catch (err) {
      console.error(err);
      alert('Failed to rotate PDF pages');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-blue-400" />
          Rotate PDF Pages
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Rotate pages clockwise, counter-clockwise, or 180° upside-down. Filter by page numbers, orientation, or odd/even pages.
        </p>
      </div>

      {/* Rotation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => handleApplyRotate(90)}
          disabled={isApplying}
          className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 flex flex-col items-center justify-center text-center transition group active:scale-95 disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <RotateCw className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-white">90° Clockwise</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Turn right</span>
        </button>

        <button
          onClick={() => handleApplyRotate(270)}
          disabled={isApplying}
          className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 flex flex-col items-center justify-center text-center transition group active:scale-95 disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <RotateCcw className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-white">90° Counter-Clockwise</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Turn left</span>
        </button>

        <button
          onClick={() => handleApplyRotate(180)}
          disabled={isApplying}
          className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 flex flex-col items-center justify-center text-center transition group active:scale-95 disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ArrowRightLeft className="w-6 h-6 rotate-90" />
          </div>
          <span className="font-bold text-sm text-white">180° Flip</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Upside-down</span>
        </button>
      </div>

      {/* Target Condition Selector */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-3">
        <label className="block text-xs font-bold text-slate-200">
          Apply Rotation To:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: 'all', label: 'All Pages' },
            { id: 'selected', label: 'Selected Pages' },
            { id: 'odd', label: 'Odd Pages Only' },
            { id: 'even', label: 'Even Pages Only' },
            { id: 'portrait', label: 'Portrait Pages Only' },
            { id: 'landscape', label: 'Landscape Pages Only' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setCondition(opt.id as ConditionFilter)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                condition === opt.id
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
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
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Page Previews */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400">Current Document Pages:</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {document.thumbnails.map((thumb, idx) => (
            <div
              key={idx}
              className="bg-slate-800/60 rounded-xl p-2 border border-slate-700 flex flex-col items-center"
            >
              <div className="w-full aspect-[3/4] bg-white rounded flex items-center justify-center overflow-hidden mb-1.5 shadow-sm">
                <img
                  src={thumb.dataUrl}
                  alt={`Page ${idx + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-300">
                Page {idx + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
