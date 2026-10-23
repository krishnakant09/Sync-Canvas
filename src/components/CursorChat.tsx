import React, { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import type { Point, UserProfile } from '../types/canvas';

interface CursorChatProps {
  isActive: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  mouseScreenPos: Point;
  onBroadcastChat: (message: string | null) => void;
  isMobile?: boolean;
}

export const CursorChat: React.FC<CursorChatProps> = ({
  isActive,
  onClose,
  userProfile,
  mouseScreenPos,
  onBroadcastChat,
  isMobile = false,
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fadeTimeoutRef = useRef<number | null>(null);

  // Auto-focus input when chat is activated
  useEffect(() => {
    if (isActive) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => window.clearTimeout(timer);
    }
  }, [isActive]);

  // Clean up auto-fade timer on unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  if (!isActive) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);
    onBroadcastChat(val.trim().length > 0 ? val : null);

    // Reset fade timer while actively typing
    if (fadeTimeoutRef.current) {
      window.clearTimeout(fadeTimeoutRef.current);
    }
    // Auto-clear message after 8 seconds of typing inactivity
    fadeTimeoutRef.current = window.setTimeout(() => {
      onBroadcastChat(null);
      onClose();
    }, 8000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    if (e.key === 'Escape') {
      e.preventDefault();
      onBroadcastChat(null);
      onClose();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (message.trim().length > 0) {
        // Broadcast and let message linger for 6 seconds
        onBroadcastChat(message.trim());
        if (fadeTimeoutRef.current) {
          window.clearTimeout(fadeTimeoutRef.current);
        }
        fadeTimeoutRef.current = window.setTimeout(() => {
          onBroadcastChat(null);
          onClose();
        }, 6000);
        // Clear input for the next quick message
        setMessage('');
      } else {
        onBroadcastChat(null);
        onClose();
      }
    }
  };

  const handleClose = () => {
    onBroadcastChat(null);
    onClose();
  };

  // Mobile fixed bottom input bar
  if (isMobile) {
    return (
      <div
        className="glass-panel animate-fade-in"
        style={{
          position: 'absolute',
          bottom: 'max(74px, env(safe-area-inset-bottom, 74px))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100vw - 24px)',
          maxWidth: '420px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 80,
          borderRadius: '24px',
          border: `1.5px solid ${userProfile.color}`,
          boxShadow: `0 12px 32px rgba(0, 0, 0, 0.7), 0 0 16px ${userProfile.color}33`,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: userProfile.color,
            flexShrink: 0,
            boxShadow: `0 0 8px ${userProfile.color}`,
          }}
        />

        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Talk live with peers... (Enter to send)"
          maxLength={100}
          style={{
            flex: 1,
            height: '32px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
          }}
        />

        <button
          className="icon-btn"
          style={{ width: '28px', height: '28px', color: userProfile.color }}
          onClick={() => {
            if (message.trim()) {
              onBroadcastChat(message.trim());
              setMessage('');
              setTimeout(() => {
                onBroadcastChat(null);
                onClose();
              }, 6000);
            }
          }}
          aria-label="Send message"
        >
          <Send size={14} />
        </button>

        <button
          className="icon-btn"
          style={{ width: '28px', height: '28px' }}
          onClick={handleClose}
          aria-label="Close Cursor Chat"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // Desktop floating speech bubble positioned right beside local cursor
  const safeLeft = Math.min(window.innerWidth - 320, Math.max(16, mouseScreenPos.x + 14));
  const safeTop = Math.min(window.innerHeight - 70, Math.max(16, mouseScreenPos.y + 14));

  return (
    <div
      className="cursor-chat-bubble animate-fade-in"
      style={{
        position: 'fixed',
        left: `${safeLeft}px`,
        top: `${safeTop}px`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(15, 23, 42, 0.96)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${userProfile.color}`,
        borderRadius: '18px',
        borderTopLeftRadius: '3px',
        boxShadow: `0 12px 28px rgba(0, 0, 0, 0.65), 0 0 16px ${userProfile.color}33`,
        zIndex: 85,
        minWidth: '220px',
        maxWidth: '340px',
        pointerEvents: 'auto',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: userProfile.color,
          flexShrink: 0,
          boxShadow: `0 0 8px ${userProfile.color}`,
        }}
      />

      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type to talk... (Esc to close)"
        maxLength={120}
        style={{
          flex: 1,
          height: '26px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
        }}
      />

      <span
        style={{
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          padding: '2px 5px',
          borderRadius: '4px',
          flexShrink: 0,
          pointerEvents: 'none',
        }}
      >
        Esc
      </span>
    </div>
  );
};
