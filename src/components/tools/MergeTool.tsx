import React, { useRef, useState } from 'react';
import {
  Combine,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Download,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { mergePdfDocuments } from '../../services/pdfEngine';
import { saveAs } from 'file-saver';
import { PdfDocument } from '../../types/pdf';

interface MergeItem {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  bytes: Uint8Array;
  range: string; // e.g. "1-3" or "" for all
}

interface MergeToolProps {
  currentDocument: PdfDocument | null;
  onOpenMergedDoc: (bytes: Uint8Array, name: string) => Promise<void>;
}

export const MergeTool: React.FC<MergeToolProps> = ({
  currentDocument,
  onOpenMergedDoc,
}) => {
  const [items, setItems] = useState<MergeItem[]>(() => {
    if (!currentDocument) return [];
    return [
      {
        id: `current-${Date.now()}`,
        name: currentDocument.name,
        size: currentDocument.size,
        pageCount: currentDocument.pageCount,
        bytes: currentDocument.bytes,
        range: '',
      },
    ];
  });

  const [isMerging, setIsMerging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: MergeItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        try {
          const doc = await PDFDocument.load(bytes);
          newItems.push({
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            pageCount: doc.getPageCount(),
            bytes,
            range: '',
          });
        } catch {
          console.warn('Could not parse PDF', file.name);
        }
      }
    }

    setItems(prev => [...prev, ...newItems]);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setItems(next);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  const updateRange = (id: string, range: string) => {
    setItems(items.map(it => (it.id === id ? { ...it, range } : it)));
  };

  const handleMergeAndDownload = async (action: 'download' | 'open') => {
    if (items.length < 2 && action === 'download') {
      alert('Please add at least 2 PDF files to merge.');
      return;
    }
    try {
      setIsMerging(true);
      const mergedBytes = await mergePdfDocuments(
        items.map(it => ({ bytes: it.bytes, range: it.range }))
      );

      const mergedName = `merged_${Date.now()}.pdf`;

      if (action === 'download') {
        const blob = new Blob([mergedBytes as unknown as BlobPart], { type: 'application/pdf' });
        saveAs(blob, mergedName);
      } else {
        await onOpenMergedDoc(mergedBytes, mergedName);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to merge PDF files. Please check page range inputs.');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Combine className="w-5 h-5 text-blue-400" />
              Merge Multiple PDFs
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Combine any number of PDF files in your preferred sequence. Specify custom page ranges (e.g. 1-3, 5) per file to merge only the pages you want.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={e => handleAddFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition shadow-sm"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              Add More PDFs
            </button>
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-slate-600"
          >
            {/* File info */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {idx + 1}
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-700/80 flex items-center justify-center text-slate-300 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                  {item.name}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{item.pageCount} pages</span>
                  <span>•</span>
                  <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            </div>

            {/* Range selector & ordering */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-300 shrink-0">Pages:</label>
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5 (or blank for All)"
                  value={item.range}
                  onChange={e => updateRange(item.id, e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44"
                />
              </div>

              {/* Order buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveItem(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-300 disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveItem(idx, 'down')}
                  disabled={idx === items.length - 1}
                  className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-300 disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 ml-1"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-3xl">
            <Combine className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No PDF files added for merge yet.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
            >
              Add First PDF
            </button>
          </div>
        )}
      </div>

      {/* Action Footer */}
      {items.length > 0 && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>
              Total: <strong>{items.length}</strong> PDF documents ready to merge.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleMergeAndDownload('open')}
              disabled={isMerging}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white transition disabled:opacity-50"
            >
              Merge & Open in Editor
            </button>

            <button
              onClick={() => handleMergeAndDownload('download')}
              disabled={isMerging}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isMerging ? 'Merging PDFs...' : 'Download Merged PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
