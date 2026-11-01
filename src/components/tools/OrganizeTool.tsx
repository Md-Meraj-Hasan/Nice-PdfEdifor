import React, { useState } from 'react';
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  CopyPlus,
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Square,
  FileDown,
  Layers,
  Sparkles,
  Maximize2,
  X,
  RotateCw,
  RotateCcw,
  Type,
  ScanText,
  Crop,
  Eye,
} from 'lucide-react';
import { PageClipboard, PageThumbnail, PdfDocument, ToolId } from '../../types/pdf';
import { reorderPdfPages, rotatePdfPages } from '../../services/pdfEngine';
import { SelectionActionBar } from '../SelectionActionBar';
import { ZoomableContainer } from '../ZoomableContainer';
import { saveAs } from 'file-saver';

interface OrganizeToolProps {
  document: PdfDocument;
  clipboard: PageClipboard | null;
  setClipboard: (clip: PageClipboard | null) => void;
  onUpdateDocumentBytes: (
    newBytes: Uint8Array,
    message?: string,
    skipHistoryPush?: boolean,
    changedPageNumbers?: number[],
    updatedThumbnailsDirect?: PageThumbnail[]
  ) => Promise<void>;
  onNavigateToTool?: (tool: ToolId, pageNumber?: number) => void;
}

