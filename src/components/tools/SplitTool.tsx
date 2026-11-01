import React, { useState, useEffect, useMemo } from 'react';
import {
  Split,
  FileArchive,
  Download,
  CheckCircle2,
  ListFilter,
  FileStack,
  Layers,
  Sparkles,
  Settings2,
  X,
  ArrowRight,
  FileText,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { PdfDocument, SplitMode } from '../../types/pdf';
import { splitPdfDocuments, createZipFromPdfList, parsePageRange } from '../../services/pdfEngine';
import { saveAs } from 'file-saver';

interface SplitToolProps {
  document: PdfDocument;
  onOpenSplitDoc?: (bytes: Uint8Array, fileName: string) => void;
}

type SplitPresetType = 'pairs-2' | 'pairs-3' | 'every-n' | 'single' | 'ranges' | 'odd-even' | 'orientation';

export const SplitTool: React.FC<SplitToolProps> = ({ document, onOpenSplitDoc }) => {
  // Selected preset / mode
  const [activePreset, setActivePreset] = useState<SplitPresetType>('pairs-2');
  const [everyN, setEveryN] = useState<number>(2);
  const [customRanges, setCustomRanges] = useState<string>('1-2, 3');
  
  // Center Modal Popup state for inputs
  const [showInputModal, setShowInputModal] = useState<boolean>(false);
  const [modalTargetMode, setModalTargetMode] = useState<'every-n' | 'ranges'>('every-n');
  const [tempEveryN, setTempEveryN] = useState<number>(2);
  const [tempRanges, setTempRanges] = useState<string>('');

  const [isSplitting, setIsSplitting] = useState(false);
  const [splitResults, setSplitResults] = useState<{ name: string; bytes: Uint8Array }[] | null>(null);

  // Set default range suggestion based on document page count
  useEffect(() => {
    if (document.pageCount <= 2) {
      setCustomRanges('1, 2');
    } else {
      const half = Math.ceil(document.pageCount / 2);
      setCustomRanges(`1-${half}, ${half + 1}-${document.pageCount}`);
    }
  }, [document.pageCount]);

  // Map activePreset to engine SplitMode and options
  const currentEngineConfig = useMemo(() => {
    switch (activePreset) {
      case 'pairs-2':
        return { mode: 'everyN' as SplitMode, options: { everyN: 2 } };
      case 'pairs-3':
        return { mode: 'everyN' as SplitMode, options: { everyN: 3 } };
      case 'every-n':
        return { mode: 'everyN' as SplitMode, options: { everyN: Math.max(1, everyN) } };
      case 'single':
        return { mode: 'single' as SplitMode, options: {} };
      case 'ranges':
        return { mode: 'ranges' as SplitMode, options: { customRanges } };
      case 'odd-even':
        return { mode: 'odd-even' as SplitMode, options: {} };
      case 'orientation':
        return { mode: 'byOrientation' as SplitMode, options: {} };
      default:
        return { mode: 'everyN' as SplitMode, options: { everyN: 2 } };
    }
  }, [activePreset, everyN, customRanges]);

  // Calculate planned parts preview for visual inspection
  const plannedParts = useMemo(() => {
    const total = document.pageCount;
    const parts: { title: string; pages: number[]; desc: string }[] = [];

    if (activePreset === 'pairs-2' || activePreset === 'pairs-3' || activePreset === 'every-n') {
      const n = activePreset === 'pairs-2' ? 2 : activePreset === 'pairs-3' ? 3 : Math.max(1, everyN);
      let partNum = 1;
      for (let i = 1; i <= total; i += n) {
        const end = Math.min(i + n - 1, total);
        const pList: number[] = [];
        for (let p = i; p <= end; p++) pList.push(p);
        parts.push({
          title: `Part ${partNum}`,
          pages: pList,
          desc: i === end ? `Page ${i}` : `Pages ${i}–${end} (${pList.length} pages)`,
        });
        partNum++;
      }
    } else if (activePreset === 'single') {
      for (let i = 1; i <= total; i++) {
        parts.push({
          title: `Page ${i}`,
          pages: [i],
          desc: `Single page PDF (${i}/${total})`,
        });
      }
    } else if (activePreset === 'ranges') {
      const rawChunks = customRanges.split(',').map(s => s.trim()).filter(Boolean);
      rawChunks.forEach((chunk, idx) => {
        const indices = parsePageRange(chunk, total);
        const pList = indices.map(i => i + 1);
        parts.push({
          title: `Range ${idx + 1}`,
          pages: pList,
          desc: `${chunk} (${pList.length} pages)`,
        });
      });
    } else if (activePreset === 'odd-even') {
      const oddList: number[] = [];
      const evenList: number[] = [];
      for (let i = 1; i <= total; i++) {
        if (i % 2 !== 0) oddList.push(i);
        else evenList.push(i);
      }
      if (oddList.length) {
        parts.push({
          title: 'Odd Pages',
          pages: oddList,
          desc: `${oddList.length} pages (${oddList.slice(0, 4).join(', ')}${oddList.length > 4 ? '...' : ''})`,
        });
      }
      if (evenList.length) {
        parts.push({
          title: 'Even Pages',
          pages: evenList,
          desc: `${evenList.length} pages (${evenList.slice(0, 4).join(', ')}${evenList.length > 4 ? '...' : ''})`,
        });
      }
    } else if (activePreset === 'orientation') {
      parts.push({
        title: 'Portrait Pages',
        pages: [],
        desc: 'All vertical pages',
      });
      parts.push({
        title: 'Landscape Pages',
        pages: [],
        desc: 'All horizontal pages',
      });
    }

    return parts;
  }, [activePreset, everyN, customRanges, document.pageCount]);

  // Execute the split
  const handleExecuteSplit = async () => {
    try {
      setIsSplitting(true);
      const results = await splitPdfDocuments(
        document.bytes,
        currentEngineConfig.mode,
        currentEngineConfig.options
      );

      if (results.length === 0) {
        alert('No files were generated. Please check your range settings.');
        return;
      }

      setSplitResults(results);
    } catch (err) {
      console.error(err);
      alert('Error during split operation. Please verify page numbers.');
    } finally {
      setIsSplitting(false);
    }
  };

  // Open modal popup for input
  const openInputModalFor = (modeType: 'every-n' | 'ranges') => {
    setModalTargetMode(modeType);
    if (modeType === 'every-n') {
      setTempEveryN(everyN);
    } else {
      setTempRanges(customRanges);
    }
    setShowInputModal(true);
  };

  // Apply modal inputs
  const handleSaveModalInput = (andExecute = false) => {
    if (modalTargetMode === 'every-n') {
      const validN = Math.max(1, tempEveryN);
      setEveryN(validN);
      if (validN === 2) setActivePreset('pairs-2');
      else if (validN === 3) setActivePreset('pairs-3');
      else setActivePreset('every-n');
    } else {
      setCustomRanges(tempRanges || '1');
      setActivePreset('ranges');
    }
    setSplitResults(null);
    setShowInputModal(false);

    if (andExecute) {
      setTimeout(() => {
        handleExecuteSplit();
      }, 50);
    }
  };

  // Download all split files as a ZIP archive
  const handleDownloadAllZip = async () => {
    if (!splitResults || splitResults.length === 0) return;
    try {
      const zipBlob = await createZipFromPdfList(splitResults);
      saveAs(zipBlob, `split_${document.name.replace('.pdf', '')}_files.zip`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate ZIP archive');
    }
  };

  const handleDownloadSingleResult = (item: { name: string; bytes: Uint8Array }) => {
    const blob = new Blob([item.bytes as unknown as BlobPart], { type: 'application/pdf' });
    saveAs(blob, item.name);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* SINGLE HORIZONTAL LINE SPLIT TOOLBAR */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          {/* Label / Icon */}
          <div className="flex items-center gap-2 pl-1 pr-3 border-r border-slate-800 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Split className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-white block leading-none">Split Mode</span>
              <span className="text-[10px] text-slate-400">{document.pageCount} pages</span>
            </div>
          </div>

          {/* HORIZONTAL SINGLE-LINE BUTTON OPTIONS */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar py-0.5">
            {/* 1. 2 Pages Pair (Direct 1-Click) */}
            <button
              onClick={() => {
                setActivePreset('pairs-2');
                setEveryN(2);
                setSplitResults(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activePreset === 'pairs-2'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/40 ring-1 ring-purple-400/30'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-300" />
              <span>2 Pages Pair</span>
              <span className="text-[10px] opacity-75 hidden md:inline">(1-2, 3-4...)</span>
            </button>

            {/* 2. 3 Pages Pair (Direct 1-Click) */}
            <button
              onClick={() => {
                setActivePreset('pairs-3');
                setEveryN(3);
                setSplitResults(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activePreset === 'pairs-3'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/40 ring-1 ring-purple-400/30'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-300" />
              <span>3 Pages Pair</span>
              <span className="text-[10px] opacity-75 hidden md:inline">(1-3, 4-6...)</span>
            </button>

            {/* 3. Every N-Page Chunks (Opens center popup for custom N) */}
            <button
              onClick={() => {
                openInputModalFor('every-n');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activePreset === 'every-n' && everyN !== 2 && everyN !== 3
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-purple-300" />
              <span>Custom N Pages {activePreset === 'every-n' && `(${everyN})`}</span>
            </button>

            {/* 4. Every Single Page (1 page each) */}
            <button
              onClick={() => {
                setActivePreset('single');
                setSplitResults(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activePreset === 'single'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/40'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileStack className="w-3.5 h-3.5 text-purple-300" />
              <span>Single Pages</span>
              <span className="text-[10px] opacity-75 hidden lg:inline">(1 pg each)</span>
            </button>

            {/* 5. Custom Range Chunks (Opens center popup) */}
            <button
              onClick={() => {
                openInputModalFor('ranges');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activePreset === 'ranges'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/40'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-purple-300" />
              <span>Custom Range...</span>
            </button>

            {/* 6. Odd & Even */}
            <button
              onClick={() => {
                setActivePreset('odd-even');
                setSplitResults(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activePreset === 'odd-even'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/40'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-purple-300" />
              <span>Odd / Even</span>
            </button>

            {/* 7. By Orientation */}
            <button
              onClick={() => {
                setActivePreset('orientation');
                setSplitResults(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activePreset === 'orientation'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/40'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-300" />
              <span>Orientation</span>
            </button>
          </div>

          {/* ACTION BUTTON: SPLIT NOW */}
          <div className="shrink-0 pl-2 border-l border-slate-800">
            <button
              onClick={handleExecuteSplit}
              disabled={isSplitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-900/30 active:scale-95 transition disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSplitting ? 'Splitting...' : `Split (${plannedParts.length} files)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* COMPACT STATUS / SETTING SUMMARY STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="font-semibold text-white">Active Split Mode:</span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
            {activePreset === 'pairs-2' && '2 Pages Pair (1-2, 3-4, 5-6...)'}
            {activePreset === 'pairs-3' && '3 Pages Pair (1-3, 4-6, 7-9...)'}
            {activePreset === 'every-n' && `Every ${everyN} Pages per file`}
            {activePreset === 'single' && 'Individual Single Pages (1 page each)'}
            {activePreset === 'ranges' && `Custom Range: "${customRanges}"`}
            {activePreset === 'odd-even' && 'Odd and Even Pages into 2 files'}
            {activePreset === 'orientation' && 'Portrait vs Landscape files'}
          </span>
          <span className="text-slate-400 hidden sm:inline">
            → Will produce <strong className="text-white">{plannedParts.length}</strong> individual PDF files
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(activePreset === 'pairs-2' || activePreset === 'pairs-3' || activePreset === 'every-n') && (
            <button
              onClick={() => openInputModalFor('every-n')}
              className="text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" /> Change Pair/Chunk Size
            </button>
          )}

          {activePreset === 'ranges' && (
            <button
              onClick={() => openInputModalFor('ranges')}
              className="text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" /> Change Range Input
            </button>
          )}
        </div>
      </div>

      {/* SPLIT RESULTS SECTION (When completed) */}
      {splitResults && splitResults.length > 0 && (
        <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Successfully Generated {splitResults.length} Individual PDF Files!
                </h3>
                <p className="text-xs text-slate-400">
                  Ready to download individually or as a single combined ZIP package.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadAllZip}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition active:scale-95 whitespace-nowrap"
              >
                <FileArchive className="w-4 h-4" />
                <span>Download All ({splitResults.length} PDFs) as ZIP</span>
              </button>
            </div>
          </div>

          {/* List of Generated Split Files */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {splitResults.map((res, i) => (
              <div
                key={i}
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-2 hover:border-slate-600 transition"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate" title={res.name}>
                    {res.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {(res.bytes.length / 1024).toFixed(1)} KB
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onOpenSplitDoc && (
                    <button
                      onClick={() => onOpenSplitDoc(res.bytes, res.name)}
                      className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-blue-600/30 text-blue-400 transition"
                      title="Open in editor"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadSingleResult(res)}
                    className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-emerald-600/30 text-emerald-400 transition"
                    title="Download this file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISUAL PREVIEW OF PLANNED SPLIT CHUNKS */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>Planned Split Files Preview</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-normal">
                {plannedParts.length} files will be created
              </span>
            </h3>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Each card below will be generated as a separate PDF file
          </span>
        </div>

        {/* Visual Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto p-1">
          {plannedParts.map((part, pIdx) => (
            <div
              key={pIdx}
              className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex flex-col justify-between hover:border-purple-500/50 transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-300 group-hover:text-purple-200">
                    {part.title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 font-mono">
                    {part.pages.length} {part.pages.length === 1 ? 'page' : 'pages'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5 truncate">{part.desc}</p>

                {/* Page Thumbnails inside this chunk */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {part.pages.map(pageNum => {
                    const thumb = document.thumbnails[pageNum - 1];
                    return (
                      <div
                        key={pageNum}
                        className="relative w-12 h-16 rounded border border-slate-700 bg-white/5 overflow-hidden shrink-0 flex items-center justify-center"
                      >
                        {thumb?.dataUrl ? (
                          <img
                            src={thumb.dataUrl}
                            alt={`Page ${pageNum}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] text-slate-400">P.{pageNum}</span>
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-slate-900/90 text-white text-[8px] font-bold text-center leading-tight py-0.5">
                          {pageNum}
                        </span>
                      </div>
                    );
                  })}
                  {part.pages.length === 0 && (
                    <span className="text-[10px] text-slate-500 italic py-2">
                      Filtered by page dimensions
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER POPUP MODAL FOR INPUT CONFIGURATION */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                  {modalTargetMode === 'every-n' ? (
                    <Layers className="w-5 h-5" />
                  ) : (
                    <ListFilter className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {modalTargetMode === 'every-n'
                      ? 'Split by N-Page Pairs / Chunks'
                      : 'Custom Page Ranges'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Total document size: {document.pageCount} pages
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowInputModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Mode 1 - N Pages / Pairs */}
            {modalTargetMode === 'every-n' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Quick Presets (Pages per individual file):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { n: 2, label: '2 Pages Pair', desc: '1-2, 3-4, 5-6...' },
                      { n: 3, label: '3 Pages Pair', desc: '1-3, 4-6, 7-9...' },
                      { n: 4, label: '4 Pages Block', desc: '1-4, 5-8...' },
                      { n: 5, label: '5 Pages Block', desc: '1-5, 6-10...' },
                    ].map(item => (
                      <button
                        key={item.n}
                        type="button"
                        onClick={() => setTempEveryN(item.n)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          tempEveryN === item.n
                            ? 'bg-purple-600/20 border-purple-500 text-white'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-bold text-xs">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Or Enter Custom Number of Pages (N):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={document.pageCount}
                    value={tempEveryN}
                    onChange={e => setTempEveryN(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Splits the PDF into equal blocks of {tempEveryN} page(s) each.
                    Will create approx. <strong className="text-white">{Math.ceil(document.pageCount / Math.max(1, tempEveryN))}</strong> separate files.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Body: Mode 2 - Custom Ranges */}
            {modalTargetMode === 'ranges' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Enter Comma-Separated Page Ranges:
                  </label>
                  <input
                    type="text"
                    value={tempRanges}
                    onChange={e => setTempRanges(e.target.value)}
                    placeholder={`e.g. 1-2, 3-4, 5-${document.pageCount}`}
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Example: <code className="text-purple-300">1-2, 3</code> creates two PDFs: one containing pages 1–2, and another with page 3.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Quick Suggestions:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {document.pageCount >= 4 && (
                      <button
                        type="button"
                        onClick={() => setTempRanges(`1-2, 3-${document.pageCount}`)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                      >
                        1-2, 3-{document.pageCount}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.ceil(document.pageCount / 2);
                        setTempRanges(`1-${half}, ${half + 1}-${document.pageCount}`);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                    >
                      Halves (1-{Math.ceil(document.pageCount / 2)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempRanges(`1, 2-${document.pageCount}`)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                    >
                      Cover page & Rest
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowInputModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSaveModalInput(true)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/40 transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Confirm & Split Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
