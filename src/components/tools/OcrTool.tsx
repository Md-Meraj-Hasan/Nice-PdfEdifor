import React, { useState } from 'react';
import {
  ScanText,
  Copy,
  Download,
  Check,
  Search,
  Sparkles,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { PdfDocument } from '../../types/pdf';
import { performPdfOcr, OcrPageResult, OcrProgress } from '../../services/ocrEngine';
import { saveAs } from 'file-saver';

interface OcrToolProps {
  document: PdfDocument;
}

export const OcrTool: React.FC<OcrToolProps> = ({ document }) => {
  const [targetScope, setTargetScope] = useState<'current' | 'all' | 'custom'>('current');
  const [customPage, setCustomPage] = useState<number>(1);
  const [language, setLanguage] = useState<string>('eng');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [results, setResults] = useState<OcrPageResult[] | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleStartOcr = async () => {
    try {
      setIsRunning(true);
      setResults(null);

      let targetPages: number[] = [];
      if (targetScope === 'current' || targetScope === 'custom') {
        targetPages = [customPage];
      } else {
        targetPages = Array.from({ length: document.pageCount }, (_, i) => i + 1);
      }

      const ocrResults = await performPdfOcr(
        document.bytes,
        targetPages,
        language,
        p => setProgress(p)
      );

      setResults(ocrResults);
    } catch (err) {
      console.error(err);
      alert('OCR operation failed. Please try again.');
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  const fullText = results?.map(r => `--- Page ${r.pageNumber} ---\n${r.text}`).join('\n\n') || '';

  const handleCopy = () => {
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!fullText) return;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `ocr_${document.name.replace('.pdf', '')}.txt`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Client-Side OCR — Zero Server Transmit
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ScanText className="w-5 h-5 text-amber-400" />
              Optical Character Recognition (OCR)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Extract and copy text from scanned PDF pages, certificates, or book scans directly in browser memory.
            </p>
          </div>
        </div>
      </div>

      {/* OCR Settings */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Target Pages */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-2">
              Select Pages to Extract:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTargetScope('current')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  targetScope === 'current'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700'
                }`}
              >
                Page {customPage}
              </button>
              <button
                onClick={() => setTargetScope('all')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  targetScope === 'all'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700'
                }`}
              >
                All {document.pageCount} Pages
              </button>
            </div>

            {targetScope === 'current' && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-slate-400">Page:</span>
                <button
                  onClick={() => setCustomPage(p => Math.max(1, p - 1))}
                  disabled={customPage <= 1}
                  className="p-1 rounded bg-slate-700 text-slate-300 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-semibold text-white">
                  {customPage} / {document.pageCount}
                </span>
                <button
                  onClick={() => setCustomPage(p => Math.min(document.pageCount, p + 1))}
                  disabled={customPage >= document.pageCount}
                  className="p-1 rounded bg-slate-700 text-slate-300 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-2">
              Recognition Language:
            </label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="eng">English (eng)</option>
              <option value="hin">Hindi / Devanagari (hin)</option>
              <option value="spa">Spanish (spa)</option>
              <option value="fra">French (fra)</option>
              <option value="deu">German (deu)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Uses high-accuracy offline models cached in browser storage.
            </p>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartOcr}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950 active:scale-98 transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {isRunning ? 'Extracting Text...' : 'Start Offline OCR Extraction'}
        </button>

        {/* Progress bar */}
        {isRunning && progress && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>{progress.status}</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Extracted Text Result */}
      {results && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                OCR Extracted Text ({results.length} page{results.length > 1 ? 's' : ''})
              </h3>
              <p className="text-[11px] text-slate-400">
                {fullText.split(/\s+/).filter(Boolean).length} words recognized
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-300" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadTxt}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save as .TXT</span>
              </button>
            </div>
          </div>

          {/* Search within text */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search words in extracted text..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Text Area display */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-96 overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
            {fullText}
          </div>
        </div>
      )}
    </div>
  );
};
