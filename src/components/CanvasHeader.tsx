import React, { useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  FileCode2,
  Upload,
  Trash2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Viewport } from '../types/canvas';

interface CanvasHeaderProps {
  viewport: Viewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitContent: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (data: any) => void;
  onClearCanvas: () => void;
  onOpenShortcuts: () => void;
  totalElements: number;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  viewport,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitContent,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  onClearCanvas,
  onOpenShortcuts,
  totalElements,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportJSON(json);
      } catch (err) {
        alert('Failed to parse board JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header
      className="glass-panel"
      role="banner"
      style={{
        position: 'absolute',
        top: '16px',
        left: '24px',
        right: '24px',
        height: '52px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
      }}
    >
      {/* Brand & Room Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 800,
            fontSize: '16px',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #a5b4fc, #6366f1, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Sparkles size={16} />
          </div>
          SyncCanvas
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#a5b4fc',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-emerald)',
              boxShadow: '0 0 6px var(--accent-emerald)',
            }}
          />
          Phase 1: Local Engine Ready ({totalElements} items)
        </div>
      </div>

      {/* Center Viewport Zoom Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '8px',
          padding: '2px 4px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <button
          className="icon-btn"
          style={{ width: '28px', height: '28px' }}
          onClick={onZoomOut}
          data-tooltip="Zoom Out (-)"
          data-tooltip-pos="bottom"
        >
          <ZoomOut size={15} />
        </button>

        <button
          onClick={onResetZoom}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            padding: '0 8px',
            height: '28px',
            color: 'var(--text-main)',
          }}
          data-tooltip="Reset Zoom (100%)"
          data-tooltip-pos="bottom"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>

        <button
          className="icon-btn"
          style={{ width: '28px', height: '28px' }}
          onClick={onZoomIn}
          data-tooltip="Zoom In (+)"
          data-tooltip-pos="bottom"
        >
          <ZoomIn size={15} />
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 2px' }} />

        <button
          className="icon-btn"
          style={{ width: '28px', height: '28px' }}
          onClick={onFitContent}
          data-tooltip="Fit to Content (Shift+1)"
          data-tooltip-pos="bottom"
        >
          <Maximize2 size={15} />
        </button>

        <button
          className="icon-btn"
          style={{ width: '28px', height: '28px' }}
          onClick={onResetZoom}
          data-tooltip="Reset View (0, 0)"
          data-tooltip-pos="bottom"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Right Actions: Export / Import / Clear / Help */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={handleFileChange}
        />

        <button
          className="icon-btn"
          onClick={() => fileInputRef.current?.click()}
          data-tooltip="Import JSON"
          data-tooltip-pos="bottom"
        >
          <Upload size={17} />
        </button>

        <button
          className="icon-btn"
          onClick={onExportJSON}
          data-tooltip="Export JSON"
          data-tooltip-pos="bottom"
        >
          <FileCode2 size={17} />
        </button>

        <button
          className="icon-btn"
          onClick={onExportPNG}
          data-tooltip="Export PNG"
          data-tooltip-pos="bottom"
        >
          <Download size={17} />
        </button>

        <button
          className="icon-btn"
          onClick={onClearCanvas}
          data-tooltip="Clear Canvas"
          data-tooltip-pos="bottom"
          style={{ color: 'var(--accent-rose)' }}
        >
          <Trash2 size={17} />
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 2px' }} />

        <button
          className="icon-btn"
          onClick={onOpenShortcuts}
          data-tooltip="Keyboard Shortcuts (?)"
          data-tooltip-pos="bottom"
        >
          <HelpCircle size={17} />
        </button>
      </div>
    </header>
  );
};
