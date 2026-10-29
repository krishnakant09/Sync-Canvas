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
  HardDrive,
  Menu,
  X,
  User,
  Sliders,
} from 'lucide-react';
import type { UserPresence, UserProfile, Viewport } from '../types/canvas';
import type { ConnectionStatus } from '../hooks/useYjsRoom';

interface CanvasHeaderProps {
  viewport: Viewport;
  connectionStatus: ConnectionStatus;
  roomName: string;
  userProfile: UserProfile;
  remoteUsers: UserPresence[];
  isIndexedDBReady: boolean;
  onOpenProfileModal: () => void;
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
  isMobile?: boolean;
  isPropertiesOpen?: boolean;
  onToggleProperties?: () => void;
  hasSelection?: boolean;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  viewport,
  connectionStatus,
  roomName,
  userProfile,
  remoteUsers,
  isIndexedDBReady,
  onOpenProfileModal,
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
  isMobile = false,
  isPropertiesOpen = false,
  onToggleProperties,
  hasSelection = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [roomInput, setRoomInput] = useState(roomName);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCopyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomName);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url.toString());
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url.toString();
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy room link:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportJSON(json);
      } catch {
        alert('Failed to parse board JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomInput.trim();
    if (trimmed && trimmed !== roomName) {
      onChangeRoom(trimmed);
    } else {
      setRoomInput(roomName);
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
        return 'Live';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
    }
  };

  if (isMobile) {
    return (
      <>
        <header
          className="glass-panel"
          role="banner"
          style={{
            position: 'absolute',
            top: 'max(10px, env(safe-area-inset-top, 10px))',
            left: '10px',
            right: '10px',
            height: '46px',
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 50,
          }}
        >
          {/* Mobile Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Sparkles size={14} />
            </div>
            <span
              style={{
                fontWeight: 800,
                fontSize: '14px',
                background: 'linear-gradient(135deg, #a5b4fc, #6366f1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SyncCanvas
            </span>
          </div>

          {/* Compact Room Pill */}
          <button
            onClick={() => {
              setRoomInput(roomName);
              setIsEditingRoom(true);
              setIsMobileMenuOpen(true);
            }}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              maxWidth: '110px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: 'var(--primary)' }}>#</span> {roomName}
          </button>

          {/* Mobile Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className="icon-btn"
              style={{
                width: '32px',
                height: '32px',
                background: copied ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)',
              }}
              onClick={handleCopyLink}
              title="Share Room Link"
              aria-label="Share Room Link"
            >
              {copied ? <Check size={14} /> : <Share2 size={14} />}
            </button>

            <button
              onClick={onOpenProfileModal}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: userProfile.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                border: '2px solid rgba(255,255,255,0.2)',
              }}
              title="Your Profile"
              aria-label="Your Profile"
            >
              {userProfile.name ? userProfile.name[0].toUpperCase() : 'U'}
            </button>

            <button
              className="icon-btn"
              style={{ width: '32px', height: '32px' }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              title="Menu"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>

        {/* Hidden File Input for JSON import */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={handleFileChange}
        />

        {/* Mobile Full Action Drawer */}
        {isMobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              zIndex: 90,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              padding: '12px',
              paddingTop: 'max(60px, calc(env(safe-area-inset-top, 0px) + 60px))',
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="glass-panel animate-fade-in"
              style={{
                width: '100%',
                maxHeight: 'calc(100vh - 80px)',
                overflowY: 'auto',
                padding: '16px',
                backgroundColor: '#121622',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '15px' }}>
                  <Sparkles size={16} color="var(--primary)" />
                  Canvas Actions & Settings
                </div>
                <button
                  className="icon-btn"
                  style={{ width: '28px', height: '28px' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status pill */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(),
                      boxShadow: `0 0 8px ${getStatusColor()}`,
                    }}
                  />
                  {getStatusLabel()} ({totalElements} elements)
                </div>
                {isIndexedDBReady && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    <HardDrive size={11} /> Offline Cached
                  </div>
                )}
              </div>

              {/* Room Switcher */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Current Room
                </label>
                <form
                  onSubmit={(e) => {
                    handleRoomSubmit(e);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{ display: 'flex', gap: '6px' }}
                >
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    placeholder="Room name..."
                    style={{ flex: 1, height: '36px', fontSize: '13px' }}
                  />
                  <button
                    type="submit"
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Switch
                  </button>
                </form>
              </div>

              {/* Collaborators */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Online Peers ({remoteUsers.length + 1})
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${userProfile.color}`,
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: userProfile.color }} />
                    {userProfile.name} (You)
                  </div>
                  {remoteUsers.map((peer) => (
                    <div
                      key={peer.clientId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${peer.user.color || '#6366f1'}`,
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: peer.user.color || '#6366f1' }} />
                      {peer.user.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Viewport Zoom */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Zoom: {Math.round(viewport.zoom * 100)}%
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <button onClick={onZoomOut} className="glass-panel" style={{ height: '36px', fontSize: '12px', fontWeight: 600 }}>
                    <ZoomOut size={14} /> Out
                  </button>
                  <button onClick={onResetZoom} className="glass-panel" style={{ height: '36px', fontSize: '12px', fontWeight: 600 }}>
                    100%
                  </button>
                  <button onClick={onZoomIn} className="glass-panel" style={{ height: '36px', fontSize: '12px', fontWeight: 600 }}>
                    <ZoomIn size={14} /> In
                  </button>
                  <button onClick={() => { onFitContent(); setIsMobileMenuOpen(false); }} className="glass-panel" style={{ height: '36px', fontSize: '12px', fontWeight: 600 }}>
                    <Maximize2 size={14} /> Fit
                  </button>
                </div>
              </div>

              {/* Style & Properties Drawer Toggle */}
              {onToggleProperties && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onToggleProperties();
                  }}
                  className="glass-panel"
                  style={{
                    height: '40px',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    width: '100%',
                    justifyContent: 'center',
                    border: isPropertiesOpen ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    color: isPropertiesOpen ? 'var(--primary)' : 'var(--text-main)',
                  }}
                >
                  <Sliders size={16} color={isPropertiesOpen ? 'var(--primary)' : 'currentColor'} />
                  {isPropertiesOpen ? 'Close Style Drawer' : `Open Style & Properties ${hasSelection ? `(Selection Active)` : ''}`}
                </button>
              )}

              {/* Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => { onExportPNG(); setIsMobileMenuOpen(false); }}
                  className="glass-panel"
                  style={{ height: '38px', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                >
                  <Download size={14} /> Export PNG
                </button>
                <button
                  onClick={() => { onExportJSON(); setIsMobileMenuOpen(false); }}
                  className="glass-panel"
                  style={{ height: '38px', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                >
                  <FileCode2 size={14} /> Export JSON
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setIsMobileMenuOpen(false); }}
                  className="glass-panel"
                  style={{ height: '38px', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                >
                  <Upload size={14} /> Import JSON
                </button>
                <button
                  onClick={() => { onOpenProfileModal(); setIsMobileMenuOpen(false); }}
                  className="glass-panel"
                  style={{ height: '38px', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                >
                  <User size={14} /> Edit Profile
                </button>
                <button
                  onClick={() => { onOpenShortcuts(); setIsMobileMenuOpen(false); }}
                  className="glass-panel"
                  style={{ height: '38px', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                >
                  <HelpCircle size={14} /> Gestures Guide
                </button>
                <button
                  onClick={() => { onClearCanvas(); setIsMobileMenuOpen(false); }}
                  className="glass-panel"
                  style={{ height: '38px', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--accent-rose)' }}
                >
                  <Trash2 size={14} /> Clear Canvas
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setRoomInput(roomName);
                  setIsEditingRoom(false);
                }
              }}
              aria-label="Room name"
              placeholder="Enter room name..."
              style={{
                height: '28px',
                padding: '2px 8px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                width: '130px',
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
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-main)',
            }}
            data-tooltip="Click to switch room"
            data-tooltip-pos="bottom"
            aria-label={`Current room: ${roomName}. Click to switch room`}
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
            padding: '3px 9px',
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
          {getStatusLabel()} ({totalElements})
        </div>

        {/* Offline IndexedDB Persistence Badge */}
        {isIndexedDBReady && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '20px',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--accent-emerald)',
            }}
            data-tooltip="Changes auto-persisted to IndexedDB for offline resilience"
            data-tooltip-pos="bottom"
          >
            <HardDrive size={11} />
            Offline Ready
          </div>
        )}

        {/* Share Room Button */}
        <button
          className="icon-btn"
          style={{
            height: '28px',
            padding: '0 8px',
            width: 'auto',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 600,
            background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
          onClick={handleCopyLink}
          data-tooltip="Copy invite link to collaborate in another tab"
          data-tooltip-pos="bottom"
          aria-label={copied ? 'Room link copied to clipboard' : 'Share room invite link'}
        >
          {copied ? <Check size={12} /> : <Share2 size={12} />}
          {copied ? 'Copied Link!' : 'Share'}
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

      {/* Right Actions: Collaborators, Profile, Export, Import, Help */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Active Collaborators Avatar Stack */}
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '4px' }}>
          {remoteUsers.slice(0, 4).map((peer) => (
            <div
              key={peer.clientId}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: peer.user.color || '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                border: '2px solid #121622',
                marginLeft: '-6px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
              }}
              data-tooltip={`${peer.user.name} (Online)`}
              data-tooltip-pos="bottom"
            >
              {peer.user.name ? peer.user.name[0].toUpperCase() : 'U'}
            </div>
          ))}

          {remoteUsers.length > 4 && (
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700,
                border: '2px solid #121622',
                marginLeft: '-6px',
              }}
              data-tooltip={`+${remoteUsers.length - 4} more collaborators`}
              data-tooltip-pos="bottom"
            >
              +{remoteUsers.length - 4}
            </div>
          )}

          {/* Current User Avatar Button */}
          <button
            onClick={onOpenProfileModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px 2px 4px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: `1.5px solid ${userProfile.color}`,
              marginLeft: '8px',
            }}
            data-tooltip="Edit your display name & color"
            data-tooltip-pos="bottom"
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: userProfile.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              {userProfile.name ? userProfile.name[0].toUpperCase() : 'Y'}
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userProfile.name}
            </span>
          </button>
        </div>

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
          <Upload size={16} />
        </button>

        <button
          className="icon-btn"
          onClick={onExportJSON}
          data-tooltip="Export JSON"
          data-tooltip-pos="bottom"
        >
          <FileCode2 size={16} />
        </button>

        <button
          className="icon-btn"
          onClick={onExportPNG}
          data-tooltip="Export PNG"
          data-tooltip-pos="bottom"
        >
          <Download size={16} />
        </button>

        <button
          className="icon-btn"
          onClick={onClearCanvas}
          data-tooltip="Clear Canvas"
          data-tooltip-pos="bottom"
          style={{ color: 'var(--accent-rose)' }}
        >
          <Trash2 size={16} />
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 2px' }} />

        {onToggleProperties && (
          <button
            className={`icon-btn ${isPropertiesOpen ? 'active' : ''}`}
            onClick={onToggleProperties}
            data-tooltip="Style & Properties Drawer"
            data-tooltip-pos="bottom"
            style={{ position: 'relative' }}
          >
            <Sliders size={16} />
            {hasSelection && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                }}
              />
            )}
          </button>
        )}

        <button
          className="icon-btn"
          onClick={onOpenShortcuts}
          data-tooltip="Keyboard Shortcuts (?)"
          data-tooltip-pos="bottom"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
};