export const OrganizeTool: React.FC<OrganizeToolProps> = ({
  document,
  clipboard,
  setClipboard,
  onUpdateDocumentBytes,
  onNavigateToTool,
}) => {
  // Page items represent the current order: { originalIndex: 0-based, id }
  const [pages, setPages] = useState<Array<{ originalIndex: number; id: string }>>(() =>
    Array.from({ length: document.pageCount }, (_, i) => ({
      originalIndex: i,
      id: `page-${i}-${Date.now()}`,
    }))
  );

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [zoomModalPage, setZoomModalPage] = useState<number | null>(null);

  // Sync if pageCount changes
  React.useEffect(() => {
    setPages(
      Array.from({ length: document.pageCount }, (_, i) => ({
        originalIndex: i,
        id: `page-${i}`,
      }))
    );
    setSelectedIndices(new Set());
  }, [document.pageCount]);

  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const selectAll = () => {
    if (selectedIndices.size === pages.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(pages.map((_, i) => i)));
    }
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const next = [...pages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setPages(next);
  };

  const duplicatePage = (index: number) => {
    const target = pages[index];
    const next = [...pages];
    next.splice(index + 1, 0, {
      originalIndex: target.originalIndex,
      id: `dup-${Date.now()}-${Math.random()}`,
    });
    setPages(next);
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      alert('A document must have at least one page.');
      return;
    }
    const next = pages.filter((_, i) => i !== index);
    setPages(next);
    const nextSel = new Set(selectedIndices);
    nextSel.delete(index);
    setSelectedIndices(nextSel);
  };

  const deleteSelected = () => {
    if (selectedIndices.size === 0) return;
    if (selectedIndices.size >= pages.length) {
      alert('Cannot delete all pages in the document.');
      return;
    }
    const next = pages.filter((_, i) => !selectedIndices.has(i));
    setPages(next);
    setSelectedIndices(new Set());
  };

  const reversePages = () => {
    setPages([...pages].reverse());
  };

  // Cut & Copy
  const handleCut = () => {
    if (selectedIndices.size === 0) {
      alert('Please select at least one page to cut.');
      return;
    }
    const cutItems = Array.from(selectedIndices).map(idx => ({
      pageNumber: pages[idx].originalIndex + 1,
      thumbnail: document.thumbnails[pages[idx].originalIndex]?.dataUrl,
    }));

    setClipboard({
      pages: cutItems,
      sourceDocId: document.id,
      isCut: true,
    });

    // Remove cut pages from current view
    const remaining = pages.filter((_, i) => !selectedIndices.has(i));
    setPages(remaining);
    setSelectedIndices(new Set());
  };

  const handleCopy = () => {
    if (selectedIndices.size === 0) {
      alert('Please select at least one page to copy.');
      return;
    }
    const copiedItems = Array.from(selectedIndices).map(idx => ({
      pageNumber: pages[idx].originalIndex + 1,
      thumbnail: document.thumbnails[pages[idx].originalIndex]?.dataUrl,
    }));

    setClipboard({
      pages: copiedItems,
      sourceDocId: document.id,
      isCut: false,
    });
  };

  // Paste
  const handlePaste = (targetIndex: number) => {
    if (!clipboard || clipboard.pages.length === 0) return;

    const toInsert = clipboard.pages.map(item => ({
      originalIndex: item.pageNumber - 1,
      id: `paste-${Date.now()}-${Math.random()}`,
    }));

    const next = [...pages];
    next.splice(targetIndex, 0, ...toInsert);
    setPages(next);

    // If it was cut, clear clipboard
    if (clipboard.isCut) {
      setClipboard(null);
    }
  };

  // Rotate selected pages directly with fast incremental reload
  const handleRotateSelected = async (targetAngle: number) => {
    if (selectedIndices.size === 0) return;
    try {
      setIsApplying(true);
      const originalSelected = Array.from(selectedIndices).map(idx => pages[idx].originalIndex);
      const newBytes = await rotatePdfPages(
        document.bytes,
        targetAngle,
        'selected',
        originalSelected
      );
      // Pass only the changed page numbers so other pages are not reloaded!
      const changedPageNums = originalSelected.map(i => i + 1);
      await onUpdateDocumentBytes(
        newBytes,
        `Rotated ${originalSelected.length} page(s) by ${targetAngle}°`,
        false,
        changedPageNums
      );
    } catch (err) {
      console.error(err);
      alert('Failed to rotate pages');
    } finally {
      setIsApplying(false);
    }
  };

  // Duplicate selected pages in batch
  const handleDuplicateSelected = () => {
    if (selectedIndices.size === 0) return;
    const sorted = Array.from(selectedIndices).sort((a, b) => b - a);
    const next = [...pages];
    for (const idx of sorted) {
      next.splice(idx + 1, 0, {
        originalIndex: pages[idx].originalIndex,
        id: `dup-${Date.now()}-${Math.random()}`,
      });
    }
    setPages(next);
    setSelectedIndices(new Set());
  };

  // Save changes to PDF with instant 0ms thumbnail update
  const handleApplyOrder = async () => {
    try {
      setIsApplying(true);
      const order = pages.map(p => p.originalIndex);
      const newBytes = await reorderPdfPages(document.bytes, order);

      // Instantly reuse existing thumbnails mapped to new order
      const directThumbnails = order.map((originalIdx, newIdx) => ({
        ...document.thumbnails[originalIdx],
        pageNumber: newIdx + 1,
      }));

      await onUpdateDocumentBytes(
        newBytes,
        'Pages reordered successfully',
        false,
        undefined,
        directThumbnails
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update PDF pages');
    } finally {
      setIsApplying(false);
    }
  };

  // Extract selected pages as new PDF
  const handleExtractSelected = async () => {
    if (selectedIndices.size === 0) {
      alert('Select pages to extract');
      return;
    }
    try {
      setIsApplying(true);
      const order = Array.from(selectedIndices).map(idx => pages[idx].originalIndex);
      const extractedBytes = await reorderPdfPages(document.bytes, order);
      const blob = new Blob([extractedBytes as unknown as BlobPart], { type: 'application/pdf' });
      saveAs(blob, `extracted_${document.name}`);
    } catch (err) {
      console.error(err);
      alert('Failed to extract pages');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-12">
      {/* Single-Line Top Status & Quick Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-md text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="font-bold text-white">{pages.length} Pages</span>
          <span className="text-slate-400 hidden sm:inline">• Tap any page to select & apply tools below</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>{selectedIndices.size === pages.length ? 'Deselect All' : 'Select All'}</span>
          </button>

          <button
            onClick={reversePages}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition"
            title="Reverse order of all pages"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Reverse</span>
          </button>

          <button
            onClick={handleApplyOrder}
            disabled={isApplying}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 active:scale-95 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isApplying ? 'Saving...' : 'Save Order'}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Page Navigation Strip (1, 2, 3, 4, 5...) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-1.5 flex items-center justify-between gap-2 shadow-sm text-xs">
        <span className="font-bold text-slate-400 shrink-0 text-[11px]">Pages:</span>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {pages.map((_, i) => {
            const pNum = i + 1;
            const isSelected = selectedIndices.has(i);
            return (
              <button
                key={pNum}
                type="button"
                onClick={() => {
                  toggleSelect(i);
                }}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-bold transition shrink-0 flex items-center justify-center border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40 scale-105'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
                }`}
                title={`Select / Toggle Page ${pNum}`}
              >
                {pNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clipboard Banner */}
      {clipboard && clipboard.pages.length > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Clipboard:</strong> {clipboard.pages.length} page(s) ready to paste. Click &ldquo;Paste After&rdquo; on any card below or paste at end.
            </span>
          </div>
          <button
            onClick={() => setClipboard(null)}
            className="text-xs text-slate-400 hover:text-white underline ml-3"
          >
            Clear
          </button>
        </div>
      )}

      {/* Pages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {pages.map((item, index) => {
          const isSelected = selectedIndices.has(index);
          const thumb = document.thumbnails[item.originalIndex];

          return (
            <div
              key={item.id}
              className={`group relative bg-slate-800/80 rounded-2xl border transition-all flex flex-col overflow-hidden ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-xl shadow-blue-500/20 scale-[1.01]'
                  : 'border-slate-700/80 hover:border-slate-600 hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-850 border-b border-slate-700/60">
                <button
                  type="button"
                  onClick={() => toggleSelect(index)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                  )}
                  <span>Page {index + 1}</span>
                </button>

                <div className="flex items-center gap-1">
                  {/* Quick Zoom Inspect Button */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setZoomModalPage(item.originalIndex + 1);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-750 transition"
                    title="2-Finger Zoom & Inspect Page"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] text-slate-500">
                    #{item.originalIndex + 1}
                  </span>
                </div>
              </div>

              {/* Page Thumbnail Preview (Always 100% visible, no darkening overlay) */}
              <div
                onClick={() => toggleSelect(index)}
                className={`relative aspect-[3/4] p-1.5 cursor-pointer flex items-center justify-center transition-all bg-white/5 ${
                  isSelected ? 'bg-blue-600/10' : ''
                }`}
              >
                {thumb?.dataUrl ? (
                  <img
                    src={thumb.dataUrl}
                    alt={`Page ${index + 1}`}
                    className={`max-h-full max-w-full object-contain rounded shadow-sm bg-white transition-all ${
                      isSelected ? 'ring-2 ring-blue-500 shadow-md shadow-blue-500/30' : ''
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <div className="text-center text-slate-500">
                    <Layers className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-xs">Page {index + 1}</span>
                  </div>
                )}

                {/* Selected Indicator Badge (in corner, does not cover text) */}
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border border-white/60">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Card Footer: Quick Rearrange Controls (Below thumbnail, never covers content) */}
              <div className="flex items-center justify-between px-2 py-1 bg-slate-900/90 border-t border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    movePage(index, index - 1);
                  }}
                  disabled={index === 0}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition"
                  title="Move Left"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      duplicatePage(index);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                    title="Duplicate Page"
                  >
                    <CopyPlus className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      deletePage(index);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    movePage(index, index + 1);
                  }}
                  disabled={index === pages.length - 1}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition"
                  title="Move Right"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Paste trigger if clipboard is present */}
              {clipboard && (
                <button
                  type="button"
                  onClick={() => handlePaste(index + 1)}
                  className="w-full py-1.5 px-2 bg-emerald-950/30 hover:bg-emerald-900/60 text-emerald-300 border-t border-emerald-800/40 text-[10px] font-semibold flex items-center justify-center gap-1 transition"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  Paste After
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Single-Line Horizontal Action Bar for Selected Pages */}
      <SelectionActionBar
        selectedIndices={Array.from(selectedIndices)}
        totalPageCount={pages.length}
        onClearSelection={() => setSelectedIndices(new Set())}
        onSelectAll={selectAll}
        onRotateSelected={handleRotateSelected}
        onCutSelected={handleCut}
        onCopySelected={handleCopy}
        onDeleteSelected={deleteSelected}
        onDuplicateSelected={handleDuplicateSelected}
        onExtractSelected={handleExtractSelected}
        onOpenToolWithPage={(tool, pageNum) => {
          if (onNavigateToTool) {
            onNavigateToTool(tool, pageNum);
          }
        }}
        onApplyChanges={handleApplyOrder}
        isApplying={isApplying}
      />

      {/* Full-Screen 2-Finger Pinch Zoom Modal */}
      {zoomModalPage !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl h-[85vh] bg-slate-900 border border-slate-700 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  Page {zoomModalPage} of {document.pageCount}
                </span>
                <span className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  2-Finger Pinch to Zoom
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Rotate directly inside zoom modal */}
                <button
                  onClick={async () => {
                    await handleRotateSelected(90);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setZoomModalPage(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body with 2-Finger Zoomable Container */}
            <div className="flex-1 overflow-hidden p-2 sm:p-4 flex items-center justify-center bg-slate-950">
              <ZoomableContainer className="w-full h-full">
                {document.thumbnails[zoomModalPage - 1]?.dataUrl ? (
                  <img
                    src={document.thumbnails[zoomModalPage - 1].dataUrl}
                    alt={`Page ${zoomModalPage}`}
                    className="max-h-full max-w-full object-contain rounded shadow-2xl bg-white"
                  />
                ) : (
                  <div className="text-slate-400 text-sm">Preview unavailable</div>
                )}
              </ZoomableContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
