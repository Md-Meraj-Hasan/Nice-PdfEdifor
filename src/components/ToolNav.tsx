import React from 'react';
import {
  LayoutGrid,
  Combine,
  Split,
  Crop,
  RotateCw,
  Maximize2,
  Type,
  ScanText,
  ClipboardPaste,
  Lock,
} from 'lucide-react';
import { ToolId } from '../types/pdf';

interface ToolNavProps {
  activeTool: ToolId;
  setActiveTool: (tool: ToolId) => void;
  clipboardCount?: number;
}

export const ToolNav: React.FC<ToolNavProps> = ({
  activeTool,
  setActiveTool,
  clipboardCount = 0,
}) => {
  const tools: { id: ToolId; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'organize',
      label: 'Arrange & Cut/Paste',
      icon: <LayoutGrid className="w-4 h-4" />,
      badge: clipboardCount > 0 ? `${clipboardCount} in clip` : undefined,
    },
    {
      id: 'merge',
      label: 'Merge PDFs',
      icon: <Combine className="w-4 h-4" />,
    },
    {
      id: 'split',
      label: 'Split by Condition',
      icon: <Split className="w-4 h-4" />,
    },
    {
      id: 'crop',
      label: 'Crop Conditions',
      icon: <Crop className="w-4 h-4" />,
    },
    {
      id: 'rotate',
      label: 'Rotate Pages',
      icon: <RotateCw className="w-4 h-4" />,
    },
    {
      id: 'resize',
      label: 'Size & Compress',
      icon: <Maximize2 className="w-4 h-4" />,
    },
    {
      id: 'edit',
      label: 'Edit Text & Draw',
      icon: <Type className="w-4 h-4" />,
    },
    {
      id: 'ocr',
      label: 'Offline OCR',
      icon: <ScanText className="w-4 h-4" />,
    },
    {
      id: 'security',
      label: 'Security & Password',
      icon: <Lock className="w-4 h-4 text-amber-400" />,
    },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-2 sm:px-6 py-2 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 min-w-max max-w-7xl mx-auto">
        {tools.map(tool => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {tool.icon}
              <span>{tool.label}</span>
              {tool.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {tool.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
