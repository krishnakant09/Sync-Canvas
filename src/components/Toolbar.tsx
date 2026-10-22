import React from 'react';
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  StickyNote,
  Type,
  MoveRight,
  Pencil,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { ToolType } from '../types/canvas';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const tools: Array<{ id: ToolType; label: string; icon: React.ReactNode; shortcut: string }> = [
    { id: 'select', label: 'Select (V)', icon: <MousePointer size={18} />, shortcut: 'V' },
    { id: 'hand', label: 'Hand / Pan (H or Space)', icon: <Hand size={18} />, shortcut: 'H' },
    { id: 'rectangle', label: 'Rectangle (R)', icon: <Square size={18} />, shortcut: 'R' },
    { id: 'circle', label: 'Circle (O)', icon: <Circle size={18} />, shortcut: 'O' },
    { id: 'sticky', label: 'Sticky Note (S)', icon: <StickyNote size={18} />, shortcut: 'S' },
    { id: 'text', label: 'Text (T)', icon: <Type size={18} />, shortcut: 'T' },
    { id: 'arrow', label: 'Arrow (A)', icon: <MoveRight size={18} />, shortcut: 'A' },
    { id: 'draw', label: 'Freehand Pen (P)', icon: <Pencil size={18} />, shortcut: 'P' },
    { id: 'eraser', label: 'Eraser (E)', icon: <Eraser size={18} />, shortcut: 'E' },
  ];

  return (
    <div
      className="glass-panel"
      role="toolbar"
      aria-label="Canvas Drawing and Selection Tools"
      style={{
        position: 'absolute',
        bottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 8px',
        zIndex: 50,
        maxWidth: 'calc(100vw - 16px)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
      }}
    >
      {tools.map((t) => (
        <button
          key={t.id}
          className={`icon-btn ${activeTool === t.id ? 'active' : ''}`}
          style={{ flexShrink: 0 }}
          onClick={() => setActiveTool(t.id)}
          data-tooltip={t.label}
          aria-label={t.label}
        >
          {t.icon}
        </button>
      ))}

      <div
        style={{
          width: '1px',
          height: '24px',
          background: 'var(--border-subtle)',
          margin: '0 4px',
        }}
      />

      <button
        className="icon-btn"
        onClick={onUndo}
        disabled={!canUndo}
        data-tooltip="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <Undo2 size={18} />
      </button>

      <button
        className="icon-btn"
        onClick={onRedo}
        disabled={!canRedo}
        data-tooltip="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        <Redo2 size={18} />
      </button>
    </div>
  );
};
