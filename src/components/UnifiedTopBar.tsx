import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  Plus,
  Undo2,
  Redo2,
  ChevronDown,
  LayoutGrid,
  Type,
  Combine,
  Split,
  Crop,
  RotateCw,
  Maximize2,
  ScanText,
  Lock,
  Scissors,
  Copy,
  PenTool,
  Stamp,
  Highlighter,
  Square,
  FileStack,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ToolId } from '../types/pdf';

interface UnifiedTopBarProps {
  fileName: string | null;
  pageCount: number;
  activeTool: ToolId;
  setActiveTool: (tool: ToolId) => void;
  onNewFile: () => void;
  onDownloadCurrentPdf: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  clipboardCount?: number;
}

export const UnifiedTopBar: React.FC<UnifiedTopBarProps> = ({
  fileName,
  pageCount,
  activeTool,
  setActiveTool,
  onNewFile,
  onDownloadCurrentPdf,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  clipboardCount = 0,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(curr => (curr === name ? null : name));
  };

  const handleSelectTool = (tool: ToolId) => {
    setActiveTool(tool);
    setOpenDropdown(null);
  };

  return (
    <header
      ref={barRef}
      className="sticky top-0 z-50 bg-slate-900/98 backdrop-blur-xl border-b border-slate-800 px-2 sm:px-4 py-2 shadow-lg"
    >
      {/* SINGLE HORIZONTAL LINE CONTAINER */}
      <div className="flex items-center justify-between gap-2 max-w-[100vw] overflow-x-hidden">
        {/* Brand & Home (Compact) */}
        <div className="flex items-center gap-2 shrink-0 pr-1 border-r border-slate-800/80">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="hidden xl:block">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-sm tracking-tight text-white">
                PDFMaster<span className="text-blue-400">Pro</span>
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Offline
              </span>
            </div>
            {fileName && (
              <span className="text-[10px] text-slate-400 truncate block max-w-[120px]">
                {pageCount} pages
              </span>
            )}
          </div>
        </div>

        {/* HORIZONTAL DROPDOWN MENUS FOR EVERY SECTION - ONLY VISIBLE WHEN PDF IS LOADED */}
        {fileName ? (
          <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth">
          {/* SECTION 1: Pages ▾ */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('pages')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTool === 'organize'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Pages</span>
              {clipboardCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/30 text-emerald-300 font-bold">
                  {clipboardCount}
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'pages' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                <button
                  onClick={() => handleSelectTool('organize')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-bold">Arrange & Reorder</div>
                    <div className="text-[10px] text-slate-400">Drag, reorder, delete pages</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectTool('organize')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Scissors className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-bold">Cut, Copy & Paste</div>
                    <div className="text-[10px] text-slate-400">Page clipboard manager</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: Edit & Text ▾ */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('edit')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTool === 'edit'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Edit & Text</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'edit' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                <button
                  onClick={() => handleSelectTool('edit')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Type className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-bold">Add / Edit Text</div>
                    <div className="text-[10px] text-slate-400">Type new text, custom font/color</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectTool('edit')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Square className="w-4 h-4 text-rose-400" />
                  <div>
                    <div className="font-bold">Whiteout (Erase)</div>
                    <div className="text-[10px] text-slate-400">Cover & replace existing text</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectTool('edit')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <PenTool className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-bold">Digital Signature</div>
                    <div className="text-[10px] text-slate-400">Draw signature with touch</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectTool('edit')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Stamp className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold">Stamps & Highlights</div>
                    <div className="text-[10px] text-slate-400">APPROVED, PAID, markers</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: Split & Merge ▾ */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('split-merge')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTool === 'merge' || activeTool === 'split'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Combine className="w-3.5 h-3.5" />
              <span>Split & Merge</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'split-merge' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                <button
                  onClick={() => handleSelectTool('merge')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Combine className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-bold">Merge PDFs</div>
                    <div className="text-[10px] text-slate-400">Combine multiple PDF files</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectTool('split')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Split className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="font-bold">Split by Condition</div>
                    <div className="text-[10px] text-slate-400">Custom range, odd/even, every N</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 4: Layout & Size ▾ */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('layout')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTool === 'crop' || activeTool === 'rotate' || activeTool === 'resize'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Layout & Size</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'layout' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                <button
                  onClick={() => handleSelectTool('crop')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Crop className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold">Crop by Condition</div>
                    <div className="text-[10px] text-slate-400">Trim margins, odd/even, visual</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectTool('rotate')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <RotateCw className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-bold">Rotate Pages</div>
                    <div className="text-[10px] text-slate-400">90°, 180°, landscape/portrait</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectTool('resize')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Maximize2 className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-bold">Page Size & Scaling</div>
                    <div className="text-[10px] text-slate-400">A4, Letter, Custom dimensions</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 5: OCR & Text ▾ */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('ocr')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTool === 'ocr'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ScanText className="w-3.5 h-3.5" />
              <span>OCR</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'ocr' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                <button
                  onClick={() => handleSelectTool('ocr')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <ScanText className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-bold">Offline OCR</div>
                    <div className="text-[10px] text-slate-400">Extract scanned text & export TXT</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 6: Security ▾ */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('security')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTool === 'security'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Security</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'security' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 text-xs">
                <button
                  onClick={() => handleSelectTool('security')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-bold">Add Password (Encrypt)</div>
                    <div className="text-[10px] text-slate-400">AES-256 password protection</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectTool('security')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold">Remove Password (Unlock)</div>
                    <div className="text-[10px] text-slate-400">Make PDF unrestricted</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </nav>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
            <span className="hidden md:inline">Offline PDF Editor — Merge, Split, Edit Text, OCR & Security</span>
          </div>
        )}

        {/* RIGHT CONTROLS: Undo/Redo, Save As, Open */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-800/80">
          {/* Undo / Redo */}
          {fileName && (
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Save & Download current PDF */}
          {fileName && (
            <button
              onClick={onDownloadCurrentPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition active:scale-95 shrink-0"
              title="Save PDF As — choose filename and location"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save As</span>
            </button>
          )}

          {/* Open New File */}
          {fileName && (
            <button
              onClick={onNewFile}
              className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition shrink-0"
              title="Open another PDF"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
