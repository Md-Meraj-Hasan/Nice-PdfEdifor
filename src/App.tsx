import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Upload, Download, FileText, Trash2 } from 'lucide-react';

export default function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // PDF File Select karne ka function
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    } else {
      alert('Please select a valid PDF file.');
    }
  };

  // Pages delete karne ya edit karne ka basic logic (pdf-lib use karke)
  const handleRemoveFirstPage = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      
      if (pages.length <= 1) {
        alert("Cannot delete the only page in the PDF.");
        setIsProcessing(false);
        return;
      }

      pdfDoc.removePage(0); // Pehla page delete kar rahe hain
      const pdfBytes = await pdfDoc.save();
      
      // Naya PDF download karne ke liye blob banayein
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newUrl = URL.createObjectURL(blob);
      
      // Purana URL revoke karein aur naya set karein
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(newUrl);
      
      // Naya File object banayein taaki state update rahe
      const newFile = new File([blob], 'edited_' + pdfFile.name, { type: 'application/pdf' });
      setPdfFile(newFile);

    } catch (error) {
      console.error(error);
      alert("Error processing PDF");
    }
    setIsProcessing(false);
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = pdfFile?.name || 'downloaded.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 p-4 shadow-md flex justify-between items-center border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2 text-blue-400">
          <FileText size={24} /> PDFMaster Pro
        </h1>
        {pdfFile && (
          <div className="flex gap-2">
            <button 
              onClick={handleRemoveFirstPage} 
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded flex items-center gap-1 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} /> {isProcessing ? 'Processing...' : 'Delete 1st Page'}
            </button>
            <button 
              onClick={downloadPdf} 
              className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded flex items-center gap-1 text-sm font-medium transition-colors"
            >
              <Download size={16} /> Save PDF
            </button>
          </div>
        )}
      </header>

      {/* Main Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {!pdfFile ? (
          <label className="cursor-pointer bg-slate-800 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-12 flex flex-col items-center gap-4 transition-colors w-full max-w-md text-center">
            <Upload size={48} className="text-blue-400" />
            <div>
              <p className="text-lg font-semibold">Click to upload a PDF</p>
              <p className="text-sm text-slate-400">Your file never leaves your device (100% Offline)</p>
            </div>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="w-full h-full flex flex-col items-center gap-4">
            <div className="w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex-1">
              <iframe src={pdfUrl + '#toolbar=0'} className="w-full h-full min-h-[70vh]" title="PDF Viewer"></iframe>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
