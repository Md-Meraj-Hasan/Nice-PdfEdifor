import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Github,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Sparkles,
  PackageCheck,
  FolderArchive,
  Info,
} from 'lucide-react';
import { generateProjectZip } from '../../services/projectZipGenerator';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const ApkBuilderTool: React.FC = () => {
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ percent: number; status: string } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);
  const { isInstallable, install } = usePWAInstall();

  const handleDownloadZip = async () => {
    try {
      setIsGeneratingZip(true);
      await generateProjectZip((percent, status) => {
        setZipProgress({ percent, status });
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate project ZIP');
    } finally {
      setIsGeneratingZip(false);
      setZipProgress(null);
    }
  };

  const gitCommands = `git init
git add .
git commit -m "Native Android PDF Editor"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main`;

  const copyGitCommands = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
            <Smartphone className="w-4 h-4" />
            GitHub Actions Native Android APK Ready
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Generate Native Android APK via GitHub
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
            आपके कंप्यूटर या फ़ोन पर Android Studio या Java इनस्टॉल करने की कोई ज़रूरत नहीं है! नीचे दिए गए बटन से फुल प्रोजेक्ट का ZIP डाउनलोड करें, GitHub पर पुश करें, और GitHub Actions आपके लिए <strong>Android APK (.apk)</strong> अपने आप तैयार कर देगा।
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* Direct High-Speed Download Full Project ZIP */}
            <a
              href="/PDFMaster-Pro-Android-Project.zip"
              download="PDFMaster-Pro-Android-Project.zip"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-950 active:scale-95 transition"
            >
              <Download className="w-5 h-5 text-emerald-200" />
              Download New Project ZIP (144 KB)
            </a>

            {/* In-Memory Dynamic Packaging */}
            <button
              onClick={handleDownloadZip}
              disabled={isGeneratingZip}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
            >
              <FolderArchive className="w-4 h-4 text-emerald-400" />
              {isGeneratingZip
                ? `${zipProgress?.status || 'Packing ZIP...'}`
                : 'Re-pack Live ZIP'}
            </button>

            {/* Direct PWA Install if applicable */}
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <PackageCheck className="w-4 h-4 text-blue-400" />
                Instant Install as Mobile App (PWA)
              </button>
            )}
          </div>

          {/* Progress Indicator */}
          {isGeneratingZip && zipProgress && (
            <div className="mt-4 max-w-md space-y-1.5">
              <div className="flex justify-between text-xs text-emerald-300">
                <span>{zipProgress.status}</span>
                <span>{zipProgress.percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${zipProgress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step by Step Hindi Guide */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700/70 pb-3">
          <Github className="w-5 h-5 text-white" />
          GitHub से APK बनाने की पूरी विधि (Step-by-Step Hindi Guide):
        </h3>

        {/* Step 1 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
            1
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Project ZIP फ़ाइल डाउनलोड व Unzip करें</h4>
            <p className="text-xs text-slate-300 mt-1">
              ऊपर दिए गए हरे बटन <strong>&ldquo;Download Full Project ZIP File&rdquo;</strong> पर क्लिक करें। इसमें आपका पूरा सोर्स कोड, Capacitor Android सेटअप, और GitHub Actions वर्कफ़्लो शामिल है। फ़ाइल को Unzip (Extract) कर लें।
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
            2
          </div>
          <div className="w-full">
            <h4 className="text-sm font-bold text-white">GitHub पर नई Repository बनाकर Push करें</h4>
            <p className="text-xs text-slate-300 mt-1">
              GitHub.com पर जाएं और नई Repository बनाएं (जैसे: <code>pdf-master-android</code>)। फिर टर्मिनल या Git Bash में ये कमांड्स चलाएं:
            </p>

            <div className="mt-2.5 relative bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs text-emerald-400">
              <button
                onClick={copyGitCommands}
                className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedCmd ? 'Copied' : 'Copy'}
              </button>
              <pre className="overflow-x-auto pr-16">{gitCommands}</pre>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
            3
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">GitHub Actions में APK अपने आप बिल्ड होगा</h4>
            <p className="text-xs text-slate-300 mt-1">
              जैसे ही आप Push करेंगे, आपकी GitHub Repository का <strong>Actions</strong> टैब अपने आप चालू हो जाएगा। GitHub का क्लाउड सर्वर Node.js, Java 17, Android SDK सेटअप करके Gradle से <code>assembleDebug</code> चलाएगा (2 से 3 मिनट का समय लगता है)।
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
            4
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">APK डाउनलोड करें और फ़ोन में इनस्टॉल करें</h4>
            <p className="text-xs text-slate-300 mt-1">
              GitHub Actions में बिल्ड पूरा होने पर (ग्रीन टिक ✅):
              <br />
              1. उस रन पर क्लिक करें।
              <br />
              2. नीचे <strong>Artifacts</strong> सेक्शन में जाएं।
              <br />
              3. <strong><code>PDFMaster-Pro-Android-APK</code></strong> पर क्लिक करके डाउनलोड करें!
              <br />
              4. अपने Android फ़ोन में ट्रांसफर करें और बिना किसी परेशानी के इनस्टॉल करें।
            </p>
          </div>
        </div>
      </div>

      {/* Project Structure Included inside ZIP */}
      <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          ZIP फ़ाइल के अंदर क्या-क्या मौजूद है:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><code>.github/workflows/build-apk.yml</code> (APK Workflow)</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><code>capacitor.config.json</code> (Android Native Config)</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><code>package.json</code> (All Offline PDF Engines)</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-900/60 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><code>src/</code> (Merge, Split, OCR, Edit, Crop, Rotate)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
