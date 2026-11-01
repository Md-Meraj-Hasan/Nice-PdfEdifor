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
  Undo2,
} from 'lucide-react';
import { PageClipboard, PageThumbnail, PdfDocument } from '../../types/pdf';
import { reorderPdfPages } from '../../services/pdfEngine';
import { saveAs } from 'file-saver';

interface OrganizeToolProps {
  document: PdfDocument;
  clipboard: PageClipboard | null;
  setClipboard: (clip: PageClipboard | null) => void;
  onUpdateDocumentBytes: (newBytes: Uint8Array, message?: string) => Promise<void>;
}

export const OrganizeTool: React.FC<OrganizeToolProps> = ({
  document,
  clipboard,
  setClipboard,
  onUpdateDocumentBytes,
}) => {
  // Page items represent the current order: { originalIndex: 0-based, pageNumber: 1-based, id }
  const [pages, setPages] = useState<Array<{ originalIndex: number; id: string }>>(() =>
    Array.from({ length: document.pageCount }, (_, i) => ({
      originalIndex: i,
      id: `page-${i}-${Date.now()}`,
    }))
  );

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

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

  // Save changes to PDF
  const handleApplyOrder = async () => {
    try {
      setIsApplying(true);
      const order = pages.map(p => p.originalIndex);
      const newBytes = await reorderPdfPages(document.bytes, order);
      await onUpdateDocumentBytes(newBytes, 'Pages reordered successfully');
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
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Selection and Batch controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/70 hover:bg-slate-600 text-slate-200 transition"
          >
            {selectedIndices.size === pages.length ? (
              <CheckSquare className="w-4 h-4 text-blue-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{selectedIndices.size === pages.length ? 'Deselect All' : 'Select All'}</span>
            {selectedIndices.size > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px]">
                {selectedIndices.size}
              </span>
            )}
          </button>

          <button
            onClick={handleCut}
            disabled={selectedIndices.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/70 hover:bg-slate-600 text-slate-200 disabled:opacity-40 transition"
            title="Cut selected pages to clipboard"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            Cut
          </button>

          <button
            onClick={handleCopy}
            disabled={selectedIndices.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/70 hover:bg-slate-600 text-slate-200 disabled:opacity-40 transition"
            title="Copy selected pages to clipboard"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            Copy
          </button>

          {clipboard && clipboard.pages.length > 0 && (
            <button
              onClick={() => handlePaste(pages.length)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/80 hover:bg-emerald-500 text-white transition animate-pulse"
              title="Paste at the end of the document"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Paste at End ({clipboard.pages.length})
            </button>
          )}

          {selectedIndices.size > 0 && (
            <>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIndices.size})
              </button>

              <button
                onClick={handleExtractSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 transition"
              >
                <FileDown className="w-3.5 h-3.5" />
                Extract ({selectedIndices.size})
              </button>
            </>
          )}

          <button
            onClick={reversePages}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/70 hover:bg-slate-600 text-slate-200 transition"
            title="Reverse order of all pages"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
            Reverse
          </button>
        </div>

        {/* Right: Apply Button */}
        <div>
          <button
            onClick={handleApplyOrder}
            disabled={isApplying}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isApplying ? 'Saving Changes...' : 'Save Page Order'}
          </button>
        </div>
      </div>

      {/* Clipboard Banner */}
      {clipboard && clipboard.pages.length > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Clipboard:</strong> {clipboard.pages.length} page(s) ready to paste. Click &ldquo;Paste Here&rdquo; between any pages below or at the end.
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {pages.map((item, index) => {
          const isSelected = selectedIndices.has(index);
          const thumb = document.thumbnails[item.originalIndex];

          return (
            <div
              key={item.id}
              className={`group relative bg-slate-800/80 rounded-2xl border transition-all flex flex-col overflow-hidden ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'border-slate-700/80 hover:border-slate-600 hover:shadow-md'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-850 border-b border-slate-700/60">
                <button
                  type="button"
                  onClick={() => toggleSelect(index)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                  )}
                  <span>Page {index + 1}</span>
                </button>

                <span className="text-[10px] text-slate-400">
                  (Src #{item.originalIndex + 1})
                </span>
              </div>

              {/* Page Thumbnail Preview */}
              <div
                onClick={() => toggleSelect(index)}
                className="relative aspect-[3/4] bg-white/5 flex items-center justify-center p-2 cursor-pointer overflow-hidden"
              >
                {thumb?.dataUrl ? (
                  <img
                    src={thumb.dataUrl}
                    alt={`Page ${index + 1}`}
                    className="max-h-full max-w-full object-contain rounded shadow-sm bg-white"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-center text-slate-500">
                    <Layers className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-xs">Page {index + 1}</span>
                  </div>
                )}

                {/* Overlay hover actions */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      movePage(index, index - 1);
                    }}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-30"
                    title="Move Left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      duplicatePage(index);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                    title="Duplicate Page"
                  >
                    <CopyPlus className="w-3.5 h-3.5 text-blue-300" />
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deletePage(index);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 text-red-400 hover:bg-red-950/60"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      movePage(index, index + 1);
                    }}
                    disabled={index === pages.length - 1}
                    className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-30"
                    title="Move Right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Footer: Paste trigger if clipboard is present */}
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
    </div>
  );
};
