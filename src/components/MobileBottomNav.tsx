import React, { useState } from 'react';
import {
  LayoutGrid,
  Type,
  ScanText,
  Lock,
  MoreHorizontal,
  Combine,
  Split,
  Crop,
  RotateCw,
  Maximize2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { ToolId } from '../types/pdf';

interface MobileBottomNavProps {
  activeTool: ToolId;
  setActiveTool: (tool: ToolId) => void;
  clipboardCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTool,
  setActiveTool,
  clipboardCount = 0,
}) => {
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const mainTools: { id: ToolId; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'organize',
      label: 'Pages',
      icon: <LayoutGrid className="w-5 h-5" />,
      badge: clipboardCount > 0 ? `${clipboardCount}` : undefined,
    },
    {
      id: 'edit',
      label: 'Edit Text',
      icon: <Type className="w-5 h-5" />,
    },
    {
      id: 'ocr',
      label: 'OCR',
      icon: <ScanText className="w-5 h-5" />,
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Lock className="w-5 h-5" />,
    },
  ];

  const moreTools: { id: ToolId; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'merge',
      label: 'Merge PDFs',
      desc: 'Combine multiple documents into one',
      icon: <Combine className="w-5 h-5 text-blue-400" />,
    },
    {
      id: 'split',
      label: 'Split PDF',
      desc: 'Split by condition, range or every N pages',
      icon: <Split className="w-5 h-5 text-purple-400" />,
    },
    {
      id: 'crop',
      label: 'Crop Margins',
      desc: 'Trim edges with condition filters',
      icon: <Crop className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'rotate',
      label: 'Rotate Pages',
      desc: '90°, 180°, odd/even orientation',
      icon: <RotateCw className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: 'resize',
      label: 'Size & Dimensions',
      desc: 'A4, Letter, Legal, Custom resizing',
      icon: <Maximize2 className="w-5 h-5 text-indigo-400" />,
    },
  ];

  const isMoreToolActive = moreTools.some(t => t.id === activeTool);

  return (
    <>
      {/* Bottom Navigation Bar (Visible on mobile only: md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {mainTools.map(tool => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setShowMoreSheet(false);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition relative ${
                isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                {tool.icon}
                {tool.badge && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-extrabold">
                    {tool.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tool.label}</span>
              {isActive && (
                <div className="w-4 h-0.5 rounded-full bg-blue-400 mt-0.5" />
              )}
            </button>
          );
        })}

        {/* More Tools Button */}
        <button
          onClick={() => setShowMoreSheet(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition ${
            isMoreToolActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">More</span>
          {isMoreToolActive && (
            <div className="w-4 h-0.5 rounded-full bg-blue-400 mt-0.5" />
          )}
        </button>
      </nav>

      {/* More Tools Modal Bottom Sheet */}
      {showMoreSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">All PDF Tools</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  100% Offline
                </span>
              </div>
              <button
                onClick={() => setShowMoreSheet(false)}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {moreTools.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTool(t.id);
                    setShowMoreSheet(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                    activeTool === t.id
                      ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/30'
                      : 'bg-slate-850 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    {t.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{t.label}</h4>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
