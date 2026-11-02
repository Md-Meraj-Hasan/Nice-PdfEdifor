import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';

interface ZoomableContainerProps {
  children: React.ReactNode;
  className?: string;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
}

export const ZoomableContainer: React.FC<ZoomableContainerProps> = ({
  children,
  className = '',
  minScale = 0.8,
  maxScale = 4.0,
  initialScale = 1.0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState<number>(initialScale);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch tracking
  const initialTouchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1.0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);

  // Reset zoom & pan
  const resetZoom = () => {
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setScale(s => Math.min(maxScale, Number((s + 0.25).toFixed(2))));
  };

  const zoomOut = () => {
    setScale(s => {
      const next = Math.max(minScale, Number((s - 0.25).toFixed(2)));
      if (next <= 1.0) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Touch event handlers for 2-finger pinch-to-zoom & pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Start 2-finger pinch
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        initialTouchDistRef.current = dist;
        initialScaleRef.current = scale;
      } else if (e.touches.length === 1) {
        // Check for double tap to toggle zoom
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          if (scale > 1.1) {
            resetZoom();
          } else {
            setScale(2.0);
          }
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;

        // Single finger pan if zoomed in
        if (scale > 1.0) {
          isDraggingRef.current = true;
          dragStartRef.current = {
            x: e.touches[0].clientX - position.x,
            y: e.touches[0].clientY - position.y,
          };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialTouchDistRef.current !== null) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDist = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );

        const factor = currentDist / initialTouchDistRef.current;
        const newScale = Math.min(
          maxScale,
          Math.max(minScale, Number((initialScaleRef.current * factor).toFixed(2)))
        );
        setScale(newScale);
      } else if (e.touches.length === 1 && isDraggingRef.current && scale > 1.0) {
        e.preventDefault();
        const touch = e.touches[0];
        setPosition({
          x: touch.clientX - dragStartRef.current.x,
          y: touch.clientY - dragStartRef.current.y,
        });
      }
    };

    const onTouchEnd = () => {
      initialTouchDistRef.current = null;
      isDraggingRef.current = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [scale, position]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none touch-none ${className}`}
    >
      {/* Zoomable Content */}
      <div
        ref={contentRef}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
        }}
        className="w-full h-full flex items-center justify-center will-change-transform"
      >
        {children}
      </div>

      {/* Floating Zoom Controls for Mobile & Desktop */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl border border-slate-700/80 shadow-2xl text-slate-200">
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= minScale}
          className="p-1.5 rounded-xl hover:bg-slate-800 active:scale-95 text-slate-300 disabled:opacity-30 transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={resetZoom}
          className="px-2 py-1 rounded-xl text-[11px] font-bold text-slate-200 hover:bg-slate-800 active:scale-95 transition"
          title="Reset Zoom (Double tap)"
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= maxScale}
          className="p-1.5 rounded-xl hover:bg-slate-800 active:scale-95 text-slate-300 disabled:opacity-30 transition"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {scale !== 1.0 && (
          <button
            type="button"
            onClick={resetZoom}
            className="p-1.5 rounded-xl text-blue-400 hover:bg-slate-800 active:scale-95 transition"
            title="Reset to 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2-Finger Hint on first zoom / mobile */}
      {scale === 1.0 && (
        <div className="absolute top-2 right-2 pointer-events-none opacity-60 text-[10px] text-slate-400 bg-slate-900/70 px-2 py-0.5 rounded-full border border-slate-800">
          2-Finger Pinch to Zoom
        </div>
      )}
    </div>
  );
};
