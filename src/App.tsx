/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { UnifiedTopBar } from './components/UnifiedTopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FileUploader } from './components/FileUploader';
import { OrganizeTool } from './components/tools/OrganizeTool';
import { MergeTool } from './components/tools/MergeTool';
import { SplitTool } from './components/tools/SplitTool';
import { CropTool } from './components/tools/CropTool';
import { RotateTool } from './components/tools/RotateTool';
import { ResizeTool } from './components/tools/ResizeTool';
import { EditTool } from './components/tools/EditTool';
import { OcrTool } from './components/tools/OcrTool';
import { SecurityTool } from './components/tools/SecurityTool';
import { ApkBuilderTool } from './components/tools/ApkBuilderTool';
import { PageClipboard, PageThumbnail, PdfDocument, ToolId } from './types/pdf';
import { generateAllThumbnails, updateSpecificThumbnails } from './services/pdfRenderer';
import { checkPdfEncryption, decryptPdfDocument } from './services/pdfEngine';
import { CheckCircle2, ShieldCheck, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [activeTool, setActiveTool] = useState<ToolId>('organize');
  const [targetPageForTool, setTargetPageForTool] = useState<number>(1);
  const [clipboard, setClipboard] = useState<PageClipboard | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo / Redo history stack
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyRef = useRef<Uint8Array[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const historyBusyRef = useRef<boolean>(false);

  // Protected PDF unlock modal state
  const [pendingProtectedFile, setPendingProtectedFile] = useState<{
    bytes: Uint8Array;
    fileName: string;
  } | null>(null);
  const [promptPassword, setPromptPassword] = useState<string>('');
  const [showPromptPassword, setShowPromptPassword] = useState<boolean>(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  /**
   * Load a new PDF document into state
   */
  const handleLoadDocument = async (bytes: Uint8Array, fileName: string) => {
    try {
      setIsProcessing(true);
      setProcessStatus('Verifying PDF security & structure...');

      // Check if PDF is encrypted
      const enc = await checkPdfEncryption(bytes);
      if (enc.encrypted) {
        setIsProcessing(false);
        setProcessStatus('');
        setPendingProtectedFile({ bytes, fileName });
        setPromptPassword('');
        setPromptError(null);
        return;
      }

      const pdfLibDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageCount = pdfLibDoc.getPageCount();

      setProcessStatus(`Rendering ${pageCount} page previews...`);
      const thumbnails = await generateAllThumbnails(bytes, 260, (curr, total) => {
        setProcessStatus(`Generating page preview ${curr} of ${total}...`);
      });

      const newDoc: PdfDocument = {
        id: `doc-${Date.now()}`,
        name: fileName,
        size: bytes.byteLength,
        pageCount,
        bytes,
        thumbnails,
      };

      setDocument(newDoc);
      setActiveTool('organize');
      setTargetPageForTool(1);

      // Initialize undo/redo history
      historyRef.current = [new Uint8Array(bytes)];
      historyIndexRef.current = 0;
      setHistory(historyRef.current);
      setHistoryIndex(0);

      showToast(`Loaded ${fileName} (${pageCount} pages)`);
    } catch (err: any) {
      console.error('Failed to load PDF:', err);
      if (err.message && (err.message.includes('encrypted') || err.message.includes('password'))) {
        setPendingProtectedFile({ bytes, fileName });
        setPromptPassword('');
        setPromptError(null);
      } else {
        alert('Could not read this PDF. The file may be password protected or corrupted.');
      }
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  /**
   * Unlock protected file from modal
   */
  const handleUnlockPendingFile = async () => {
    if (!pendingProtectedFile || !promptPassword) return;
    try {
      setIsProcessing(true);
      setProcessStatus('Decrypting protected PDF...');
      setPromptError(null);

      const decryptedBytes = await decryptPdfDocument(
        pendingProtectedFile.bytes,
        promptPassword
      );

      setPendingProtectedFile(null);
      setPromptPassword('');

      await handleLoadDocument(decryptedBytes, pendingProtectedFile.fileName);
      showToast('PDF unlocked and password protection removed successfully!');
    } catch (err: any) {
      console.error(err);
      setPromptError('Incorrect password. Please verify and try again.');
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  /**
   * Update the current document after an operation (e.g. crop, rotate, reorder, edit)
   * Supports instant 0ms updates and fast differential thumbnail updates without full reload.
   */
  const handleUpdateDocumentBytes = async (
    newBytes: Uint8Array,
    message?: string,
    skipHistoryPush = false,
    changedPageNumbers?: number[],
    updatedThumbnailsDirect?: PageThumbnail[]
  ): Promise<void> => {
    const isQuickUpdate = !!updatedThumbnailsDirect || (changedPageNumbers && changedPageNumbers.length > 0);
    try {
      if (!isQuickUpdate) {
        setIsProcessing(true);
        setProcessStatus('Updating document & previews...');
      }

      // Validate the exact output bytes before changing the active document.
      const verifiedBytes = new Uint8Array(newBytes);
      const pdfLibDoc = await PDFDocument.load(verifiedBytes, { ignoreEncryption: true });
      const pageCount = pdfLibDoc.getPageCount();
      if (pageCount < 1) throw new Error('The resulting PDF has no pages.');

      let thumbnails: PageThumbnail[];
      if (updatedThumbnailsDirect) {
        thumbnails = updatedThumbnailsDirect;
      } else if (changedPageNumbers && changedPageNumbers.length > 0 && document?.thumbnails) {
        thumbnails = await updateSpecificThumbnails(document.thumbnails, verifiedBytes, changedPageNumbers);
      } else {
        thumbnails = await generateAllThumbnails(verifiedBytes, 260);
      }

      // Commit only after validation and preview generation both succeed.
      setDocument(prev => {
        if (!prev) return null;
        return {
          ...prev,
          bytes: verifiedBytes,
          size: verifiedBytes.byteLength,
          pageCount,
          thumbnails,
        };
      });

      if (!skipHistoryPush) {
        // Update refs synchronously so rapid consecutive operations never use stale React state.
        const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        nextHistory.push(new Uint8Array(verifiedBytes));
        historyRef.current = nextHistory;
        historyIndexRef.current = nextHistory.length - 1;
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
      }

      if (message) showToast(message);
    } catch (err) {
      console.error('Failed to update PDF document:', err);
      throw err instanceof Error ? err : new Error('Failed to apply PDF modification');
    } finally {
      if (!isQuickUpdate) {
        setIsProcessing(false);
        setProcessStatus('');
      }
    }
  };
  /**
   * Undo last operation
   */
  const handleUndo = useCallback(async () => {
    if (historyBusyRef.current || historyIndexRef.current <= 0) return;
    historyBusyRef.current = true;
    const previousIndex = historyIndexRef.current;
    const targetIndex = previousIndex - 1;
    try {
      const targetBytes = historyRef.current[targetIndex];
      await handleUpdateDocumentBytes(targetBytes, 'Undo applied', true);
      historyIndexRef.current = targetIndex;
      setHistoryIndex(targetIndex);
    } catch (err) {
      console.error('Undo failed:', err);
      alert('Undo could not be completed. The current PDF has been kept unchanged.');
    } finally {
      historyBusyRef.current = false;
    }
  }, [handleUpdateDocumentBytes]);

  /**
   * Redo last operation
   */
  const handleRedo = useCallback(async () => {
    if (historyBusyRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyBusyRef.current = true;
    const targetIndex = historyIndexRef.current + 1;
    try {
      const targetBytes = historyRef.current[targetIndex];
      await handleUpdateDocumentBytes(targetBytes, 'Redo applied', true);
      historyIndexRef.current = targetIndex;
      setHistoryIndex(targetIndex);
    } catch (err) {
      console.error('Redo failed:', err);
      alert('Redo could not be completed. The current PDF has been kept unchanged.');
    } finally {
      historyBusyRef.current = false;
    }
  }, [handleUpdateDocumentBytes]);

  // Global Keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y or Ctrl+Shift+Z)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  /**
   * Export / Download the active PDF file
   */
  const handleDownloadCurrentPdf = async () => {
    if (!document) return;
    try {
      // Export only a structurally valid snapshot of the latest committed bytes.
      const exportBytes = new Uint8Array(document.bytes);
      const verified = await PDFDocument.load(exportBytes, { ignoreEncryption: true });
      if (verified.getPageCount() !== document.pageCount) {
        throw new Error('PDF page count verification failed.');
      }
      const blob = new Blob([exportBytes], { type: 'application/pdf' });
      saveAs(blob, document.name.toLowerCase().endsWith('.pdf') ? document.name : `${document.name}.pdf`);
      showToast(`Exported ${document.name}`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Your original document is still open; please try again.');
    }
  };

  const handleNewFile = () => {
    if (confirm('Do you want to close the current PDF and open a new one?')) {
      setDocument(null);
      setClipboard(null);
      historyRef.current = [];
      historyIndexRef.current = -1;
      setHistory([]);
      setHistoryIndex(-1);
    }
  };

  return (
    <div
      className={`bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white ${
        document
          ? 'min-h-screen pb-16 md:pb-0 overflow-y-auto'
          : 'h-screen overflow-hidden'
      }`}
    >
      {/* Unified Single-Line Top Bar with All Section Dropdowns & Brand */}
      <UnifiedTopBar
        fileName={document?.name || null}
        pageCount={document?.pageCount || 0}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onNewFile={handleNewFile}
        onDownloadCurrentPdf={handleDownloadCurrentPdf}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        clipboardCount={clipboard?.pages.length || 0}
      />

      {/* Main Content Area */}
      {document ? (
        <>
          <main className="flex-1 p-2.5 sm:p-6 max-w-7xl w-full mx-auto">
            {activeTool === 'organize' && (
              <OrganizeTool
                document={document}
                clipboard={clipboard}
                setClipboard={setClipboard}
                onUpdateDocumentBytes={handleUpdateDocumentBytes}
                onNavigateToTool={(tool, pageNum) => {
                  if (pageNum) setTargetPageForTool(pageNum);
                  setActiveTool(tool);
                }}
              />
            )}

            {activeTool === 'merge' && (
              <MergeTool
                currentDocument={document}
                onOpenMergedDoc={handleLoadDocument}
              />
            )}

            {activeTool === 'split' && (
              <SplitTool
                document={document}
                onOpenSplitDoc={handleLoadDocument}
              />
            )}

            {activeTool === 'crop' && (
              <CropTool
                document={document}
                initialPage={targetPageForTool}
                onUpdateDocumentBytes={handleUpdateDocumentBytes}
              />
            )}

            {activeTool === 'rotate' && (
              <RotateTool
                document={document}
                onUpdateDocumentBytes={handleUpdateDocumentBytes}
              />
            )}

            {activeTool === 'resize' && (
              <ResizeTool
                document={document}
                onUpdateDocumentBytes={handleUpdateDocumentBytes}
              />
            )}

            {activeTool === 'edit' && (
              <EditTool
                document={document}
                initialPage={targetPageForTool}
                onUpdateDocumentBytes={handleUpdateDocumentBytes}
              />
            )}

            {activeTool === 'ocr' && (
              <OcrTool
                document={document}
                initialPage={targetPageForTool}
              />
            )}

            {activeTool === 'security' && (
              <SecurityTool
                document={document}
                onUpdateDocumentBytes={handleUpdateDocumentBytes}
              />
            )}

            {activeTool === 'apk-builder' && <ApkBuilderTool />}
          </main>

          {/* Native Smartphone Bottom Navigation Bar */}
          <MobileBottomNav
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            clipboardCount={clipboard?.pages.length || 0}
          />
        </>
      ) : (
        <main className="flex-1 flex flex-col justify-center overflow-hidden">
          {activeTool === 'apk-builder' ? (
            <div className="max-w-4xl mx-auto p-4 w-full h-full overflow-y-auto">
              <button
                onClick={() => setActiveTool('organize')}
                className="mb-4 text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                ← Back to File Upload
              </button>
              <ApkBuilderTool />
            </div>
          ) : (
            <FileUploader
              onFileLoaded={handleLoadDocument}
              onOpenApkBuilder={() => setActiveTool('apk-builder')}
            />
          )}
        </main>
      )}

      {/* Unlock Protected PDF Modal */}
      {pendingProtectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Password Protected PDF</h3>
                <p className="text-xs text-slate-400 truncate max-w-[240px]">
                  {pendingProtectedFile.fileName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              This document is protected with a password. Enter the password below to decrypt and open it in the editor.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Password:
                </label>
                <div className="relative">
                  <input
                    type={showPromptPassword ? 'text' : 'password'}
                    value={promptPassword}
                    onChange={e => {
                      setPromptPassword(e.target.value);
                      setPromptError(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleUnlockPendingFile();
                    }}
                    placeholder="Enter PDF password"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPromptPassword(!showPromptPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPromptPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {promptError && (
                  <p className="text-xs text-rose-400 mt-1.5">{promptError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingProtectedFile(null);
                    setPromptPassword('');
                    setPromptError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUnlockPendingFile}
                  disabled={!promptPassword}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30 transition disabled:opacity-50"
                >
                  Unlock & Open
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-3 shadow-2xl text-center max-w-sm mx-4">
            <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
            <h4 className="text-base font-bold text-white">Processing PDF</h4>
            <p className="text-xs text-slate-400">
              {processStatus || 'Please wait a moment...'}
            </p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
