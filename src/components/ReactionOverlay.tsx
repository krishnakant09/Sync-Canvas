import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { Point, UserPresence, UserProfile, Viewport } from '../types/canvas';

export interface ReactionEmoji {
  emoji: string;
  label: string;
  key: string;
}

const REACTION_EMOJIS: ReactionEmoji[] = [
  { emoji: '❤️', label: 'Love', key: '1' },
  { emoji: '🔥', label: 'Fire', key: '2' },
  { emoji: '🎉', label: 'Celebrate', key: '3' },
  { emoji: '👍', label: 'Thumbs Up', key: '4' },
  { emoji: '🚀', label: 'Rocket', key: '5' },
  { emoji: '👏', label: 'Clap', key: '6' },
  { emoji: '😂', label: 'Laugh', key: '7' },
  { emoji: '💯', label: '100', key: '8' },
];

interface EmojiParticle {
  id: string;
  emoji: string;
  x: number;
  y: number;
  driftX: number;
  driftY: number;
  scale: number;
  rotation: number;
  color?: string;
  delayMs: number;
}

interface ReactionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  localScreenPos: Point;
  userProfile: UserProfile;
  onBroadcastReaction: (emoji: string) => void;
  remoteUsers: UserPresence[];
  viewport: Viewport;
  isMobile?: boolean;
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({
  isOpen,
  onClose,
  localScreenPos,
  userProfile,
  onBroadcastReaction,
  remoteUsers,
  viewport,
  isMobile = false,
}) => {
  const [particles, setParticles] = useState<EmojiParticle[]>([]);
  const lastSeenReactionsRef = useRef<Map<number, string>>(new Map());
  const pickerRef = useRef<HTMLDivElement>(null);

  // Spawn a cluster of floating emoji particles
  const spawnBurst = useCallback(
    (emoji: string, originX: number, originY: number, color?: string, count = 6) => {
      const now = Date.now();
      const newParticles: EmojiParticle[] = [];

      for (let i = 0; i < count; i++) {
        // Trajectory with natural physics variation
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4; // roughly upwards cone
        const speed = 130 + Math.random() * 120;
        const driftX = Math.cos(angle) * speed;
        const driftY = Math.sin(angle) * speed;

        newParticles.push({
          id: `${now}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          emoji,
          x: originX + (Math.random() - 0.5) * 16,
          y: originY + (Math.random() - 0.5) * 16,
          driftX,
          driftY,
          scale: 0.9 + Math.random() * 0.45,
          rotation: (Math.random() - 0.5) * 45,
          color,
          delayMs: i * 40,
        });
      }

      setParticles((prev) => {
        // Keep maximum 120 particles to guarantee smooth 60fps performance
        const combined = [...prev, ...newParticles];
        return combined.slice(-120);
      });

      // Cleanup particles after animation finishes
      window.setTimeout(() => {
        setParticles((prev) =>
          prev.filter((p) => !newParticles.some((np) => np.id === p.id))
        );
      }, 2000);
    },
    []
  );

  // Trigger a reaction locally and broadcast to multiplayer peers
  const handleTriggerReaction = useCallback(
    (emoji: string) => {
      spawnBurst(emoji, localScreenPos.x, localScreenPos.y, userProfile.color, 7);
      onBroadcastReaction(emoji);
    },
    [localScreenPos.x, localScreenPos.y, onBroadcastReaction, spawnBurst, userProfile.color]
  );

  // Observe remote collaborators' reactions via Awareness
  useEffect(() => {
    remoteUsers.forEach((peer) => {
      if (!peer.reaction) return;

      const lastSeenId = lastSeenReactionsRef.current.get(peer.clientId);
      if (lastSeenId !== peer.reaction.id) {
        lastSeenReactionsRef.current.set(peer.clientId, peer.reaction.id);

        // Only animate if the reaction was sent within the last 3.5 seconds
        if (Date.now() - peer.reaction.timestamp < 3500 && peer.cursor) {
          // Convert world coordinates to current local screen viewport coordinates
          const screenX = peer.cursor.x * viewport.zoom + viewport.x;
          const screenY = peer.cursor.y * viewport.zoom + viewport.y;

          spawnBurst(
            peer.reaction.emoji,
            screenX,
            screenY,
            peer.user.color || '#6366f1',
            6
          );
        }
      }
    });
  }, [remoteUsers, viewport, spawnBurst]);

  // Keyboard shortcut listener when picker is open (1-8 to react, Esc to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const found = REACTION_EMOJIS.find((item) => item.key === e.key);
      if (found) {
        e.preventDefault();
        handleTriggerReaction(found.emoji);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleTriggerReaction, onClose]);

  // Click outside listener to dismiss picker
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        // Ensure clicking the toolbar button itself doesn't cause immediate re-toggle glitch
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-reaction-toggle]')) return;
        onClose();
      }
    };

    const timer = window.setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('touchstart', handleClickOutside);
    }, 50);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Calculate safe desktop positioning around cursor
  const pickerWidth = 360;
  const pickerHeight = 56;
  const safeLeft = Math.max(16, Math.min(window.innerWidth - pickerWidth - 16, localScreenPos.x - pickerWidth / 2));
  const safeTop = Math.max(70, Math.min(window.innerHeight - pickerHeight - 80, localScreenPos.y - pickerHeight - 20));

  return (
    <>
      {/* Floating Particles Layer */}
      <div
        className="emoji-bursts-container"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 90,
        }}
      >
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="emoji-burst-particle"
            style={
              {
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                '--drift-x': `${particle.driftX}px`,
                '--drift-y': `${particle.driftY}px`,
                '--target-scale': particle.scale,
                '--rot': `${particle.rotation}deg`,
                animationDelay: `${particle.delayMs}ms`,
                filter: particle.color
                  ? `drop-shadow(0 2px 8px ${particle.color}80)`
                  : 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
              } as React.CSSProperties
            }
          >
            {particle.emoji}
          </span>
        ))}
      </div>

      {/* Interactive Reaction Wheel / Picker UI */}
      {isOpen && (
        <div
          ref={pickerRef}
          className="glass-panel animate-pop-in"
          role="dialog"
          aria-label="Cursor Reactions Picker"
          style={{
            position: 'fixed',
            left: isMobile ? '50%' : `${safeLeft}px`,
            top: isMobile ? 'auto' : `${safeTop}px`,
            bottom: isMobile ? 'max(76px, env(safe-area-inset-bottom, 76px))' : 'auto',
            transform: isMobile ? 'translateX(-50%)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '4px' : '6px',
            padding: isMobile ? '6px 10px' : '8px 12px',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1.5px solid ${userProfile.color || 'var(--primary)'}`,
            borderRadius: '28px',
            boxShadow: `0 20px 40px rgba(0, 0, 0, 0.75), 0 0 20px ${userProfile.color || 'var(--primary)'}33`,
            zIndex: 92,
            userSelect: 'none',
          }}
        >
          {/* Reaction Header indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              paddingRight: '6px',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-muted)',
            }}
          >
            <Sparkles size={14} color={userProfile.color || 'var(--primary)'} />
            {!isMobile && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-main)',
                }}
              >
                React
              </span>
            )}
          </div>

          {/* Emoji Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '2px' : '4px',
            }}
          >
            {REACTION_EMOJIS.map((item) => (
              <button
                key={item.emoji}
                className="reaction-emoji-btn"
                onClick={() => handleTriggerReaction(item.emoji)}
                data-tooltip={`${item.label} (${item.key})`}
                aria-label={`Send ${item.label} (${item.key})`}
                style={{
                  width: isMobile ? '36px' : '38px',
                  height: isMobile ? '36px' : '38px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.25) translateY(-3px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.92)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1.25) translateY(-3px)';
                }}
              >
                <span style={{ fontSize: isMobile ? '18px' : '20px', lineHeight: 1 }}>{item.emoji}</span>
                {!isMobile && (
                  <span
                    style={{
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-dim)',
                      lineHeight: 1,
                      marginTop: '2px',
                      opacity: 0.8,
                    }}
                  >
                    {item.key}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Close Button */}
          <button
            className="icon-btn"
            style={{
              width: '28px',
              height: '28px',
              marginLeft: '4px',
              borderRadius: '8px',
              color: 'var(--text-muted)',
            }}
            onClick={onClose}
            aria-label="Close Reaction Picker (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
};
