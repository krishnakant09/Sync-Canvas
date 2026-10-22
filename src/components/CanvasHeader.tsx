import React, { useRef, useState } from 'react';
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
  Share2,
  Check,
} from 'lucide-react';
import type { Viewport } from '../types/canvas';
import type { ConnectionStatus } from '../hooks/useYjsRoom';

interface CanvasHeaderProps {
  viewport: Viewport;
  connectionStatus: ConnectionStatus;
  roomName: string;
  onChangeRoom: (newRoom: string) => void;
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
  connectionStatus,
  roomName,
  onChangeRoom,
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
  const [copied, setCopied] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [roomInput, setRoomInput] = useState(roomName);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomName);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomInput.trim() && roomInput !== roomName) {
      onChangeRoom(roomInput.trim());
    }
    setIsEditingRoom(false);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'var(--accent-emerald)';
      case 'connecting':
        return 'var(--accent-amber)';
      case 'disconnected':
        return 'var(--accent-rose)';
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Multiplayer Live';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
    }
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

        {/* Room Switcher */}
        {isEditingRoom ? (
          <form onSubmit={handleRoomSubmit} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              autoFocus
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              onBlur={() => setIsEditingRoom(false)}
              style={{
                height: '28px',
                padding: '2px 8px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                width: '140px',
              }}
            />
          </form>
        ) : (
          <button
            onClick={() => {
              setRoomInput(roomName);
              setIsEditingRoom(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-main)',
            }}
            data-tooltip="Click to switch room"
            data-tooltip-pos="bottom"
          >
            <span style={{ color: 'var(--primary)' }}>#</span> {roomName}
          </button>
        )}

        {/* Live Multiplayer Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '20px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#c7d2fe',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              boxShadow: `0 0 8px ${getStatusColor()}`,
            }}
          />
          {getStatusLabel()} ({totalElements} items)
        </div>

        {/* Share / Copy Room Link Button */}
        <button
          className="icon-btn"
          style={{
            height: '28px',
            padding: '0 8px',
            width: 'auto',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
          onClick={handleCopyLink}
          data-tooltip="Copy invite link to collaborate in another tab"
          data-tooltip-pos="bottom"
        >
          {copied ? <Check size={13} /> : <Share2 size={13} />}
          {copied ? 'Copied Link!' : 'Share Room'}
        </button>
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
