import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  ShieldCheck,
  Scissors,
  ScanText,
  Type,
  Split,
  Combine,
  Crop,
  Layers,
  Lock,
  RotateCw,
  Maximize2,
} from 'lucide-react';
import { createSamplePdf } from '../utils/samplePdf';

interface FileUploaderProps {
  onFileLoaded: (bytes: Uint8Array, fileName: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
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

  const allTools = [
    { label: 'Organize Pages', icon: <Layers className="w-3.5 h-3.5 text-blue-400" />, desc: 'Reorder, cut, copy' },
    { label: 'Edit Text', icon: <Type className="w-3.5 h-3.5 text-indigo-400" />, desc: 'Add & replace text' },
    { label: 'Split PDF', icon: <Split className="w-3.5 h-3.5 text-purple-400" />, desc: '2-page pairs, ranges' },
    { label: 'Merge PDFs', icon: <Combine className="w-3.5 h-3.5 text-blue-400" />, desc: 'Combine documents' },
    { label: 'Crop Margins', icon: <Crop className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Trim page edges' },
    { label: 'Rotate 90°/180°', icon: <RotateCw className="w-3.5 h-3.5 text-cyan-400" />, desc: 'CW & CCW rotate' },
    { label: 'Offline OCR', icon: <ScanText className="w-3.5 h-3.5 text-amber-400" />, desc: 'Text scan without web' },
    { label: 'Password Security', icon: <Lock className="w-3.5 h-3.5 text-rose-400" />, desc: 'Encrypt & decrypt' },
  ];

  return (
    <div className="h-full max-h-[calc(100vh-65px)] w-full max-w-4xl mx-auto px-4 py-2 sm:py-4 flex flex-col justify-between overflow-hidden">
      {/* 1. Header (Compact) */}
      <div className="text-center pt-1 pb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Client-Side & Offline — Zero Server Uploads</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          All-in-One Offline <span className="text-blue-400">PDF Editor & Tools</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400 max-w-lg mx-auto line-clamp-1 sm:line-clamp-none">
          Edit text, split into pairs, merge, crop, rotate, and OCR in your browser.
        </p>
      </div>

      {/* 2. Upload Dropzone (Compact, prominent, fits on screen) */}
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
        className={`relative border-2 border-dashed rounded-3xl p-5 sm:p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center my-auto ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-slate-700/80 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-lg shadow-blue-900/20">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white mb-1">
          Choose a PDF file or <span className="text-blue-400 underline underline-offset-4">Browse</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Click anywhere or drag & drop. Files remain 100% private on your device.
        </p>

        {/* Quick action buttons inside dropzone */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleLoadSample();
            }}
            disabled={isLoadingSample}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700/90 hover:bg-slate-600 text-white text-xs font-semibold transition shadow-sm disabled:opacity-50 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isLoadingSample ? 'Generating sample...' : 'Try Sample PDF (3 Pages)'}</span>
          </button>

        </div>
      </div>

      {/* 3. Single Horizontal Line of Available Tools (Compact, No Vertical Scroll) */}
      <div className="pb-2">
        <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between px-1">
          <span>All Tools Included (Available once PDF is opened):</span>
          <span className="text-[10px] text-emerald-400">Offline & Fast</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {allTools.map((tool, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/70 shrink-0 select-none hover:border-slate-600 transition"
            >
              {tool.icon}
              <div className="text-left">
                <div className="text-xs font-bold text-white whitespace-nowrap">{tool.label}</div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap">{tool.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
