import React, { useRef, useState, useEffect } from 'react';
import {
  Type,
  Square,
  PenTool,
  Stamp,
  Highlighter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  Undo2,
  Plus,
} from 'lucide-react';
import { PageAnnotation, PdfDocument } from '../../types/pdf';
import { bakeAnnotationsIntoPdf } from '../../services/pdfEngine';

interface EditToolProps {
  document: PdfDocument;
  onUpdateDocumentBytes: (bytes: Uint8Array, message?: string) => Promise<void>;
}

export const EditTool: React.FC<EditToolProps> = ({
  document,
  onUpdateDocumentBytes,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeSubTool, setActiveSubTool] = useState<
    'text' | 'whiteout' | 'signature' | 'stamp' | 'highlight' | 'shape' | 'select'
  >('text');

  // Map of annotations per page: { 1: [...], 2: [...] }
  const [annotations, setAnnotations] = useState<Record<number, PageAnnotation[]>>({});
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);

  // New text options
  const [fontSize, setFontSize] = useState<number>(14);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [isWhiteoutBg, setIsWhiteoutBg] = useState<boolean>(true); // default whiteout bg for replacing text!
  const [isBold, setIsBold] = useState<boolean>(false);

  // Stamp options
  const [selectedStamp, setSelectedStamp] = useState<string>('APPROVED');
  const [stampColor, setStampColor] = useState<string>('#16a34a');

  // Signature modal/pad state
  const [showSigModal, setShowSigModal] = useState<boolean>(false);
  const [sigStrokes, setSigStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingSig, setIsDrawingSig] = useState<boolean>(false);
  const [sigColor, setSigColor] = useState<string>('#1e3a8a');

  const [isBaking, setIsBaking] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentAnnotations = annotations[currentPage] || [];
  const currentThumb = document.thumbnails[currentPage - 1];

  // Helper to add annotation
  const addAnnotation = (ann: PageAnnotation) => {
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), ann],
    }));
    setSelectedAnnId(ann.id);
  };

  const updateAnnotation = (id: string, updates: Partial<PageAnnotation>) => {
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).map(a =>
        a.id === id ? ({ ...a, ...updates } as PageAnnotation) : a
      ),
    }));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).filter(a => a.id !== id),
    }));
    if (selectedAnnId === id) setSelectedAnnId(null);
  };

  // Canvas click to place text or whiteout
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeSubTool === 'text') {
      const newText: PageAnnotation = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: Math.max(0, Math.min(80, xPct)),
        y: Math.max(0, Math.min(95, yPct)),
        width: 35,
        height: 6,
        text: 'Type new text here...',
        fontSize,
        color: textColor,
        bgColor: isWhiteoutBg ? '#ffffff' : undefined,
        isBold,
      };
      addAnnotation(newText);
    } else if (activeSubTool === 'whiteout') {
      const newBox: PageAnnotation = {
        id: `whiteout-${Date.now()}`,
        type: 'whiteout',
        x: Math.max(0, Math.min(80, xPct)),
        y: Math.max(0, Math.min(95, yPct)),
        width: 30,
        height: 5,
        fillColor: '#ffffff',
      };
      addAnnotation(newBox);
    } else if (activeSubTool === 'highlight') {
      const newHl: PageAnnotation = {
        id: `hl-${Date.now()}`,
        type: 'highlight',
        x: Math.max(0, Math.min(80, xPct)),
        y: Math.max(0, Math.min(95, yPct)),
        width: 40,
        height: 4,
        color: '#fef08a', // yellow
        opacity: 0.45,
      };
      addAnnotation(newHl);
    } else if (activeSubTool === 'stamp') {
      const newStamp: PageAnnotation = {
        id: `stamp-${Date.now()}`,
        type: 'stamp',
        x: Math.max(0, Math.min(75, xPct)),
        y: Math.max(0, Math.min(90, yPct)),
        width: 28,
        height: 8,
        text: selectedStamp,
        color: stampColor,
        style: 'boxed',
        angle: -10,
      };
      addAnnotation(newStamp);
    }
  };

  // Signature drawing pad handlers
  const handleSigMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawingSig(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCurrentStroke([{ x, y }]);
  };

  const handleSigMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCurrentStroke(prev => [...prev, { x, y }]);
  };

  const handleSigMouseUp = () => {
    if (isDrawingSig && currentStroke.length > 0) {
      setSigStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
    setIsDrawingSig(false);
  };

  const handleInsertSignature = () => {
    if (sigStrokes.length === 0) return;
    const newSig: PageAnnotation = {
      id: `sig-${Date.now()}`,
      type: 'signature',
      x: 35,
      y: 75,
      width: 30,
      height: 12,
      points: sigStrokes,
      color: sigColor,
      lineWidth: 2,
    };
    addAnnotation(newSig);
    setShowSigModal(false);
    setSigStrokes([]);
  };

  // Save all annotations into the PDF
  const handleSaveToPdf = async () => {
    try {
      setIsBaking(true);
      const newBytes = await bakeAnnotationsIntoPdf(document.bytes, annotations);
      await onUpdateDocumentBytes(newBytes, 'Text and annotations saved to PDF permanently');
      setAnnotations({});
      setSelectedAnnId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save annotations to PDF');
    } finally {
      setIsBaking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header & Tools Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        {/* Tool selector buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveSubTool('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              activeSubTool === 'text'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Add / Edit Text
          </button>

          <button
            onClick={() => setActiveSubTool('whiteout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              activeSubTool === 'whiteout'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
            title="Cover existing printed text with white block to erase it"
          >
            <Square className="w-3.5 h-3.5 text-white" />
            Whiteout (Erase)
          </button>

          <button
            onClick={() => setShowSigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 text-slate-300 border border-slate-700 hover:border-slate-600 transition"
          >
            <PenTool className="w-3.5 h-3.5 text-indigo-400" />
            Sign Document
          </button>

          <button
            onClick={() => setActiveSubTool('stamp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              activeSubTool === 'stamp'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Stamp className="w-3.5 h-3.5 text-emerald-400" />
            Stamp
          </button>

          <button
            onClick={() => setActiveSubTool('highlight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              activeSubTool === 'highlight'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-400" />
            Highlight
          </button>
        </div>

        {/* Page Switcher & Save Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-200">
              Page {currentPage} of {document.pageCount}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(document.pageCount, p + 1))}
              disabled={currentPage >= document.pageCount}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleSaveToPdf}
            disabled={isBaking || Object.values(annotations).every(a => a.length === 0)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            {isBaking ? 'Baking...' : 'Save Changes to PDF'}
          </button>
        </div>
      </div>

      {/* Sub-tool Properties Bar */}
      {activeSubTool === 'text' && (
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span>Font Size:</span>
            <input
              type="number"
              min="8"
              max="72"
              value={fontSize}
              onChange={e => setFontSize(parseInt(e.target.value, 10) || 14)}
              className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span>Color:</span>
            <input
              type="color"
              value={textColor}
              onChange={e => setTextColor(e.target.value)}
              className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isBold}
              onChange={e => setIsBold(e.target.checked)}
              className="rounded bg-slate-900 text-blue-600"
            />
            <span className="font-bold">Bold</span>
          </label>

          <label
            className="flex items-center gap-1.5 cursor-pointer bg-blue-950/40 px-2 py-1 rounded border border-blue-500/30 text-blue-300"
            title="Whiteout background hides the existing text underneath and replaces it with your new text"
          >
            <input
              type="checkbox"
              checked={isWhiteoutBg}
              onChange={e => setIsWhiteoutBg(e.target.checked)}
              className="rounded bg-slate-900 text-blue-600"
            />
            <span>White Background (Cover Old Text)</span>
          </label>

          <span className="text-[11px] text-slate-400 ml-auto">
            Click anywhere on the PDF page below to place text.
          </span>
        </div>
      )}

      {activeSubTool === 'stamp' && (
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span>Choose Stamp:</span>
          {['APPROVED', 'CONFIDENTIAL', 'PAID', 'REJECTED', 'DRAFT', 'URGENT'].map(st => (
            <button
              key={st}
              onClick={() => {
                setSelectedStamp(st);
                if (st === 'APPROVED' || st === 'PAID') setStampColor('#16a34a');
                else if (st === 'REJECTED' || st === 'URGENT') setStampColor('#dc2626');
                else setStampColor('#2563eb');
              }}
              className={`px-2.5 py-1 rounded font-bold transition text-[11px] border ${
                selectedStamp === st
                  ? 'bg-slate-700 text-white border-blue-500'
                  : 'bg-slate-900/60 text-slate-400 border-slate-750'
              }`}
            >
              {st}
            </button>
          ))}
          <span className="text-[11px] text-slate-400 ml-auto">
            Click on page below to stamp.
          </span>
        </div>
      )}

      {/* Editor Canvas Page Container */}
      <div className="flex justify-center p-4 bg-slate-950/60 rounded-3xl border border-slate-800/80 overflow-auto min-h-[500px]">
        <div
          ref={containerRef}
          onClick={handlePageClick}
          className="relative bg-white shadow-2xl rounded-sm cursor-crosshair select-none"
          style={{
            width: currentThumb?.width ? Math.min(680, currentThumb.width) : 600,
            aspectRatio: currentThumb ? `${currentThumb.width} / ${currentThumb.height}` : '3/4',
          }}
        >
          {/* Base Page Image */}
          {currentThumb?.dataUrl ? (
            <img
              src={currentThumb.dataUrl}
              alt={`Page ${currentPage}`}
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              Loading preview...
            </div>
          )}

          {/* Render Active Annotations on this Page */}
          {currentAnnotations.map(ann => {
            const isSelected = selectedAnnId === ann.id;

            if (ann.type === 'text') {
              return (
                <div
                  key={ann.id}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedAnnId(ann.id);
                  }}
                  className={`absolute p-1 cursor-move group ${
                    isSelected ? 'ring-2 ring-blue-500 rounded' : 'hover:ring-1 hover:ring-blue-300'
                  }`}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    backgroundColor: ann.bgColor || 'transparent',
                  }}
                >
                  <textarea
                    value={ann.text}
                    onChange={e => updateAnnotation(ann.id, { text: e.target.value })}
                    style={{
                      fontSize: `${ann.fontSize}px`,
                      color: ann.color,
                      fontWeight: ann.isBold ? 'bold' : 'normal',
                      backgroundColor: 'transparent',
                    }}
                    className="resize border-0 outline-none p-0.5 leading-tight font-sans focus:bg-white/20"
                    rows={ann.text.split('\n').length}
                  />

                  {/* Delete button on hover/selected */}
                  {isSelected && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteAnnotation(ann.id);
                      }}
                      className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            }

            if (ann.type === 'whiteout') {
              return (
                <div
                  key={ann.id}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedAnnId(ann.id);
                  }}
                  className={`absolute cursor-move ${
                    isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-slate-300'
                  }`}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: `${ann.width}%`,
                    height: `${ann.height}%`,
                    backgroundColor: ann.fillColor || '#ffffff',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  {isSelected && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteAnnotation(ann.id);
                      }}
                      className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            }

            if (ann.type === 'stamp') {
              return (
                <div
                  key={ann.id}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedAnnId(ann.id);
                  }}
                  className={`absolute cursor-move select-none p-2 border-2 rounded ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    borderColor: ann.color,
                    color: ann.color,
                    transform: `rotate(${ann.angle || 0}deg)`,
                  }}
                >
                  <span className="font-black text-sm tracking-widest">{ann.text}</span>
                  {isSelected && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteAnnotation(ann.id);
                      }}
                      className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            }

            if (ann.type === 'highlight') {
              return (
                <div
                  key={ann.id}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedAnnId(ann.id);
                  }}
                  className={`absolute cursor-move ${isSelected ? 'ring-1 ring-blue-500' : ''}`}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: `${ann.width}%`,
                    height: `${ann.height}%`,
                    backgroundColor: ann.color || '#fef08a',
                    opacity: ann.opacity ?? 0.45,
                  }}
                >
                  {isSelected && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteAnnotation(ann.id);
                      }}
                      className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            }

            if (ann.type === 'signature') {
              return (
                <div
                  key={ann.id}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedAnnId(ann.id);
                  }}
                  className={`absolute cursor-move ${isSelected ? 'ring-2 ring-blue-500 rounded' : ''}`}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: `${ann.width}%`,
                    height: `${ann.height}%`,
                  }}
                >
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {ann.points.map((stroke, sIdx) => {
                      if (stroke.length < 2) return null;
                      const d = stroke.reduce(
                        (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
                        ''
                      );
                      return (
                        <path
                          key={sIdx}
                          d={d}
                          fill="none"
                          stroke={ann.color || '#1e3a8a'}
                          strokeWidth={ann.lineWidth || 2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      );
                    })}
                  </svg>
                  {isSelected && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteAnnotation(ann.id);
                      }}
                      className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      {/* Signature Draw Modal */}
      {showSigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-indigo-400" />
              Draw Your Signature
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Use your finger or mouse to draw your signature inside the box below.
            </p>

            <div className="relative border-2 border-dashed border-slate-700 rounded-2xl bg-white aspect-[2/1] overflow-hidden mb-4 cursor-crosshair">
              <canvas
                width={400}
                height={200}
                onMouseDown={handleSigMouseDown}
                onMouseMove={handleSigMouseMove}
                onMouseUp={handleSigMouseUp}
                onMouseLeave={handleSigMouseUp}
                onTouchStart={e => {
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((touch.clientX - rect.left) / rect.width) * 100;
                  const y = ((touch.clientY - rect.top) / rect.height) * 100;
                  setIsDrawingSig(true);
                  setCurrentStroke([{ x, y }]);
                }}
                onTouchMove={e => {
                  if (!isDrawingSig) return;
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((touch.clientX - rect.left) / rect.width) * 100;
                  const y = ((touch.clientY - rect.top) / rect.height) * 100;
                  setCurrentStroke(prev => [...prev, { x, y }]);
                }}
                onTouchEnd={handleSigMouseUp}
                className="w-full h-full block"
              />

              {/* Render lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {sigStrokes.map((str, idx) => (
                  <path
                    key={idx}
                    d={str.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')}
                    fill="none"
                    stroke={sigColor}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentStroke.length > 1 && (
                  <path
                    d={currentStroke.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')}
                    fill="none"
                    stroke={sigColor}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSigStrokes([]);
                  setCurrentStroke([]);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Clear
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSigModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertSignature}
                  disabled={sigStrokes.length === 0}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                >
                  Insert on PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
