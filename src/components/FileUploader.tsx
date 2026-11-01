import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Scissors,
  ScanText,
  Type,
  Split,
  Combine,
  Crop,
  Layers,
} from 'lucide-react';
import { createSamplePdf } from '../utils/samplePdf';

interface FileUploaderProps {
  onFileLoaded: (bytes: Uint8Array, fileName: string) => void;
  onOpenApkBuilder: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
  onOpenApkBuilder,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a valid PDF file.');
      return;
    }
    const buffer = await file.arrayBuffer();
    onFileLoaded(new Uint8Array(buffer), file.name);
  };

  const handleLoadSample = async () => {
    try {
      setIsLoadingSample(true);
      const sampleBytes = await createSamplePdf();
      onFileLoaded(sampleBytes, 'Sample-Document.pdf');
    } catch (e) {
      console.error(e);
      alert('Failed to generate sample PDF');
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          100% Client-Side & Offline — Zero Server Uploads
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          All-in-One Offline <span className="text-blue-500">PDF Editor</span>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Merge, split by conditions, crop, rotate, resize, organize pages, OCR, and edit text offline. Export as a native Android APK via GitHub Actions.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400 mb-4 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          Drop your PDF here, or <span className="text-blue-400 underline underline-offset-4">browse</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Supports any PDF. Files never leave your browser or device.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleLoadSample();
            }}
            disabled={isLoadingSample}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs sm:text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            {isLoadingSample ? 'Generating sample...' : 'Try with Sample PDF (3 Pages)'}
          </button>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onOpenApkBuilder();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-semibold transition shadow-md shadow-emerald-950"
          >
            <Smartphone className="w-4 h-4" />
            Build Android APK (ZIP Project)
          </button>
        </div>
      </div>

      {/* Feature Grid Summary */}
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs mb-1">
            <Scissors className="w-4 h-4" />
            Cut, Copy & Paste
          </div>
          <p className="text-[11px] text-slate-400">
            Clipboard for PDF pages. Cut or duplicate pages anywhere.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
            <Crop className="w-4 h-4" />
            Crop by Condition
          </div>
          <p className="text-[11px] text-slate-400">
            Crop margins on all, odd/even, or landscape pages.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
            <Split className="w-4 h-4" />
            Condition Split
          </div>
          <p className="text-[11px] text-slate-400">
            Split into single pages, custom ranges, or odd/even files.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
            <ScanText className="w-4 h-4" />
            Offline OCR
          </div>
          <p className="text-[11px] text-slate-400">
            Extract text from scanned PDFs & images without server.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs mb-1">
            <Type className="w-4 h-4" />
            Edit Text & Whiteout
          </div>
          <p className="text-[11px] text-slate-400">
            Cover existing text, type new text, sign & add stamps.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs mb-1">
            <Combine className="w-4 h-4" />
            Merge & Reorder
          </div>
          <p className="text-[11px] text-slate-400">
            Combine multiple PDF files with custom page ranges.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
            <Layers className="w-4 h-4" />
            Size & Compress
          </div>
          <p className="text-[11px] text-slate-400">
            Change dimensions to A4, Letter, Custom and compress.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs mb-1">
            <Smartphone className="w-4 h-4" />
            GitHub APK Builder
          </div>
          <p className="text-[11px] text-slate-400">
            Download project ZIP & build Android APK via GitHub Actions.
          </p>
        </div>
      </div>
    </div>
  );
};
