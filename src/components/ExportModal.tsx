import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  HardDrive,
  FileText,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Smartphone,
} from 'lucide-react';
import { saveOrExportFile, SaveFileResult } from '../services/fileSaver';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bytes: Uint8Array;
  defaultFileName: string;
  onShowToast: (message: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  bytes,
  defaultFileName,
  onShowToast,
}) => {
  const [fileName, setFileName] = useState<string>(
    defaultFileName.endsWith('.pdf') ? defaultFileName : `${defaultFileName}.pdf`
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveFileResult | null>(null);

  if (!isOpen) return null;

  const fileSizeKb = Math.round(bytes.byteLength / 1024);

  const handleSave = async (preferMethod: 'auto' | 'storage' | 'share' | 'download') => {
    try {
      setIsSaving(true);
      setSaveStatus(null);
      const result = await saveOrExportFile(bytes, fileName, 'application/pdf', preferMethod);
      setSaveStatus(result);
      if (result.success) {
        onShowToast(result.message);
      }
    } catch (err: any) {
      console.error(err);
      setSaveStatus({
        success: false,
        method: 'error',
        message: err.message || 'Failed to save file.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPreview = () => {
    try {
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.warn('Could not open preview:', err);
      alert('Could not open preview in a new window.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Export & Save PDF</h3>
              <p className="text-xs text-slate-400">Save to your phone's local storage or share</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Name & Info */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">File Name:</label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2">
            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            <input
              type="text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              className="bg-transparent border-none text-white text-xs font-semibold w-full focus:outline-none"
              placeholder="document.pdf"
            />
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              {fileSizeKb > 1024 ? `${(fileSizeKb / 1024).toFixed(1)} MB` : `${fileSizeKb} KB`}
            </span>
          </div>
        </div>

        {/* Status Alert if any */}
        {saveStatus && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 border ${
              saveStatus.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {saveStatus.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold">{saveStatus.success ? 'Success!' : 'Notice'}</div>
              <div className="text-[11px] mt-0.5 text-slate-300">{saveStatus.message}</div>
            </div>
          </div>
        )}

        {/* Save Options / Actions */}
        <div className="space-y-2.5">
          {/* Option 1: Direct Save to Local Storage */}
          <button
            onClick={() => handleSave('storage')}
            disabled={isSaving}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition active:scale-98 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-blue-200" />
              <div className="text-left">
                <div>Save to Device Local Storage</div>
                <div className="text-[10px] font-normal text-blue-100">
                  Phone ke Documents ya Downloads folder me save karein
                </div>
              </div>
            </div>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>

          {/* Option 2: Android System Sheet (Save to device or apps) */}
          <button
            onClick={() => handleSave('share')}
            disabled={isSaving}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm transition active:scale-98 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Share2 className="w-5 h-5 text-emerald-400" />
              <div className="text-left">
                <div>Save via Android System Sheet</div>
                <div className="text-[10px] font-normal text-slate-400">
                  "Save to device", Google Drive, ya PDF viewer me open karein
                </div>
              </div>
            </div>
            <Smartphone className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Option 3: Browser Direct Download */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleSave('download')}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Browser Download</span>
            </button>
            <button
              onClick={handleOpenPreview}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Viewer</span>
            </button>
          </div>
        </div>

        {/* Footer Guidance Note */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Android APK Tip:</strong> "Save to Device Local Storage"
            button dabane par PDF aapke phone ke <strong>Documents</strong> folder me direct save hota hai.
            Ya fir "Save via Android System Sheet" se aap kisi bhi folder ya Google Drive me save kar sakte hain.
          </div>
        </div>
      </div>
    </div>
  );
};
