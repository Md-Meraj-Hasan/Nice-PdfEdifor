export type ToolId =
  | 'organize'
  | 'merge'
  | 'split'
  | 'crop'
  | 'rotate'
  | 'resize'
  | 'edit'
  | 'ocr'
  | 'security';

export interface PageThumbnail {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface PdfDocument {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  bytes: Uint8Array;
  thumbnails: PageThumbnail[];
}

export interface PageClipboard {
  pages: {
    pageNumber: number; // 1-based
    thumbnail?: string;
  }[];
  sourceDocId: string;
  isCut: boolean;
}

// Annotation elements for Text/Edit mode
export type AnnotationType = 'text' | 'whiteout' | 'signature' | 'stamp' | 'highlight' | 'shape';

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  x: number; // percentage or pt relative to page
  y: number;
  width: number;
  height: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
  bgColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
}

export interface WhiteoutAnnotation extends BaseAnnotation {
  type: 'whiteout';
  fillColor: string; // usually #ffffff or matching background
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature';
  points: { x: number; y: number }[][];
  color: string;
  lineWidth: number;
  svgData?: string;
}

export interface StampAnnotation extends BaseAnnotation {
  type: 'stamp';
  text: string;
  color: string;
  style: 'boxed' | 'rounded' | 'clean';
  angle: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  color: string;
  opacity: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line';
  color: string;
  fillColor?: string;
  strokeWidth: number;
}

export type PageAnnotation =
  | TextAnnotation
  | WhiteoutAnnotation
  | SignatureAnnotation
  | StampAnnotation
  | HighlightAnnotation
  | ShapeAnnotation;

export type ConditionFilter =
  | 'all'
  | 'selected'
  | 'odd'
  | 'even'
  | 'portrait'
  | 'landscape';

export type SplitMode =
  | 'single' // 1 page per file
  | 'ranges' // custom ranges e.g. "1-3, 4-5"
  | 'everyN' // every N pages
  | 'odd-even' // odd and even pages
  | 'byOrientation'; // portrait vs landscape

export type PageSizeStandard =
  | 'A4'
  | 'Letter'
  | 'Legal'
  | 'A3'
  | 'A5'
  | 'Custom';

export interface CropMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
  unit: 'mm' | 'pt' | 'percent';
}
