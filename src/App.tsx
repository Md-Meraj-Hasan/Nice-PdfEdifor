/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Header } from './components/Header';
import { ToolNav } from './components/ToolNav';
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
import { PageClipboard, PdfDocument, ToolId } from './types/pdf';
import { generateAllThumbnails } from './services/pdfRenderer';
import { checkPdfEncryption, decryptPdfDocument } from './services/pdfEngine';
import { CheckCircle2, ShieldCheck, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [document, setDocument] = useState<PdfDocument | null>(null);
  const [activeTool, setActiveTool] = useState<ToolId>('organize');
  const [clipboard, setClipboard] = useState<PageClipboard | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      showToast(`Loaded ${fileName} (${pageCount} pages)`);
    } catch (err: any) {
      console.error('Failed to load PDF:', err);
      // If error indicates encryption, offer password prompt
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

      // Now load the clean decrypted bytes
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
   */
  const handleUpdateDocumentBytes = async (newBytes: Uint8Array, message?: string) => {
    try {
      setIsProcessing(true);
      setProcessStatus('Updating document & previews...');

      const pdfLibDoc = await PDFDocument.load(newBytes);
      const pageCount = pdfLibDoc.getPageCount();

      const thumbnails = await generateAllThumbnails(newBytes, 260);

      setDocument(prev => {
        if (!prev) return null;
        return {
          ...prev,
          bytes: newBytes,
          size: newBytes.byteLength,
          pageCount,
          thumbnails,
        };
      });

      if (message) showToast(message);
    } catch (err) {
      console.error('Failed to update PDF document:', err);
      alert('Failed to apply modification');
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  /**
   * Export / Download the active PDF file
   */
  const handleDownloadCurrentPdf = () => {
    if (!document) return;
    const blob = new Blob([document.bytes as unknown as BlobPart], { type: 'application/pdf' });
    saveAs(blob, document.name.endsWith('.pdf') ? document.name : `${document.name}.pdf`);
    showToast(`Downloaded ${document.name}`);
  };

  const handleNewFile = () => {
    if (confirm('Do you want to close the current PDF and open a new one?')) {
      setDocument(null);
      setClipboard(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        fileName={document?.name || null}
        fileSize={document?.size || null}
        pageCount={document?.pageCount || 0}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onNewFile={handleNewFile}
        onDownloadCurrentPdf={handleDownloadCurrentPdf}
      />

      {/* Main Content Area */}
      {document ? (
        <>
          {/* Tool Navigation Bar */}
          <ToolNav
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            clipboardCount={clipboard?.pages.length || 0}
          />

          <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto">
            {activeTool === 'organize' && (
              <OrganizeTool
                document={document}
                clipboard={clipboard}
                setClipboard={setClipboard}
                onUpdateDocumentBytes={handleUpdateDocumentBytes}
              />
            )}

            {activeTool === 'merge' && (
              <MergeTool
                currentDocument={document}
                onOpenMergedDoc={handleLoadDocument}
              />
            )}

            {activeTool === 'split' && <SplitTool document={document} />}

            {activeTool === 'crop' && (
              <CropTool
                document={document}
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
                onUpdateDocumentBytes={handleUpdateDocumentBytes}
              />
            )}

            {activeTool === 'ocr' && <OcrTool document={document} />}

            {activeTool === 'security' && (
              <SecurityTool
                document={document}
                onUpdateDocumentBytes={handleUpdateDocumentBytes}
              />
            )}

            {activeTool === 'apk-builder' && <ApkBuilderTool />}
          </main>
        </>
      ) : (
        <main className="flex-1 flex flex-col justify-center">
          {activeTool === 'apk-builder' ? (
            <div className="max-w-4xl mx-auto p-4 w-full">
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
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
