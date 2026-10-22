import React from 'react';
import type { Viewport } from '../types/canvas';

interface CanvasGridProps {
  viewport: Viewport;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ viewport }) => {
  const baseGridSize = 30;
  const scaledGridSize = baseGridSize * viewport.zoom;
  
  // Calculate grid pattern offsets based on pan
  const offsetX = (viewport.x % scaledGridSize + scaledGridSize) % scaledGridSize;
  const offsetY = (viewport.y % scaledGridSize + scaledGridSize) % scaledGridSize;

  return (
    <svg className="canvas-grid-layer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <pattern
          id="dot-grid"
          width={scaledGridSize}
          height={scaledGridSize}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <circle
            cx={scaledGridSize / 2}
            cy={scaledGridSize / 2}
            r={Math.max(1, 1.2 * Math.min(1.5, viewport.zoom))}
            fill="rgba(255, 255, 255, 0.12)"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-grid)" />
    </svg>
  );
};
