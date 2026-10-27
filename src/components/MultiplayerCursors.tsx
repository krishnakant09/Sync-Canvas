import React from 'react';
import type { UserPresence, Viewport } from '../types/canvas';

interface MultiplayerCursorsProps {
  remoteUsers: UserPresence[];
  viewport: Viewport;
}

export const MultiplayerCursors: React.FC<MultiplayerCursorsProps> = ({ remoteUsers, viewport }) => {
  return (
    <g className="multiplayer-cursors-layer" pointerEvents="none">
      {remoteUsers.map((peer) => {
        if (!peer.cursor) return null;
        const { x, y } = peer.cursor;
        const color = peer.user.color || '#6366f1';
        const name = peer.user.name || 'Anonymous';

        // Size adjustment according to zoom so cursor remains readable
        const scale = 1 / Math.max(0.4, Math.min(2, viewport.zoom));

        return (
          <g
            key={peer.clientId}
            transform={`translate(${x}, ${y}) scale(${scale})`}
            style={{
              transition: 'transform 0.08s ease-out',
            }}
          >
            {/* Custom SVG Figma-Style Cursor Arrow */}
            <path
              d="M 0 0 L 0 16 L 4.5 12.5 L 8 18 L 10.5 16.5 L 7 11 L 12 11 Z"
              fill={color}
              stroke="#ffffff"
              strokeWidth="1.2"
              filter="drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))"
            />

            {/* Floating Name Badge */}
            <g transform="translate(14, 18)">
              <rect
                x="0"
                y="0"
                rx="4"
                ry="4"
                width={Math.max(40, name.length * 7.5 + 16)}
                height="20"
                fill={color}
                filter="drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35))"
              />
              <text
                x="8"
                y="14"
                fill="#ffffff"
                fontSize="11"
                fontWeight="600"
                fontFamily="var(--font-sans)"
              >
                {name}
              </text>
            </g>

            {/* Real-Time Emoji Reaction Badge */}
            {peer.reaction && ((peer.lastActive ?? peer.reaction.timestamp) - peer.reaction.timestamp < 3500) && (
              <g transform="translate(14, -8)">
                <rect
                  x="-2"
                  y="-8"
                  rx="10"
                  ry="10"
                  width="26"
                  height="22"
                  fill="rgba(15, 23, 42, 0.95)"
                  stroke={color}
                  strokeWidth="1.2"
                  filter="drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))"
                />
                <text
                  x="11"
                  y="8"
                  textAnchor="middle"
                  fontSize="13"
                  dominantBaseline="central"
                >
                  {peer.reaction.emoji}
                </text>
              </g>
            )}

            {/* Real-Time Figma-Style Cursor Chat Speech Bubble */}
            {peer.cursorChat && peer.cursorChat.trim().length > 0 && (
              <g transform="translate(14, 44)">
                {/* Connecting Speech Tail pointing up to cursor badge */}
                <path
                  d="M 6 0 L 10 -5 L 14 0 Z"
                  fill="rgba(15, 23, 42, 0.96)"
                  stroke={color}
                  strokeWidth="1"
                />

                <foreignObject
                  x="0"
                  y="0"
                  width="280"
                  height="160"
                  style={{ overflow: 'visible', pointerEvents: 'none' }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      background: 'rgba(15, 23, 42, 0.96)',
                      backdropFilter: 'blur(12px)',
                      border: `1.5px solid ${color}`,
                      borderRadius: '16px',
                      borderTopLeftRadius: '3px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-sans)',
                      boxShadow: `0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px ${color}40`,
                      maxWidth: '260px',
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        flexShrink: 0,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    />
                    <span>{peer.cursorChat}</span>
                  </div>
                </foreignObject>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
