import React from 'react';
import {
  FileText,
  Download,
  Smartphone,
  ShieldCheck,
  Plus,
  PackageCheck,
  CheckCircle2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ToolId } from '../types/pdf';

interface HeaderProps {
  fileName: string | null;
  fileSize: number | null;
  pageCount: number;
  activeTool: ToolId;
  setActiveTool: (tool: ToolId) => void;
  onNewFile: () => void;
  onDownloadCurrentPdf: () => void;
  hasUnsavedChanges?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  pageCount,
  setActiveTool,
  onNewFile,
  onDownloadCurrentPdf,
  hasUnsavedChanges,
}) => {
  const { isInstallable, install } = usePWAInstall();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 sm:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Brand & File name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  PDFMaster <span className="text-blue-400">Pro</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  100% Offline
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-xs">
                {fileName ? `${fileName} (${pageCount} pgs)` : 'Android & Web Offline Suite'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* GitHub APK Builder Button */}
          <button
            onClick={() => setActiveTool('apk-builder')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950 transition active:scale-95"
            title="Download full project ZIP & build APK with GitHub Actions"
          >
            <Smartphone className="w-4 h-4 text-emerald-200" />
            <span className="hidden sm:inline">Build Android APK</span>
            <span className="sm:hidden">APK</span>
            <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px] text-emerald-200">ZIP</span>
          </button>

          {/* Save & Download current PDF */}
          {fileName && (
            <button
              onClick={onDownloadCurrentPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          )}

          {/* New / Change File */}
          <button
            onClick={onNewFile}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Open another PDF"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open PDF</span>
          </button>

          {/* PWA Direct Install Button */}
          {isInstallable && (
            <button
              onClick={install}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Install directly as Android PWA app"
            >
              <PackageCheck className="w-3.5 h-3.5 text-blue-400" />
              Install App
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
