import React from 'react';
import {
  RotateCw,
  RotateCcw,
  Scissors,
  Copy,
  Trash2,
  CopyPlus,
  FileDown,
  Type,
  ScanText,
  Crop,
  Maximize2,
  X,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import { ToolId } from '../types/pdf';

interface SelectionActionBarProps {
  selectedIndices: number[]; // 0-based page indices
  totalPageCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onRotateSelected: (angle: number) => void;
  onCutSelected: () => void;
  onCopySelected: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onExtractSelected: () => void;
  onOpenToolWithPage: (tool: ToolId, pageNumber: number) => void;
  onApplyChanges?: () => void;
  isApplying?: boolean;
}

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selectedIndices,
  totalPageCount,
  onClearSelection,
  onSelectAll,
  onRotateSelected,
  onCutSelected,
  onCopySelected,
  onDeleteSelected,
  onDuplicateSelected,
  onExtractSelected,
  onOpenToolWithPage,
  onApplyChanges,
  isApplying = false,
}) => {
  if (selectedIndices.length === 0) return null;

  const count = selectedIndices.length;
  const firstSelectedPage = selectedIndices[0] + 1; // 1-based

  return (
    <div className="fixed bottom-14 md:bottom-4 left-0 right-0 z-40 px-2 sm:px-4 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-slate-900/98 backdrop-blur-2xl border-2 border-blue-500 rounded-2xl px-2.5 sm:px-3 py-2 shadow-2xl shadow-black/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {/* Left: Selected count & Clear (Single line) */}
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-800">
          <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-bold text-xs whitespace-nowrap">
            {count === 1 ? `Page ${firstSelectedPage}` : `${count} Selected`}
          </span>

          <button
            onClick={onSelectAll}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition whitespace-nowrap hidden sm:inline-block"
          >
            {count === totalPageCount ? 'Deselect' : 'All'}
          </button>

          <button
            onClick={onClearSelection}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Deselect"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: ALL TOOL ACTION ICONS IN SINGLE HORIZONTAL LINE */}
        <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar py-0.5">
          {/* Rotate 90° Clockwise */}
          <button
            onClick={() => onRotateSelected(90)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Rotate 90°</span>
          </button>

          {/* Rotate -90° Counter-Clockwise */}
          <button
            onClick={() => onRotateSelected(270)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Rotate -90° Counter-Clockwise"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>-90°</span>
          </button>

          {/* Edit Text */}
          <button
            onClick={() => onOpenToolWithPage('edit', firstSelectedPage)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Edit Text & Whiteout"
          >
            <Type className="w-3.5 h-3.5 text-blue-400" />
            <span>Edit Text</span>
          </button>

          {/* OCR Text */}
          <button
            onClick={() => onOpenToolWithPage('ocr', firstSelectedPage)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Extract text with offline OCR"
          >
            <ScanText className="w-3.5 h-3.5 text-amber-400" />
            <span>OCR</span>
          </button>

          {/* Crop */}
          <button
            onClick={() => onOpenToolWithPage('crop', firstSelectedPage)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Crop page margins"
          >
            <Crop className="w-3.5 h-3.5 text-emerald-400" />
            <span>Crop</span>
          </button>

          {/* Resize */}
          <button
            onClick={() => onOpenToolWithPage('resize', firstSelectedPage)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Resize page dimensions"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Resize</span>
          </button>

          {/* Duplicate */}
          <button
            onClick={onDuplicateSelected}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Duplicate selected page(s)"
          >
            <CopyPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Duplicate</span>
          </button>

          {/* Cut */}
          <button
            onClick={onCutSelected}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Cut to clipboard"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Cut</span>
          </button>

          {/* Copy */}
          <button
            onClick={onCopySelected}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Copy to clipboard"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <span>Copy</span>
          </button>

          {/* Delete */}
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Delete selected page(s)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          {/* Extract Selected */}
          <button
            onClick={onExtractSelected}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition active:scale-95 whitespace-nowrap shrink-0"
            title="Extract selected as new PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Extract</span>
          </button>
        </div>

        {/* Right: APPLY / SAVE BUTTON DIRECTLY IN BOTTOM BAR */}
        {onApplyChanges && (
          <div className="shrink-0 pl-2 border-l border-slate-800">
            <button
              onClick={onApplyChanges}
              disabled={isApplying}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/40 active:scale-95 transition disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isApplying ? 'Saving...' : 'Apply'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
