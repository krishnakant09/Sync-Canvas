export type ToolType =
  | 'select'
  | 'hand'
  | 'rectangle'
  | 'circle'
  | 'sticky'
  | 'text'
  | 'arrow'
  | 'draw'
  | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type ElementType =
  | 'rectangle'
  | 'circle'
  | 'sticky'
  | 'text'
  | 'arrow'
  | 'draw';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeStyle?: 'solid' | 'dashed';
  opacity: number;
  zIndex: number;
  
  // Text & Sticky notes
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  
  // Freehand drawing and arrows
  points?: Point[];
  arrowHead?: boolean;
  
  // CRDT / Multiplayer metadata ready for Phase 2 & 3
  updatedAt: number;
  updatedBy?: string;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface DragState {
  type: 'pan' | 'create' | 'move' | 'resize' | 'box-select';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  activeElementId?: string;
  resizeHandle?: ResizeHandle;
  initialElements?: Map<string, CanvasElement>;
  initialViewport?: Viewport;
}

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UserProfile {
  id: string;
  name: string;
  color: string;
}

export interface UserPresence {
  clientId: number;
  user: UserProfile;
  cursor?: Point | null;
  selectedElementIds?: string[];
  lastActive?: number;
  cursorChat?: string | null;
}
