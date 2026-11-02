import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Type,
  Square,
  Stamp,
  Highlighter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CopyPlus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  FileText,
  Pipette,
  Check,
  Maximize2,
  Download,
} from 'lucide-react';
import { PageAnnotation, PdfDocument, TextAnnotation } from '../../types/pdf';
import { bakeAnnotationsIntoPdf } from '../../services/pdfEngine';
import { extractPageTextItemsWithCoords, TextItemWithCoords } from '../../services/pdfRenderer';
import { ZoomableContainer } from '../ZoomableContainer';

interface EditToolProps {
  document: PdfDocument;
  initialPage?: number;
  onUpdateDocumentBytes: (
    bytes: Uint8Array,
    message?: string,
    skipHistoryPush?: boolean,
    changedPageNumbers?: number[],
    updatedThumbnailsDirect?: any[]
  ) => Promise<void>;
  onExportDocument?: () => void;
}

export const EditTool: React.FC<EditToolProps> = ({
  document,
  initialPage = 1,
  onUpdateDocumentBytes,
  onExportDocument,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  useEffect(() => {
    if (initialPage && initialPage >= 1 && initialPage <= document.pageCount) {
      setCurrentPage(initialPage);
    }
  }, [initialPage, document.pageCount]);

  const [activeSubTool, setActiveSubTool] = useState<
    'text' | 'whiteout' | 'stamp' | 'highlight'
  >('text');

  // Existing text items detected from the original PDF
  const [detectedTextItems, setDetectedTextItems] = useState<TextItemWithCoords[]>([]);
  const [isLoadingTextItems, setIsLoadingTextItems] = useState<boolean>(false);

  // Map of annotations per page: { 1: [...], 2: [...] }
  const [annotations, setAnnotations] = useState<Record<number, PageAnnotation[]>>({});
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);

  // Active / default text properties
  const [fontSize, setFontSize] = useState<number>(14);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [isWhiteoutBg, setIsWhiteoutBg] = useState<boolean>(true); // default whiteout bg for seamless replacement
  const [textBgColor, setTextBgColor] = useState<string>('#ffffff');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [fontFamily, setFontFamily] = useState<'sans-serif' | 'serif' | 'monospace'>('sans-serif');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // Zoom controls state
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  // Stamp options
  const [selectedStamp, setSelectedStamp] = useState<string>('APPROVED');
  const [stampColor, setStampColor] = useState<string>('#16a34a');

  // Dragging annotation state
  const [dragState, setDragState] = useState<{
    annId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Resizing text box width state
  const [resizeState, setResizeState] = useState<{
    annId: string;
    startX: number;
    origWidth: number;
  } | null>(null);

  const [isBaking, setIsBaking] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  const currentAnnotations = annotations[currentPage] || [];
  const currentThumb = document.thumbnails[currentPage - 1];
  const selectedAnn = currentAnnotations.find(a => a.id === selectedAnnId);

  // Measure rendered container width to compute exact pixel font scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [currentPage, currentThumb]);

  const displayScale = currentThumb?.width ? containerWidth / currentThumb.width : 1;

  // Extract palette of colors present in the detected text items of this page
  const detectedPalette = useMemo(() => {
    const textColors = new Set<string>();
    const bgColors = new Set<string>();
    detectedTextItems.forEach(it => {
      if (it.color) textColors.add(it.color.toLowerCase());
      if (it.bgColor) bgColors.add(it.bgColor.toLowerCase());
    });
    return {
      textColors: Array.from(textColors).slice(0, 8),
      bgColors: Array.from(bgColors).slice(0, 8),
    };
  }, [detectedTextItems]);

  // Load existing text items from the PDF for the current page
  useEffect(() => {
    let isCancelled = false;
    const loadText = async () => {
      try {
        setIsLoadingTextItems(true);
        const items = await extractPageTextItemsWithCoords(document.bytes, currentPage);
        if (!isCancelled) {
          setDetectedTextItems(items);
        }
      } catch (err) {
        console.warn('Could not extract text items:', err);
      } finally {
        if (!isCancelled) setIsLoadingTextItems(false);
      }
    };
    loadText();
    return () => {
      isCancelled = true;
    };
  }, [document.bytes, currentPage]);

  // Sync selected annotation properties with toolbar state
  useEffect(() => {
    if (selectedAnn && selectedAnn.type === 'text') {
      setFontSize(selectedAnn.fontSize || 14);
      setTextColor(selectedAnn.color || '#000000');
      setIsWhiteoutBg(!!selectedAnn.bgColor);
      if (selectedAnn.bgColor) setTextBgColor(selectedAnn.bgColor);
      setIsBold(!!selectedAnn.isBold);
      setIsItalic(!!selectedAnn.isItalic);
      setFontFamily(selectedAnn.fontFamily || 'sans-serif');
      setTextAlign(selectedAnn.textAlign || 'left');
    }
  }, [selectedAnnId]);

  // Helper to add annotation
  const addAnnotation = (ann: PageAnnotation) => {
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), ann],
    }));
    setSelectedAnnId(ann.id);
  };

  const updateAnnotation = (id: string, updates: Partial<PageAnnotation>) => {
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).map(a =>
        a.id === id ? ({ ...a, ...updates } as PageAnnotation) : a
      ),
    }));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).filter(a => a.id !== id),
    }));
    if (selectedAnnId === id) setSelectedAnnId(null);
  };

  const duplicateSelectedAnnotation = () => {
    if (!selectedAnn) return;
    const newId = `${selectedAnn.type}-${Date.now()}`;
    const clone: PageAnnotation = {
      ...selectedAnn,
      id: newId,
      x: Math.min(85, selectedAnn.x + 3),
      y: Math.min(85, selectedAnn.y + 3),
    };
    addAnnotation(clone);
  };

  // Nudge selected annotation
  const nudgeAnnotation = (dx: number, dy: number) => {
    if (!selectedAnn) return;
    const newX = Math.max(0, Math.min(99, selectedAnn.x + dx));
    const newY = Math.max(0, Math.min(99, selectedAnn.y + dy));
    updateAnnotation(selectedAnn.id, {
      x: Math.round(newX * 100) / 100,
      y: Math.round(newY * 100) / 100,
    });
  };

  // Adjust width of text box
  const adjustWidth = (dw: number) => {
    if (!selectedAnn) return;
    const newW = Math.max(2, Math.min(100, selectedAnn.width + dw));
    updateAnnotation(selectedAnn.id, { width: Math.round(newW * 10) / 10 });
  };

  // Fit text box width automatically to text content
  const fitWidthToText = () => {
    if (!selectedAnn || selectedAnn.type !== 'text') return;
    const charCount = Math.max(selectedAnn.text.length, 1);
    const avgCharW = selectedAnn.fontSize * 0.58;
    const totalW = charCount * avgCharW;
    const pageW = currentThumb?.width || 595.28;
    const calculatedWidthPct = Math.min(98, Math.max(3, (totalW / pageW) * 100));
    updateAnnotation(selectedAnn.id, { width: Math.round(calculatedWidthPct * 10) / 10 });
  };

  // Click on existing detected PDF text to edit it immediately with exact design, shape, color, and dimensions!
  const handleEditExistingText = (item: TextItemWithCoords, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTextAnn: TextAnnotation = {
      id: `edit-text-${Date.now()}`,
      type: 'text',
      x: item.xPct,
      y: item.yPct,
      width: Math.max(item.widthPct, 2),
      height: item.heightPct,
      text: item.str,
      fontSize: item.fontSize || fontSize || 14,
      color: item.color || '#000000',
      bgColor: item.bgColor || '#ffffff',
      isBold: item.isBold,
      isItalic: item.isItalic,
      fontFamily: item.fontFamily || 'sans-serif',
      baselineYPct: item.baselineYPct,
      textAlign: 'left',
    };
    addAnnotation(newTextAnn);
    setActiveSubTool('text');

    // Sync active toolbar controls to the exact detected properties
    setFontSize(newTextAnn.fontSize);
    setTextColor(newTextAnn.color);
    setTextBgColor(newTextAnn.bgColor || '#ffffff');
    setIsWhiteoutBg(true);
    setIsBold(item.isBold);
    setIsItalic(item.isItalic);
    setFontFamily(newTextAnn.fontFamily || 'sans-serif');
  };

  // Canvas click to place text or whiteout
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState || resizeState) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeSubTool === 'text') {
      const newText: TextAnnotation = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: Math.max(0, Math.min(80, xPct)),
        y: Math.max(0, Math.min(95, yPct)),
        width: 32,
        height: 5,
        text: 'Type text here...',
        fontSize,
        color: textColor,
        bgColor: isWhiteoutBg ? textBgColor : undefined,
        isBold,
        isItalic,
        fontFamily,
        textAlign,
      };
      addAnnotation(newText);
    } else if (activeSubTool === 'whiteout') {
      const newBox: PageAnnotation = {
        id: `whiteout-${Date.now()}`,
        type: 'whiteout',
        x: Math.max(0, Math.min(80, xPct)),
        y: Math.max(0, Math.min(95, yPct)),
        width: 25,
        height: 5,
        fillColor: textBgColor || '#ffffff',
      };
      addAnnotation(newBox);
    } else if (activeSubTool === 'highlight') {
      const newHl: PageAnnotation = {
        id: `hl-${Date.now()}`,
        type: 'highlight',
        x: Math.max(0, Math.min(80, xPct)),
        y: Math.max(0, Math.min(95, yPct)),
        width: 35,
        height: 4,
        color: '#fef08a',
        opacity: 0.45,
      };
      addAnnotation(newHl);
    } else if (activeSubTool === 'stamp') {
      const newStamp: PageAnnotation = {
        id: `stamp-${Date.now()}`,
        type: 'stamp',
        x: Math.max(0, Math.min(75, xPct)),
        y: Math.max(0, Math.min(90, yPct)),
        width: 28,
        height: 8,
        text: selectedStamp,
        color: stampColor,
        style: 'boxed',
        angle: -10,
      };
      addAnnotation(newStamp);
    }
  };

  // Dragging annotations across canvas
  const handleAnnMouseDown = (ann: PageAnnotation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAnnId(ann.id);
    setDragState({
      annId: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: ann.x,
      origY: ann.y,
    });
  };

  // Resizing text box width
  const handleResizeMouseDown = (annId: string, origWidth: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizeState({
      annId,
      startX: e.clientX,
      origWidth,
    });
  };

  useEffect(() => {
    if (!dragState && !resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (dragState) {
        const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
        const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;

        const newX = Math.max(0, Math.min(99, dragState.origX + deltaX));
        const newY = Math.max(0, Math.min(99, dragState.origY + deltaY));

        updateAnnotation(dragState.annId, {
          x: Math.round(newX * 100) / 100,
          y: Math.round(newY * 100) / 100,
        });
      }

      if (resizeState) {
        const deltaW = ((e.clientX - resizeState.startX) / rect.width) * 100;
        const newW = Math.max(2, Math.min(100, resizeState.origWidth + deltaW));
        updateAnnotation(resizeState.annId, {
          width: Math.round(newW * 100) / 100,
        });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState]);

  // Save all annotations into the PDF permanently
  const handleSaveToPdf = async () => {
    if (isBaking) return;
    const pendingAnnotations = Object.fromEntries(
      Object.entries(annotations).filter(([, items]) => items.length > 0)
    ) as Record<number, PageAnnotation[]>;
    if (Object.keys(pendingAnnotations).length === 0) return;

    try {
      setIsBaking(true);
      const sourceBytes = new Uint8Array(document.bytes);
      const newBytes = await bakeAnnotationsIntoPdf(sourceBytes, pendingAnnotations);

      const editedPageNumbers = Object.keys(pendingAnnotations).map(Number);
      await onUpdateDocumentBytes(
        newBytes,
        'Text and annotations saved to PDF permanently with original design & colors',
        false,
        editedPageNumbers
      );

      setAnnotations(prev => {
        const next = { ...prev };
        for (const pageNum of editedPageNumbers) delete next[pageNum];
        return next;
      });
      setSelectedAnnId(null);
    } catch (err) {
      console.error('Failed to save annotations to PDF:', err);
      alert(
        err instanceof Error
          ? `Could not save edits: ${err.message}`
          : 'Could not save edits. Your annotations are still available; please try again.'
      );
    } finally {
      setIsBaking(false);
    }
  };

  // Zoom helpers
  const handleZoomIn = () => setZoomScale(z => Math.min(2.5, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoomScale(z => Math.max(0.5, Math.round((z - 0.15) * 100) / 100));
  const handleZoomReset = () => setZoomScale(1.0);

  const getCssFontFamily = (family?: 'sans-serif' | 'serif' | 'monospace') => {
    if (family === 'serif') return 'Georgia, "Times New Roman", Times, serif';
    if (family === 'monospace') return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    return 'Helvetica, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      {/* 1. HORIZONTAL PAGE NUMBER SELECTOR STRIP */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-800">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white hidden sm:inline">Page:</span>
          <span className="text-xs font-mono text-blue-400">{currentPage}/{document.pageCount}</span>
        </div>

        {/* Horizontal Page Numbers (1, 2, 3, 4, 5...) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {Array.from({ length: document.pageCount }, (_, i) => i + 1).map(pNum => (
            <button
              key={pNum}
              type="button"
              onClick={() => {
                setCurrentPage(pNum);
                setSelectedAnnId(null);
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-bold transition shrink-0 flex items-center justify-center border ${
                currentPage === pNum
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40 scale-105'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {pNum}
            </button>
          ))}
        </div>

        {/* Prev / Next Page arrows */}
        <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-800">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(document.pageCount, p + 1))}
            disabled={currentPage >= document.pageCount}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 transition"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. SUB-TOOL SELECTION & ZOOM BAR */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Tool selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveSubTool('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 ${
              activeSubTool === 'text'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Add / Edit Text</span>
          </button>

          <button
            onClick={() => setActiveSubTool('whiteout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 ${
              activeSubTool === 'whiteout'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Square className="w-3.5 h-3.5 text-rose-400" />
            <span>Whiteout Box</span>
          </button>

          <button
            onClick={() => setActiveSubTool('highlight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 ${
              activeSubTool === 'highlight'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-400" />
            <span>Highlight</span>
          </button>

          <button
            onClick={() => setActiveSubTool('stamp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 ${
              activeSubTool === 'stamp'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Stamp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Stamp</span>
          </button>
        </div>

        {/* Right side: ZOOM IN, ZOOM OUT, RESET + SAVE BUTTON */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 py-1 text-[11px] font-mono font-bold text-slate-300 hover:text-white"
              title="Reset Zoom (100%)"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleSaveToPdf}
            disabled={isBaking || Object.values(annotations).every(a => a.length === 0)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition disabled:opacity-40 active:scale-95 shrink-0"
            title="Bake and apply text edits to PDF"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBaking ? 'Saving...' : 'Apply to PDF'}</span>
          </button>

          {onExportDocument && (
            <button
              onClick={async () => {
                if (!isBaking && Object.values(annotations).some(a => a.length > 0)) {
                  await handleSaveToPdf();
                }
                onExportDocument();
              }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition active:scale-95 shrink-0"
              title="Save edited PDF to your phone's local storage / Downloads"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              <span>Export & Save</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. RICH TEXT ADJUSTMENT & ORIGINAL DESIGN MATCH TOOLBAR */}
      <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-3 shadow-lg space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Direct Text Input or Hint */}
          {selectedAnn && selectedAnn.type === 'text' ? (
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                value={selectedAnn.text}
                onChange={e => updateAnnotation(selectedAnn.id, { text: e.target.value })}
                placeholder="Edit text..."
                autoFocus
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-blue-500 text-white text-xs font-semibold focus:outline-none"
              />
            </div>
          ) : (
            <div className="text-xs text-slate-300 flex items-center gap-1.5">
              <span className="font-bold text-blue-400">PDF Smart Edit:</span>
              <span>Click on any original text on the page below to edit it with identical shape, color & typography!</span>
            </div>
          )}

          {/* Text Formatting Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Font Family Selector (Sans, Serif, Mono) */}
            <div className="flex items-center bg-slate-900/90 rounded-xl px-1.5 py-0.5 border border-slate-700">
              <span className="text-[10px] text-slate-400 pr-1">Font:</span>
              <select
                value={fontFamily}
                onChange={e => {
                  const val = e.target.value as 'sans-serif' | 'serif' | 'monospace';
                  setFontFamily(val);
                  if (selectedAnn && selectedAnn.type === 'text') {
                    updateAnnotation(selectedAnn.id, { fontFamily: val });
                  }
                }}
                className="bg-transparent text-white text-xs font-semibold py-1 pr-1 outline-none cursor-pointer"
              >
                <option value="sans-serif" className="bg-slate-900 text-white">Sans (Helvetica / Arial)</option>
                <option value="serif" className="bg-slate-900 text-white">Serif (Times New Roman)</option>
                <option value="monospace" className="bg-slate-900 text-white">Mono (Courier / Code)</option>
              </select>
            </div>

            {/* Font Size (+ / - Steppers) */}
            <div className="flex items-center gap-1 bg-slate-900/90 rounded-xl px-2 py-1 border border-slate-700">
              <span className="text-[11px] text-slate-400">Size:</span>
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(6, fontSize - 1);
                  setFontSize(next);
                  if (selectedAnn && selectedAnn.type === 'text') {
                    updateAnnotation(selectedAnn.id, { fontSize: next });
                  }
                }}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center"
              >
                -
              </button>
              <span className="text-xs font-mono font-bold text-white px-1">{fontSize}</span>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(96, fontSize + 1);
                  setFontSize(next);
                  if (selectedAnn && selectedAnn.type === 'text') {
                    updateAnnotation(selectedAnn.id, { fontSize: next });
                  }
                }}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center"
              >
                +
              </button>
            </div>

            {/* Font Color */}
            <div className="flex items-center gap-1 bg-slate-900/90 rounded-xl px-2 py-1 border border-slate-700">
              <span className="text-[11px] text-slate-400">Text:</span>
              {/* Detected document text color chips */}
              {detectedPalette.textColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setTextColor(c);
                    if (selectedAnn && selectedAnn.type === 'text') {
                      updateAnnotation(selectedAnn.id, { color: c });
                    }
                  }}
                  className={`w-4 h-4 rounded-full border transition ${
                    textColor.toLowerCase() === c ? 'ring-2 ring-blue-400 scale-110' : 'border-slate-600'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Original PDF Color: ${c}`}
                />
              ))}
              <input
                type="color"
                value={textColor}
                onChange={e => {
                  setTextColor(e.target.value);
                  if (selectedAnn && selectedAnn.type === 'text') {
                    updateAnnotation(selectedAnn.id, { color: e.target.value });
                  }
                }}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent ml-1"
                title="Custom color"
              />
            </div>

            {/* Bold Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isBold;
                setIsBold(next);
                if (selectedAnn && selectedAnn.type === 'text') {
                  updateAnnotation(selectedAnn.id, { isBold: next });
                }
              }}
              className={`p-1.5 rounded-xl border transition ${
                isBold ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Italic Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isItalic;
                setIsItalic(next);
                if (selectedAnn && selectedAnn.type === 'text') {
                  updateAnnotation(selectedAnn.id, { isItalic: next });
                }
              }}
              className={`p-1.5 rounded-xl border transition ${
                isItalic ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            {/* Text Alignment */}
            <div className="flex items-center bg-slate-900/90 rounded-xl p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setTextAlign('left');
                  if (selectedAnn && selectedAnn.type === 'text') updateAnnotation(selectedAnn.id, { textAlign: 'left' });
                }}
                className={`p-1 rounded-lg ${textAlign === 'left' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Align Left"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTextAlign('center');
                  if (selectedAnn && selectedAnn.type === 'text') updateAnnotation(selectedAnn.id, { textAlign: 'center' });
                }}
                className={`p-1 rounded-lg ${textAlign === 'center' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Align Center"
              >
                <AlignCenter className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTextAlign('right');
                  if (selectedAnn && selectedAnn.type === 'text') updateAnnotation(selectedAnn.id, { textAlign: 'right' });
                }}
                className={`p-1 rounded-lg ${textAlign === 'right' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Align Right"
              >
                <AlignRight className="w-3 h-3" />
              </button>
            </div>

            {/* Cover Old Text (Background Color) Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 rounded-xl px-2 py-1 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  const next = !isWhiteoutBg;
                  setIsWhiteoutBg(next);
                  if (selectedAnn && selectedAnn.type === 'text') {
                    updateAnnotation(selectedAnn.id, { bgColor: next ? textBgColor : undefined });
                  }
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold transition ${
                  isWhiteoutBg ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
                title="Cover underlying original text"
              >
                <Square className="w-3 h-3" />
                <span>Cover BG</span>
              </button>

              {isWhiteoutBg && (
                <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                  <div
                    className="w-4 h-4 rounded-md border border-slate-600 shadow-inner"
                    style={{ backgroundColor: textBgColor }}
                    title={`Cover Color: ${textBgColor}`}
                  />
                  <input
                    type="color"
                    value={textBgColor}
                    onChange={e => {
                      setTextBgColor(e.target.value);
                      if (selectedAnn && selectedAnn.type === 'text') {
                        updateAnnotation(selectedAnn.id, { bgColor: e.target.value });
                      }
                    }}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                    title="Change background cover color"
                  />
                </div>
              )}
            </div>

            {/* Width Adjustment & Fit to Text */}
            {selectedAnn && selectedAnn.type === 'text' && (
              <div className="flex items-center gap-1 bg-slate-900/90 rounded-xl px-2 py-1 border border-slate-700">
                <span className="text-[10px] text-slate-400">Width:</span>
                <button
                  type="button"
                  onClick={() => adjustWidth(-2)}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center"
                  title="Narrower (-)"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustWidth(2)}
                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center"
                  title="Wider (+)"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={fitWidthToText}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-blue-300 font-bold"
                  title="Auto-Fit Width to Text"
                >
                  Fit Text
                </button>
              </div>
            )}

            {/* Nudge / Position Steppers */}
            {selectedAnn && (
              <div className="flex items-center gap-0.5 bg-slate-900/90 rounded-xl p-1 border border-slate-700">
                <span className="text-[10px] text-slate-400 px-1">Nudge:</span>
                <button
                  type="button"
                  onClick={() => nudgeAnnotation(0, -0.3)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Nudge Up"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeAnnotation(0, 0.3)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Nudge Down"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeAnnotation(-0.3, 0)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Nudge Left"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeAnnotation(0.3, 0)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Nudge Right"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Duplicate & Delete Actions */}
            {selectedAnn && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={duplicateSelectedAnnotation}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-slate-800 transition"
                  title="Duplicate text"
                >
                  <CopyPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteAnnotation(selectedAnn.id)}
                  className="p-1.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/30 transition"
                  title="Delete text"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. CANVAS CONTAINER WITH REAL-TIME PIXEL MATCHING */}
      <div className="flex justify-center p-2 sm:p-4 bg-slate-950/60 rounded-3xl border border-slate-800/80 overflow-hidden min-h-[520px]">
        <ZoomableContainer className="w-full h-full min-h-[520px]">
          <div
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="flex justify-center my-auto"
          >
            <div
              ref={containerRef}
              onClick={handlePageClick}
              className="relative bg-white shadow-2xl rounded-sm select-none cursor-crosshair overflow-hidden"
              style={{
                width: currentThumb?.width ? Math.min(680, currentThumb.width) : 600,
                aspectRatio: currentThumb ? `${currentThumb.width} / ${currentThumb.height}` : '3/4',
              }}
            >
              {/* Base PDF Page Image */}
              {currentThumb?.dataUrl ? (
                <img
                  src={currentThumb.dataUrl}
                  alt={`Page ${currentPage}`}
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  Loading preview...
                </div>
              )}

              {/* DETECTED EXISTING PDF TEXT HOVER TARGETS (Click to edit text directly with exact shape and color!) */}
              {activeSubTool === 'text' &&
                detectedTextItems.map(item => (
                  <div
                    key={item.id}
                    onClick={e => handleEditExistingText(item, e)}
                    style={{
                      left: `${item.xPct}%`,
                      top: `${item.yPct}%`,
                      width: `${item.widthPct}%`,
                      height: `${item.heightPct}%`,
                    }}
                    className="absolute cursor-pointer border border-transparent hover:border-blue-500 hover:bg-blue-500/25 rounded transition-all group z-10"
                    title={`Click to edit: "${item.str}" • ${item.fontFamily} • ${item.fontSize}pt • ${item.isBold ? 'Bold' : 'Regular'}`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-0 bg-blue-600 text-white text-[9px] font-mono px-1 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-30">
                      {item.fontFamily} {item.fontSize}pt {item.isBold ? 'Bold' : ''}
                    </span>
                  </div>
                ))}

              {/* RENDER ACTIVE ANNOTATIONS / EDITED TEXT BOXES WITH ORIGINAL DESIGN */}
              {currentAnnotations.map(ann => {
                const isSelected = ann.id === selectedAnnId;

                if (ann.type === 'text') {
                  const scaledFontSize = Math.max(7, ann.fontSize * displayScale);

                  return (
                    <div
                      key={ann.id}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedAnnId(ann.id);
                      }}
                      onMouseDown={e => handleAnnMouseDown(ann, e)}
                      className={`absolute select-none transition-all ${
                        isSelected
                          ? 'ring-2 ring-blue-500 shadow-xl z-20 cursor-move'
                          : 'hover:ring-1 hover:ring-blue-400 z-10 cursor-pointer'
                      }`}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        minHeight: `${ann.height}%`,
                        backgroundColor: ann.bgColor || 'transparent',
                        borderRadius: '1px',
                      }}
                    >
                      <textarea
                        value={ann.text}
                        onChange={e => updateAnnotation(ann.id, { text: e.target.value })}
                        style={{
                          fontSize: `${scaledFontSize}px`,
                          lineHeight: '1.2',
                          color: ann.color,
                          fontWeight: ann.isBold ? 700 : 400,
                          fontStyle: ann.isItalic ? 'italic' : 'normal',
                          fontFamily: getCssFontFamily(ann.fontFamily),
                          textAlign: ann.textAlign || 'left',
                          backgroundColor: 'transparent',
                          width: '100%',
                          height: '100%',
                        }}
                        className="border-0 outline-none p-0 m-0 resize-none block overflow-hidden leading-tight"
                        rows={Math.max(1, ann.text.split('\n').length)}
                      />

                      {/* Right edge width resize drag handle */}
                      {isSelected && (
                        <div
                          onMouseDown={e => handleResizeMouseDown(ann.id, ann.width, e)}
                          className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-blue-500/50 flex items-center justify-center z-30"
                          title="Drag to resize width"
                        >
                          <div className="w-0.5 h-3 bg-blue-500 rounded-full" />
                        </div>
                      )}

                      {/* Delete button when selected */}
                      {isSelected && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:bg-rose-500 transition z-40"
                          title="Delete text"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                }

                if (ann.type === 'whiteout') {
                  return (
                    <div
                      key={ann.id}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedAnnId(ann.id);
                      }}
                      onMouseDown={e => handleAnnMouseDown(ann, e)}
                      className={`absolute cursor-move ${
                        isSelected ? 'ring-2 ring-blue-500' : 'border border-dashed border-slate-400'
                      }`}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        height: `${ann.height}%`,
                        backgroundColor: ann.fillColor || '#ffffff',
                      }}
                    >
                      {isSelected && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                }

                if (ann.type === 'stamp') {
                  return (
                    <div
                      key={ann.id}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedAnnId(ann.id);
                      }}
                      onMouseDown={e => handleAnnMouseDown(ann, e)}
                      className={`absolute cursor-move select-none p-2 border-2 rounded ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        borderColor: ann.color,
                        color: ann.color,
                        transform: `rotate(${ann.angle || 0}deg)`,
                      }}
                    >
                      <span className="font-black text-sm tracking-widest">{ann.text}</span>
                      {isSelected && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                }

                if (ann.type === 'highlight') {
                  return (
                    <div
                      key={ann.id}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedAnnId(ann.id);
                      }}
                      onMouseDown={e => handleAnnMouseDown(ann, e)}
                      className={`absolute cursor-move ${isSelected ? 'ring-1 ring-blue-500' : ''}`}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        height: `${ann.height}%`,
                        backgroundColor: ann.color || '#fef08a',
                        opacity: ann.opacity ?? 0.45,
                      }}
                    >
                      {isSelected && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </ZoomableContainer>
      </div>
    </div>
  );
};
