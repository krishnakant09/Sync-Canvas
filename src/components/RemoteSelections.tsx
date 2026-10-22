import React from 'react';
import type { CanvasElement, UserPresence, Viewport } from '../types/canvas';
import { normalizeRect } from '../utils/math';

interface RemoteSelectionsProps {
  elements: CanvasElement[];
  remoteUsers: UserPresence[];
  viewport: Viewport;
}

export const RemoteSelections: React.FC<RemoteSelectionsProps> = ({
  elements,
  remoteUsers,
  viewport,
}) => {
  const elementsMap = new Map<string, CanvasElement>();
  elements.forEach((el) => elementsMap.set(el.id, el));

  return (
    <g className="remote-selections-layer" pointerEvents="none">
      {remoteUsers.map((peer) => {
        if (!peer.selectedElementIds || peer.selectedElementIds.length === 0) return null;
        const color = peer.user.color || '#6366f1';
        const name = peer.user.name || 'Anonymous';

        return peer.selectedElementIds.map((id) => {
          const el = elementsMap.get(id);
          if (!el) return null;

          const norm = normalizeRect(el.x, el.y, el.width, el.height);
          const padding = 4 / viewport.zoom;
          const x = norm.x - padding;
          const y = norm.y - padding;
          const width = norm.width + padding * 2;
          const height = norm.height + padding * 2;

          return (
            <g key={`${peer.clientId}_${id}`}>
              {/* Colored Dashed Halo */}
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="none"
                stroke={color}
                strokeWidth={2 / viewport.zoom}
                strokeDasharray={`${5 / viewport.zoom},${5 / viewport.zoom}`}
                rx={6 / viewport.zoom}
                ry={6 / viewport.zoom}
                opacity={0.85}
              />

              {/* Collaborator Badge above selected item */}
              <g transform={`translate(${x}, ${y - 20 / viewport.zoom})`}>
                <rect
                  x="0"
                  y="0"
                  rx={3 / viewport.zoom}
                  ry={3 / viewport.zoom}
                  width={Math.max(30, name.length * 6.5 + 12) / viewport.zoom}
                  height={16 / viewport.zoom}
                  fill={color}
                />
                <text
                  x={6 / viewport.zoom}
                  y={11 / viewport.zoom}
                  fill="#ffffff"
                  fontSize={10 / viewport.zoom}
                  fontWeight="600"
                  fontFamily="var(--font-sans)"
                >
                  {name}
                </text>
              </g>
            </g>
          );
        });
      })}
    </g>
  );
};
