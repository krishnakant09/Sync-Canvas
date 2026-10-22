import React from 'react';
import {
  CanvasElement,
  DragState,
  Point,
  ResizeHandle,
  SelectionBounds,
  Viewport,
} from '../types/canvas';
import { normalizeRect } from '../utils/math';

interface CanvasRendererProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  viewport: Viewport;
  elements: CanvasElement[];
  selectedIds: Set<string>;
  dragState: DragState | null;
  selectionBounds: SelectionBounds | null;
  editingId: string | null;
  onStartEditing: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onFinishEditing: () => void;
  previewElement: CanvasElement | null;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  svgRef,
  viewport,
  elements,
  selectedIds,
  dragState,
  selectionBounds,
  editingId,
  onStartEditing,
  onUpdateText,
  onFinishEditing,
  previewElement,
}) => {
  // Render smooth SVG path for freehand drawing
  const renderDrawPath = (points: Point[] = []): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      path += ` Q ${p0.x} ${p0.y}, ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;
    return path;
  };

  const renderElement = (el: CanvasElement, isPreview = false) => {
    const isSelected = selectedIds.has(el.id);
    const isEditing = editingId === el.id;
    const { x, y, width, height } = normalizeRect(el.x, el.y, el.width, el.height);

    switch (el.type) {
      case 'rectangle':
        return (
          <rect
            key={el.id}
            x={x}
            y={y}
            width={Math.max(1, width)}
            height={Math.max(1, height)}
            fill={el.fill}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            strokeDasharray={el.strokeStyle === 'dashed' ? '6,6' : undefined}
            rx={8}
            ry={8}
            opacity={el.opacity}
            style={{ pointerEvents: isPreview ? 'none' : 'auto' }}
          />
        );

      case 'circle':
        return (
          <ellipse
            key={el.id}
            cx={x + width / 2}
            cy={y + height / 2}
            rx={Math.max(1, width / 2)}
            ry={Math.max(1, height / 2)}
            fill={el.fill}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            strokeDasharray={el.strokeStyle === 'dashed' ? '6,6' : undefined}
            opacity={el.opacity}
            style={{ pointerEvents: isPreview ? 'none' : 'auto' }}
          />
        );

      case 'sticky':
        return (
          <g key={el.id} opacity={el.opacity} style={{ pointerEvents: isPreview ? 'none' : 'auto' }}>
            {/* Note Shadow and Body */}
            <rect
              x={x}
              y={y}
              width={Math.max(10, width)}
              height={Math.max(10, height)}
              fill={el.fill}
              rx={6}
              ry={6}
              stroke="rgba(0,0,0,0.12)"
              strokeWidth={1}
              filter="drop-shadow(0 6px 12px rgba(0,0,0,0.25))"
            />
            {/* Editable or Display Text */}
            <foreignObject
              x={x}
              y={y}
              width={Math.max(10, width)}
              height={Math.max(10, height)}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{ width: '100%', height: '100%', padding: '10px' }}
                onDoubleClick={() => onStartEditing(el.id)}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    className="sticky-textarea"
                    defaultValue={el.text || ''}
                    style={{ fontSize: `${el.fontSize || 16}px`, textAlign: el.textAlign || 'left' }}
                    onChange={(e) => onUpdateText(el.id, e.target.value)}
                    onBlur={onFinishEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') onFinishEditing();
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: `${el.fontSize || 16}px`,
                      fontWeight: 600,
                      color: el.textColor || '#1e293b',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      textAlign: el.textAlign || 'left',
                      whiteSpace: 'pre-wrap',
                      height: '100%',
                    }}
                  >
                    {el.text || <span style={{ opacity: 0.4 }}>Double click to edit note...</span>}
                  </div>
                )}
              </div>
            </foreignObject>
          </g>
        );

      case 'text':
        return (
          <g key={el.id} opacity={el.opacity} style={{ pointerEvents: isPreview ? 'none' : 'auto' }}>
            <foreignObject
              x={x}
              y={y}
              width={Math.max(60, width)}
              height={Math.max(30, height)}
              style={{ overflow: 'visible' }}
            >
              <div
                style={{ width: '100%', height: '100%' }}
                onDoubleClick={() => onStartEditing(el.id)}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    defaultValue={el.text || ''}
                    style={{
                      width: '100%',
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid var(--primary)',
                      outline: 'none',
                      color: el.stroke || '#ffffff',
                      fontSize: `${el.fontSize || 20}px`,
                      fontWeight: 600,
                      textAlign: el.textAlign || 'left',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                    onChange={(e) => onUpdateText(el.id, e.target.value)}
                    onBlur={onFinishEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') onFinishEditing();
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: `${el.fontSize || 20}px`,
                      fontWeight: 600,
                      color: el.stroke || '#ffffff',
                      textAlign: el.textAlign || 'left',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {el.text || <span style={{ opacity: 0.4 }}>Type here...</span>}
                  </div>
                )}
              </div>
            </foreignObject>
          </g>
        );

      case 'arrow': {
        const x1 = el.x;
        const y1 = el.y;
        const x2 = el.x + el.width;
        const y2 = el.y + el.height;
        return (
          <g key={el.id} opacity={el.opacity} style={{ pointerEvents: isPreview ? 'none' : 'auto' }}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth}
              markerEnd={`url(#arrowhead-${el.stroke.replace('#', '')})`}
            />
          </g>
        );
      }

      case 'draw':
        return (
          <path
            key={el.id}
            d={renderDrawPath(el.points)}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={el.opacity}
            style={{ pointerEvents: isPreview ? 'none' : 'auto' }}
          />
        );

      default:
        return null;
    }
  };

  // Resize handle positions for the selection box
  const renderResizeHandles = (b: SelectionBounds) => {
    const handleSize = 8 / viewport.zoom;
    const half = handleSize / 2;

    const handles: Array<{ handle: ResizeHandle; cx: number; cy: number; cursor: string }> = [
      { handle: 'nw', cx: b.x, cy: b.y, cursor: 'nwse-resize' },
      { handle: 'n', cx: b.x + b.width / 2, cy: b.y, cursor: 'ns-resize' },
      { handle: 'ne', cx: b.x + b.width, cy: b.y, cursor: 'nesw-resize' },
      { handle: 'e', cx: b.x + b.width, cy: b.y + b.height / 2, cursor: 'ew-resize' },
      { handle: 'se', cx: b.x + b.width, cy: b.y + b.height, cursor: 'nwse-resize' },
      { handle: 's', cx: b.x + b.width / 2, cy: b.y + b.height, cursor: 'ns-resize' },
      { handle: 'sw', cx: b.x, cy: b.y + b.height, cursor: 'nesw-resize' },
      { handle: 'w', cx: b.x, cy: b.y + b.height / 2, cursor: 'ew-resize' },
    ];

    return (
      <g className="canvas-ui-layer">
        {/* Selection Bounding Box */}
        <rect
          x={b.x}
          y={b.y}
          width={b.width}
          height={b.height}
          fill="rgba(99, 102, 241, 0.05)"
          stroke="var(--primary)"
          strokeWidth={1.5 / viewport.zoom}
          strokeDasharray={`${4 / viewport.zoom},${4 / viewport.zoom}`}
          pointerEvents="none"
        />

        {/* Handles */}
        {handles.map((h) => (
          <rect
            key={h.handle}
            data-handle={h.handle}
            x={h.cx - half}
            y={h.cy - half}
            width={handleSize}
            height={handleSize}
            fill="#ffffff"
            stroke="var(--primary)"
            strokeWidth={1.5 / viewport.zoom}
            rx={1 / viewport.zoom}
            ry={1 / viewport.zoom}
            style={{ cursor: h.cursor }}
          />
        ))}
      </g>
    );
  };

  return (
    <svg ref={svgRef} className="canvas-svg">
      <defs>
        {/* Common Arrowhead markers */}
        {['ffffff', '818cf8', '22d3ee', '34d399', 'fbbf24', 'fb7185', '94a3b8'].map((colorHex) => (
          <marker
            key={colorHex}
            id={`arrowhead-${colorHex}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill={`#${colorHex}`} />
          </marker>
        ))}
      </defs>

      {/* World-space elements transformed by Viewport Pan & Zoom */}
      <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
        {/* Render persistent canvas elements */}
        {elements.map((el) => renderElement(el))}

        {/* In-flight creation preview */}
        {previewElement && renderElement(previewElement, true)}

        {/* Selection bounding box & handles */}
        {selectionBounds && selectedIds.size > 0 && renderResizeHandles(selectionBounds)}

        {/* Box marquee selection */}
        {dragState?.type === 'box-select' && (
          <rect
            className="canvas-ui-layer"
            x={Math.min(dragState.startX, dragState.currentX)}
            y={Math.min(dragState.startY, dragState.currentY)}
            width={Math.abs(dragState.currentX - dragState.startX)}
            height={Math.abs(dragState.currentY - dragState.startY)}
            fill="rgba(99, 102, 241, 0.15)"
            stroke="var(--primary)"
            strokeWidth={1 / viewport.zoom}
            strokeDasharray={`${3 / viewport.zoom},${3 / viewport.zoom}`}
            pointerEvents="none"
          />
        )}
      </g>
    </svg>
  );
};
