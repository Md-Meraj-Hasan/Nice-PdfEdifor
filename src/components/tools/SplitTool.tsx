import React, { useState } from 'react';
import {
  Split,
  FileArchive,
  Download,
  CheckCircle2,
  ListFilter,
  FileStack,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PdfDocument, SplitMode } from '../../types/pdf';
import { splitPdfDocuments, createZipFromPdfList } from '../../services/pdfEngine';
import { saveAs } from 'file-saver';

interface SplitToolProps {
  document: PdfDocument;
}

export const SplitTool: React.FC<SplitToolProps> = ({ document }) => {
  const [mode, setMode] = useState<SplitMode>('ranges');
  const [customRanges, setCustomRanges] = useState<string>('1-2, 3');
  const [everyN, setEveryN] = useState<number>(2);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitResults, setSplitResults] = useState<{ name: string; bytes: Uint8Array }[] | null>(null);

  // Set default range suggestion on load based on doc pageCount
  React.useEffect(() => {
    if (document.pageCount <= 2) {
      setCustomRanges('1, 2');
    } else {
      const half = Math.ceil(document.pageCount / 2);
      setCustomRanges(`1-${half}, ${half + 1}-${document.pageCount}`);
    }
  }, [document.pageCount]);

  const handleExecuteSplit = async () => {
    try {
      setIsSplitting(true);
      const results = await splitPdfDocuments(document.bytes, mode, {
        customRanges,
        everyN,
      });

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

  const handleDownloadAllZip = async () => {
    if (!splitResults || splitResults.length === 0) return;
    try {
      const zipBlob = await createZipFromPdfList(splitResults);
      saveAs(zipBlob, `split_${document.name.replace('.pdf', '')}_all_pages.zip`);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Split className="w-5 h-5 text-purple-400" />
          Split PDF by Any Condition
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Separate this {document.pageCount}-page PDF into multiple files based on page ranges, every N pages, individual single pages, or odd/even pages.
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Custom Ranges */}
        <div
          onClick={() => {
            setMode('ranges');
            setSplitResults(null);
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            mode === 'ranges'
              ? 'bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
            <ListFilter className="w-4 h-4 text-purple-400" />
            Custom Page Ranges
          </div>
          <p className="text-xs text-slate-400">
            Define custom chunks e.g. &ldquo;1-3, 4-5, 6-10&rdquo;.
          </p>
        </div>

        {/* Every Single Page */}
        <div
          onClick={() => {
            setMode('single');
            setSplitResults(null);
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            mode === 'single'
              ? 'bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
            <FileStack className="w-4 h-4 text-purple-400" />
            Every Single Page
          </div>
          <p className="text-xs text-slate-400">
            Split into {document.pageCount} separate 1-page PDF files.
          </p>
        </div>

        {/* Every N Pages */}
        <div
          onClick={() => {
            setMode('everyN');
            setSplitResults(null);
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            mode === 'everyN'
              ? 'bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
            <Layers className="w-4 h-4 text-purple-400" />
            Every N Pages
          </div>
          <p className="text-xs text-slate-400">
            Split into equal blocks of N pages each.
          </p>
        </div>

        {/* Odd and Even Pages */}
        <div
          onClick={() => {
            setMode('odd-even');
            setSplitResults(null);
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            mode === 'odd-even'
              ? 'bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
            <Split className="w-4 h-4 text-purple-400" />
            Odd & Even Pages
          </div>
          <p className="text-xs text-slate-400">
            Extract into 2 files: Odd pages and Even pages.
          </p>
        </div>

        {/* Portrait vs Landscape */}
        <div
          onClick={() => {
            setMode('byOrientation');
            setSplitResults(null);
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            mode === 'byOrientation'
              ? 'bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
            <Layers className="w-4 h-4 text-purple-400" />
            By Page Orientation
          </div>
          <p className="text-xs text-slate-400">
            Separate portrait pages and landscape pages.
          </p>
        </div>
      </div>

      {/* Mode Specific Configurator */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-4">
        {mode === 'ranges' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Specify Page Ranges (Comma-separated, 1 to {document.pageCount}):
            </label>
            <input
              type="text"
              value={customRanges}
              onChange={e => {
                setCustomRanges(e.target.value);
                setSplitResults(null);
              }}
              placeholder={`e.g. 1-2, 3-${document.pageCount}`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Example: &ldquo;1-2, 3&rdquo; creates two PDFs: one containing pages 1 to 2, and another with page 3.
            </p>
          </div>
        )}

        {mode === 'everyN' && (
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chunk Size (N pages per file):
              </label>
              <input
                type="number"
                min="1"
                max={document.pageCount}
                value={everyN}
                onChange={e => {
                  setEveryN(parseInt(e.target.value, 10) || 1);
                  setSplitResults(null);
                }}
                className="w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <p className="text-xs text-slate-400 self-end mb-2">
              Will generate approx. {Math.ceil(document.pageCount / Math.max(1, everyN))} files.
            </p>
          </div>
        )}

        {mode === 'single' && (
          <p className="text-xs text-slate-300">
            Every page from 1 to {document.pageCount} will be exported as an independent single-page PDF document.
          </p>
        )}

        {mode === 'odd-even' && (
          <p className="text-xs text-slate-300">
            This will produce two files: one with odd-numbered pages (1, 3, 5...) and one with even-numbered pages (2, 4, 6...).
          </p>
        )}

        {mode === 'byOrientation' && (
          <p className="text-xs text-slate-300">
            This will group portrait-oriented pages into one file and landscape-oriented pages into another.
          </p>
        )}

        <button
          onClick={handleExecuteSplit}
          disabled={isSplitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 active:scale-95 transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {isSplitting ? 'Splitting PDF...' : 'Process Split'}
        </button>
      </div>

      {/* Split Results Section */}
      {splitResults && (
        <div className="bg-slate-800/90 border border-emerald-500/40 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Generated {splitResults.length} Split PDF Files Successfully!
            </div>

            <button
              onClick={handleDownloadAllZip}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 transition active:scale-95"
            >
              <FileArchive className="w-4 h-4" />
              Download All as ZIP Archive
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
            {splitResults.map((res, i) => (
              <div
                key={i}
                className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{res.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {(res.bytes.length / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingleResult(res)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
                  title="Download this file"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
