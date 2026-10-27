import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  MousePointer,
  Hand,
  Pencil,
  Eraser,
  Square,
  Circle,
  StickyNote,
  Type,
  Image as ImageIcon,
  MoveRight,
  Undo2,
  Redo2,
  Sliders,
  MessageSquare,
  Smile,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ToolType } from '../types/canvas';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isPropertiesOpen?: boolean;
  onToggleProperties?: () => void;
  hasSelection?: boolean;
  isCursorChatActive?: boolean;
  onToggleCursorChat?: () => void;
  isReactionPickerOpen?: boolean;
  onToggleReactionPicker?: () => void;
  onUploadImage?: () => void;
  isMobile?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isPropertiesOpen = false,
  onToggleProperties,
  hasSelection = false,
  isCursorChatActive = false,
  onToggleCursorChat,
  isReactionPickerOpen = false,
  onToggleReactionPicker,
  onUploadImage,
  isMobile = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Recompute scroll state for mobile cues
  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(maxScroll > 6 && el.scrollLeft < maxScroll - 6);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  // Center active tool button into view on mobile
  useEffect(() => {
    if (isMobile && scrollContainerRef.current) {
      const activeBtn = scrollContainerRef.current.querySelector('.icon-btn.active') as HTMLElement | null;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTool, isMobile]);

  const handleScrollStep = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const delta = direction === 'left' ? -140 : 140;
      scrollContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const tools: Array<{ id: ToolType; label: string; icon: React.ReactNode; shortcut: string }> = [
    { id: 'select', label: 'Select (V)', icon: <MousePointer size={isMobile ? 16 : 18} />, shortcut: 'V' },
    { id: 'hand', label: 'Hand / Pan (H or Space)', icon: <Hand size={isMobile ? 16 : 18} />, shortcut: 'H' },
    { id: 'draw', label: 'Freehand Pen (P)', icon: <Pencil size={isMobile ? 16 : 18} />, shortcut: 'P' },
    { id: 'eraser', label: 'Eraser (E)', icon: <Eraser size={isMobile ? 16 : 18} />, shortcut: 'E' },
    { id: 'rectangle', label: 'Rectangle (R)', icon: <Square size={isMobile ? 16 : 18} />, shortcut: 'R' },
    { id: 'circle', label: 'Circle (O)', icon: <Circle size={isMobile ? 16 : 18} />, shortcut: 'O' },
    { id: 'sticky', label: 'Sticky Note (S)', icon: <StickyNote size={isMobile ? 16 : 18} />, shortcut: 'S' },
    { id: 'text', label: 'Text (T)', icon: <Type size={isMobile ? 16 : 18} />, shortcut: 'T' },
    { id: 'image', label: 'Image (Upload / Ctrl+V)', icon: <ImageIcon size={isMobile ? 16 : 18} />, shortcut: 'I' },
    { id: 'arrow', label: 'Arrow (A)', icon: <MoveRight size={isMobile ? 16 : 18} />, shortcut: 'A' },
  ];

  const btnSize = isMobile ? '35px' : '38px';
  const iconSize = isMobile ? 16 : 18;

  return (
    <nav
      className="glass-panel"
      role="toolbar"
      aria-label="Canvas Drawing and Selection Tools"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        bottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        zIndex: 60,
        width: isMobile ? 'calc(100vw - 16px)' : 'auto',
        maxWidth: isMobile ? '560px' : 'calc(100vw - 32px)',
        padding: isMobile ? '3px 4px' : '6px 8px',
        borderRadius: isMobile ? '16px' : '14px',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
        background: 'rgba(18, 22, 34, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Mobile Scroll Left Hint Button */}
      {isMobile && canScrollLeft && (
        <button
          className="icon-btn"
          onClick={() => handleScrollStep('left')}
          aria-label="Scroll tools left"
          style={{
            width: '24px',
            height: btnSize,
            flexShrink: 0,
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--text-main)',
            marginRight: '2px',
          }}
        >
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Main Tools Scrollable Strip */}
      <div
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '3px' : '4px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          overscrollBehaviorX: 'contain',
          width: '100%',
          padding: '1px 2px',
        }}
      >
        {tools.map((t) => (
          <button
            key={t.id}
            className={`icon-btn ${activeTool === t.id ? 'active' : ''}`}
            style={{
              flexShrink: 0,
              width: btnSize,
              height: btnSize,
            }}
            onClick={() => {
              if (t.id === 'image' && onUploadImage) {
                onUploadImage();
              } else {
                setActiveTool(t.id);
              }
            }}
            data-tooltip={t.label}
            aria-label={t.label}
          >
            {t.icon}
          </button>
        ))}

        <div
          style={{
            width: '1px',
            height: isMobile ? '20px' : '24px',
            background: 'var(--border-subtle)',
            margin: isMobile ? '0 2px' : '0 4px',
            flexShrink: 0,
          }}
        />

        <button
          className="icon-btn"
          style={{
            flexShrink: 0,
            width: btnSize,
            height: btnSize,
          }}
          onClick={onUndo}
          disabled={!canUndo}
          data-tooltip="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={iconSize} />
        </button>

        <button
          className="icon-btn"
          style={{
            flexShrink: 0,
            width: btnSize,
            height: btnSize,
          }}
          onClick={onRedo}
          disabled={!canRedo}
          data-tooltip="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={iconSize} />
        </button>

        {onToggleProperties && (
          <>
            <div
              style={{
                width: '1px',
                height: isMobile ? '20px' : '24px',
                background: 'var(--border-subtle)',
                margin: isMobile ? '0 2px' : '0 4px',
                flexShrink: 0,
              }}
            />
            <button
              className={`icon-btn ${isPropertiesOpen ? 'active' : ''}`}
              onClick={onToggleProperties}
              data-tooltip="Style & Properties Drawer"
              aria-label="Style & Properties Drawer"
              style={{
                position: 'relative',
                flexShrink: 0,
                width: btnSize,
                height: btnSize,
              }}
            >
              <Sliders size={iconSize} />
              {hasSelection && (
                <span
                  style={{
                    position: 'absolute',
                    top: isMobile ? '4px' : '5px',
                    right: isMobile ? '4px' : '5px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    boxShadow: '0 0 6px var(--primary-glow)',
                  }}
                />
              )}
            </button>
          </>
        )}

        {onToggleCursorChat && (
          <button
            className={`icon-btn ${isCursorChatActive ? 'active' : ''}`}
            onClick={onToggleCursorChat}
            data-tooltip="Cursor Chat (/)"
            aria-label="Cursor Chat (/ to talk)"
            style={{
              position: 'relative',
              flexShrink: 0,
              width: btnSize,
              height: btnSize,
            }}
          >
            <MessageSquare size={iconSize} />
          </button>
        )}

        {onToggleReactionPicker && (
          <button
            className={`icon-btn ${isReactionPickerOpen ? 'active' : ''}`}
            onClick={onToggleReactionPicker}
            data-tooltip="Reactions (X)"
            data-reaction-toggle="true"
            aria-label="Cursor Reactions (X to react)"
            style={{
              position: 'relative',
              flexShrink: 0,
              width: btnSize,
              height: btnSize,
            }}
          >
            <Smile size={iconSize} />
          </button>
        )}
      </div>

      {/* Mobile Scroll Right Hint Button */}
      {isMobile && canScrollRight && (
        <button
          className="icon-btn"
          onClick={() => handleScrollStep('right')}
          aria-label="Scroll tools right"
          style={{
            width: '24px',
            height: btnSize,
            flexShrink: 0,
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--text-main)',
            marginLeft: '2px',
          }}
        >
          <ChevronRight size={14} />
        </button>
      )}
    </nav>
  );
};
