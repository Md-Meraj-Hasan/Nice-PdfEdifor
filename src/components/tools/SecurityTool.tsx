import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Download,
  AlertTriangle,
  Settings2,
  Check,
  FileCheck,
} from 'lucide-react';
import { PdfDocument } from '../../types/pdf';
import {
  checkPdfEncryption,
  encryptPdfDocument,
  decryptPdfDocument,
  EncryptionStatus,
} from '../../services/pdfEngine';
import { saveAs } from 'file-saver';

interface SecurityToolProps {
  document: PdfDocument;
  onUpdateDocumentBytes: (bytes: Uint8Array, message?: string) => Promise<void>;
}

export const SecurityTool: React.FC<SecurityToolProps> = ({
  document,
  onUpdateDocumentBytes,
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const [encStatus, setEncStatus] = useState<EncryptionStatus>({ encrypted: false });
  const [isChecking, setIsChecking] = useState<boolean>(true);

  // Form: Add Protection
  const [userPassword, setUserPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [ownerPassword, setOwnerPassword] = useState<string>('');
  const [algorithm, setAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [allowPrinting, setAllowPrinting] = useState<boolean>(true);
  const [allowCopying, setAllowCopying] = useState<boolean>(true);
  const [allowModifying, setAllowModifying] = useState<boolean>(false);
  const [allowAnnotating, setAllowAnnotating] = useState<boolean>(true);

  // Form: Remove Protection
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [showUnlockPassword, setShowUnlockPassword] = useState<boolean>(false);

  // Operation state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check current encryption status
  useEffect(() => {
    let isMounted = true;
    async function check() {
      setIsChecking(true);
      const status = await checkPdfEncryption(document.bytes);
      if (isMounted) {
        setEncStatus(status);
        setIsChecking(false);
        if (status.encrypted) {
          setActiveTab('remove');
        }
      }
    }
    check();
    return () => {
      isMounted = false;
    };
  }, [document.bytes]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(userPassword);

  // Add protection handler
  const handleAddProtection = async (action: 'apply' | 'download') => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!userPassword) {
      setErrorMessage('Please enter a user password to protect the PDF.');
      return;
    }
    if (userPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password.');
      return;
    }

    try {
      setIsProcessing(true);
      const encryptedBytes = await encryptPdfDocument(document.bytes, userPassword, {
        ownerPassword: ownerPassword.trim() || undefined,
        algorithm,
        allowPrinting,
        allowCopying,
        allowModifying,
        allowAnnotating,
      });

      if (action === 'download') {
        const blob = new Blob([encryptedBytes as unknown as BlobPart], { type: 'application/pdf' });
        saveAs(blob, `protected_${document.name}`);
        setStatusMessage('Protected PDF downloaded successfully with password encryption!');
      } else {
        await onUpdateDocumentBytes(
          encryptedBytes,
          `Password protection added successfully (${algorithm})`
        );
        setUserPassword('');
        setConfirmPassword('');
        setOwnerPassword('');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to encrypt PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove protection handler
  const handleRemoveProtection = async (action: 'apply' | 'download') => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!unlockPassword) {
      setErrorMessage('Please enter the existing password to remove protection.');
      return;
    }

    try {
      setIsProcessing(true);
      const decryptedBytes = await decryptPdfDocument(document.bytes, unlockPassword);

      if (action === 'download') {
        const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: 'application/pdf' });
        saveAs(blob, `unlocked_${document.name}`);
        setStatusMessage('Unlocked PDF downloaded without password protection!');
      } else {
        await onUpdateDocumentBytes(
          decryptedBytes,
          'Password protection removed completely. Document is now unrestricted.'
        );
        setUnlockPassword('');
        setEncStatus({ encrypted: false });
        setActiveTab('add');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('Incorrect password')) {
        setErrorMessage('Incorrect password. The entered password does not match.');
      } else {
        setErrorMessage(err.message || 'Failed to decrypt PDF. Verify the password.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              pdf-lib Standard Security & Cryptography
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              PDF Security & Password Protection
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Add military-grade AES-256 or RC4 password encryption to your PDF, restrict copying or printing, or remove existing password protection completely.
            </p>
          </div>

          {/* Current Status Pill */}
          <div className="shrink-0">
            {isChecking ? (
              <span className="text-xs text-slate-400">Checking security...</span>
            ) : encStatus.encrypted ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Protected ({encStatus.algorithm || 'Encrypted'})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unrestricted (No Password)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => {
            setActiveTab('add');
            setErrorMessage(null);
            setStatusMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'add'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          Add Password Protection (Encrypt)
        </button>

        <button
          onClick={() => {
            setActiveTab('remove');
            setErrorMessage(null);
            setStatusMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'remove'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Unlock className="w-4 h-4" />
          Remove Password Protection (Decrypt)
        </button>
      </div>

      {/* Messages */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: ADD PASSWORD PROTECTION */}
      {activeTab === 'add' && (
        <div className="space-y-5">
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700/70 pb-3">
              <Key className="w-4 h-4 text-blue-400" />
              Password Setup
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* User Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  User Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={userPassword}
                    onChange={e => setUserPassword(e.target.value)}
                    placeholder="Enter password required to open PDF"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter */}
                {userPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full ${strength.color} ${
                          strength.score >= 1 ? 'w-1/3' : 'w-0'
                        }`}
                      />
                      <div
                        className={`h-full ${strength.color} ${
                          strength.score >= 2 ? 'w-1/3' : 'w-0'
                        }`}
                      />
                      <div
                        className={`h-full ${strength.color} ${
                          strength.score >= 3 ? 'w-1/3' : 'w-0'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter user password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Optional Owner Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Owner / Master Password (Optional):
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={ownerPassword}
                onChange={e => setOwnerPassword(e.target.value)}
                placeholder="Separate password for document permissions (leaves open if blank)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                If left blank, the owner password will be set identical to the user password.
              </p>
            </div>
          </div>

          {/* Encryption Algorithm & Permissions */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700/70 pb-3">
              <Settings2 className="w-4 h-4 text-blue-400" />
              Encryption Standards & Permissions
            </h3>

            {/* Algorithm Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Encryption Algorithm:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAlgorithm('AES-256')}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    algorithm === 'AES-256'
                      ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/30'
                      : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">AES-256 (Recommended)</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold">
                      High Security
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Modern 256-bit AES encryption supported by Adobe Acrobat, Chrome, Android, iOS.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAlgorithm('RC4')}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    algorithm === 'RC4'
                      ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/30'
                      : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">RC4 128-bit</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] font-semibold">
                      Legacy Compatible
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Maximum compatibility with very old PDF reader hardware and embedded viewers.
                  </p>
                </button>
              </div>
            </div>

            {/* Permissions Toggles */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                User Permissions (When opened with User Password):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPrinting}
                    onChange={e => setAllowPrinting(e.target.checked)}
                    className="rounded bg-slate-800 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Allow Printing</span>
                    <span className="text-[10px] text-slate-400">High-resolution document printing</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCopying}
                    onChange={e => setAllowCopying(e.target.checked)}
                    className="rounded bg-slate-800 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Allow Copying</span>
                    <span className="text-[10px] text-slate-400">Extracting text and graphics</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowModifying}
                    onChange={e => setAllowModifying(e.target.checked)}
                    className="rounded bg-slate-800 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Allow Modifying</span>
                    <span className="text-[10px] text-slate-400">Editing pages and form fields</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowAnnotating}
                    onChange={e => setAllowAnnotating(e.target.checked)}
                    className="rounded bg-slate-800 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Allow Annotations</span>
                    <span className="text-[10px] text-slate-400">Adding comments and digital signatures</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handleAddProtection('download')}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-300" />
              Protect & Download PDF
            </button>

            <button
              onClick={() => handleAddProtection('apply')}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isProcessing ? 'Encrypting PDF...' : 'Apply Password to Document'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: REMOVE PASSWORD PROTECTION */}
      {activeTab === 'remove' && (
        <div className="space-y-5">
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Unlock & Remove Password Protection</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter the password of this PDF document to permanently remove encryption. The saved PDF will open freely in any viewer without asking for a password.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current PDF Password:
              </label>
              <div className="relative max-w-md">
                <input
                  type={showUnlockPassword ? 'text' : 'password'}
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  placeholder="Enter user or owner password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-blue-300">How it works:</p>
              <p className="text-[11px] text-slate-400">
                Using <code>pdf-lib</code>, the security encryption dictionary (<code>/Encrypt</code>) is removed from the PDF trailer, completely restoring full unrestricted access to all pages and contents.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handleRemoveProtection('download')}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-300" />
              Unlock & Download PDF
            </button>

            <button
              onClick={() => handleRemoveProtection('apply')}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 active:scale-95 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isProcessing ? 'Decrypting PDF...' : 'Unlock Document Permanently'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
