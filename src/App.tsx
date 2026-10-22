import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CanvasElement,
  DragState,
  Point,
  ResizeHandle,
  ToolType,
  Viewport,
} from './types/canvas';
import {
  computeResize,
  generateId,
  getSelectionBoundingBox,
  isElementInBox,
  isPointInElement,
  normalizeRect,
  screenToWorld,
} from './utils/math';
import { exportToJSON, exportToPNG } from './utils/export';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { CanvasGrid } from './components/CanvasGrid';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { CanvasHeader } from './components/CanvasHeader';
import { CanvasRenderer } from './components/CanvasRenderer';
import { ShortcutsModal } from './components/ShortcutsModal';

// Initial welcoming architectural demo elements
const INITIAL_ELEMENTS: CanvasElement[] = [
  {
    id: 'demo_sticky_1',
    type: 'sticky',
    x: 80,
    y: 80,
    width: 220,
    height: 180,
    fill: '#fef08a',
    stroke: 'transparent',
    strokeWidth: 1,
    opacity: 1,
    zIndex: 1,
    text: '🚀 Welcome to SyncCanvas!\n\nPhase 1 Interactive Canvas Engine is ready.\n\nTry dragging, resizing, creating notes, or pressing "V" for select.',
    fontSize: 15,
    updatedAt: Date.now(),
  },
  {
    id: 'demo_rect_1',
    type: 'rectangle',
    x: 380,
    y: 90,
    width: 200,
    height: 110,
    fill: '#1e293b',
    stroke: '#818cf8',
    strokeWidth: 2,
    opacity: 1,
    zIndex: 2,
    updatedAt: Date.now(),
  },
  {
    id: 'demo_text_1',
    type: 'text',
    x: 405,
    y: 130,
    width: 150,
    height: 30,
    fill: 'transparent',
    stroke: '#ffffff',
    strokeWidth: 1,
    opacity: 1,
    zIndex: 3,
    text: 'Frontend Engine\nSVG + React',
    fontSize: 16,
    textAlign: 'center',
    updatedAt: Date.now(),
  },
  {
    id: 'demo_arrow_1',
    type: 'arrow',
    x: 580,
    y: 145,
    width: 100,
    height: 0,
    fill: 'transparent',
    stroke: '#818cf8',
    strokeWidth: 2,
    opacity: 1,
    zIndex: 4,
    updatedAt: Date.now(),
  },
  {
    id: 'demo_rect_2',
    type: 'rectangle',
    x: 680,
    y: 90,
    width: 220,
    height: 110,
    fill: '#1e293b',
    stroke: '#22d3ee',
    strokeWidth: 2,
    opacity: 1,
    zIndex: 2,
    updatedAt: Date.now(),
  },
  {
    id: 'demo_text_2',
    type: 'text',
    x: 705,
    y: 130,
    width: 170,
    height: 30,
    fill: 'transparent',
    stroke: '#22d3ee',
    strokeWidth: 1,
    opacity: 1,
    zIndex: 3,
    text: 'CRDT Architecture\nYjs State Vectors',
    fontSize: 16,
    textAlign: 'center',
    updatedAt: Date.now(),
  },
  {
    id: 'demo_sticky_2',
    type: 'sticky',
    x: 380,
    y: 250,
    width: 260,
    height: 160,
    fill: '#e9d5ff',
    stroke: 'transparent',
    strokeWidth: 1,
    opacity: 1,
    zIndex: 1,
    text: '💡 Next Up (Phase 2):\n\nWe connect the WebSocket gateway and bind each element to a Yjs Y.Map for real-time multiplayer editing!',
    fontSize: 15,
    updatedAt: Date.now(),
  },
];

export const App: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport State (Pan & Zoom)
  const [viewport, setViewport] = useState<Viewport>({
    x: 100,
    y: 80,
    zoom: 1,
  });

  // Tools & Selection
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['demo_sticky_1']));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Mouse Coordinates in World Space (for bottom status bar)
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 });

  // History & Elements Management
  const {
    elements,
    pushState,
    setElementsTransient,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  } = useCanvasHistory(INITIAL_ELEMENTS);

  // In-flight drag state (create, move, resize, pan, box-select)
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewElement, setPreviewElement] = useState<CanvasElement | null>(null);

  // Active selection bounding box
  const selectedElements = elements.filter((el) => selectedIds.has(el.id));
  const selectionBounds = getSelectionBoundingBox(selectedElements);

  // ==========================================
  // VIEWPORT ZOOM & PAN HELPERS
  // ==========================================
  const handleZoom = useCallback(
    (delta: number, focalPoint?: Point) => {
      setViewport((prev) => {
        const newZoom = Math.min(3, Math.max(0.15, prev.zoom * delta));
        if (focalPoint) {
          // Zoom centered around focal point (e.g. mouse cursor)
          const newX = focalPoint.x - (focalPoint.x - prev.x) * (newZoom / prev.zoom);
          const newY = focalPoint.y - (focalPoint.y - prev.y) * (newZoom / prev.zoom);
          return { x: newX, y: newY, zoom: newZoom };
        }
        // Center of window zoom
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const newX = cx - (cx - prev.x) * (newZoom / prev.zoom);
        const newY = cy - (cy - prev.y) * (newZoom / prev.zoom);
        return { x: newX, y: newY, zoom: newZoom };
      });
    },
    []
  );

  const handleFitContent = useCallback(() => {
    if (elements.length === 0) return;
    const bounds = getSelectionBoundingBox(elements);
    if (!bounds) return;

    const padding = 100;
    const availableW = window.innerWidth - padding * 2;
    const availableH = window.innerHeight - padding * 2;

    const zoom = Math.min(
      1.5,
      Math.max(0.2, Math.min(availableW / bounds.width, availableH / bounds.height))
    );

    const x = window.innerWidth / 2 - (bounds.x + bounds.width / 2) * zoom;
    const y = window.innerHeight / 2 - (bounds.y + bounds.height / 2) * zoom;

    setViewport({ x, y, zoom });
  }, [elements]);

  // ==========================================
  // MOUSE WHEEL (PAN & ZOOM)
  // ==========================================
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch to zoom or Ctrl+Wheel
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        handleZoom(zoomFactor, { x: e.clientX, y: e.clientY });
      } else {
        // Normal wheel pan
        setViewport((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleZoom]);

  // ==========================================
  // ELEMENT ACTIONS & SELECTION
  // ==========================================
  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    const next = elements.map((el) => (el.id === id ? { ...el, ...updates, updatedAt: Date.now() } : el));
    pushState(next);
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const next = elements.filter((el) => !selectedIds.has(el.id));
    pushState(next);
    setSelectedIds(new Set());
  }, [elements, pushState, selectedIds]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const newElements: CanvasElement[] = [];
    const newSelectedIds = new Set<string>();

    elements.forEach((el) => {
      if (selectedIds.has(el.id)) {
        const copy: CanvasElement = {
          ...el,
          id: generateId(el.type),
          x: el.x + 30,
          y: el.y + 30,
          updatedAt: Date.now(),
        };
        newElements.push(copy);
        newSelectedIds.add(copy.id);
      }
    });

    pushState([...elements, ...newElements]);
    setSelectedIds(newSelectedIds);
  }, [elements, pushState, selectedIds]);

  const handleBringToFront = () => {
    if (selectedIds.size === 0) return;
    const maxZ = Math.max(...elements.map((e) => e.zIndex), 0);
    const next = elements.map((el) => (selectedIds.has(el.id) ? { ...el, zIndex: maxZ + 1 } : el));
    pushState(next);
  };

  const handleSendToBack = () => {
    if (selectedIds.size === 0) return;
    const minZ = Math.min(...elements.map((e) => e.zIndex), 1);
    const next = elements.map((el) => (selectedIds.has(el.id) ? { ...el, zIndex: Math.max(0, minZ - 1) } : el));
    pushState(next);
  };

  // ==========================================
  // MOUSE & POINTER EVENTS ON CANVAS
  // ==========================================
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // If middle click or space key is active, initiate Pan
    if (e.button === 1 || isSpacePressed || activeTool === 'hand') {
      setDragState({
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        initialViewport: { ...viewport },
      });
      return;
    }

    if (e.button !== 0) return; // Only process left click

    const worldPoint = screenToWorld(e.clientX, e.clientY, viewport);
    const target = e.target as SVGElement;
    const handleAttr = target.getAttribute('data-handle') as ResizeHandle | null;

    // 1. Click on Resize Handle
    if (handleAttr && selectedElements.length > 0) {
      const initialMap = new Map<string, CanvasElement>();
      selectedElements.forEach((el) => initialMap.set(el.id, { ...el }));

      setDragState({
        type: 'resize',
        startX: worldPoint.x,
        startY: worldPoint.y,
        currentX: worldPoint.x,
        currentY: worldPoint.y,
        resizeHandle: handleAttr,
        initialElements: initialMap,
      });
      return;
    }

    // 2. Eraser Tool: Click to delete element
    if (activeTool === 'eraser') {
      const hit = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));
      if (hit) {
        pushState(elements.filter((el) => el.id !== hit.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(hit.id);
          return next;
        });
      }
      return;
    }

    // 3. Select Tool: Hit test elements
    if (activeTool === 'select') {
      const hit = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));

      if (hit) {
        const nextSelected = new Set(selectedIds);
        if (e.shiftKey) {
          if (nextSelected.has(hit.id)) nextSelected.delete(hit.id);
          else nextSelected.add(hit.id);
        } else {
          if (!nextSelected.has(hit.id)) {
            nextSelected.clear();
            nextSelected.add(hit.id);
          }
        }
        setSelectedIds(nextSelected);

        const initialMap = new Map<string, CanvasElement>();
        elements.forEach((el) => {
          if (nextSelected.has(el.id)) initialMap.set(el.id, { ...el });
        });

        setDragState({
          type: 'move',
          startX: worldPoint.x,
          startY: worldPoint.y,
          currentX: worldPoint.x,
          currentY: worldPoint.y,
          activeElementId: hit.id,
          initialElements: initialMap,
        });
      } else {
        // Clicked empty area -> start marquee selection box
        if (!e.shiftKey) setSelectedIds(new Set());
        setDragState({
          type: 'box-select',
          startX: worldPoint.x,
          startY: worldPoint.y,
          currentX: worldPoint.x,
          currentY: worldPoint.y,
        });
      }
      return;
    }

    // 4. Creation Tools: Rectangle, Circle, Sticky, Text, Arrow, Draw
    const baseElementProps = {
      id: generateId(activeTool),
      x: worldPoint.x,
      y: worldPoint.y,
      width: 1,
      height: 1,
      opacity: 1,
      zIndex: elements.length + 1,
      updatedAt: Date.now(),
    };

    let newEl: CanvasElement;
    if (activeTool === 'rectangle') {
      newEl = {
        ...baseElementProps,
        type: 'rectangle',
        fill: 'transparent',
        stroke: '#818cf8',
        strokeWidth: 2,
      };
    } else if (activeTool === 'circle') {
      newEl = {
        ...baseElementProps,
        type: 'circle',
        fill: 'transparent',
        stroke: '#22d3ee',
        strokeWidth: 2,
      };
    } else if (activeTool === 'sticky') {
      newEl = {
        ...baseElementProps,
        type: 'sticky',
        width: 180,
        height: 160,
        fill: '#fef08a',
        stroke: 'transparent',
        strokeWidth: 1,
        text: '',
        fontSize: 15,
      };
    } else if (activeTool === 'text') {
      newEl = {
        ...baseElementProps,
        type: 'text',
        width: 160,
        height: 40,
        fill: 'transparent',
        stroke: '#ffffff',
        strokeWidth: 1,
        text: 'New Text',
        fontSize: 20,
      };
    } else if (activeTool === 'arrow') {
      newEl = {
        ...baseElementProps,
        type: 'arrow',
        fill: 'transparent',
        stroke: '#818cf8',
        strokeWidth: 2,
      };
    } else {
      // draw
      newEl = {
        ...baseElementProps,
        type: 'draw',
        fill: 'none',
        stroke: '#ffffff',
        strokeWidth: 3,
        points: [{ x: worldPoint.x, y: worldPoint.y }],
      };
    }

    setPreviewElement(newEl);
    setDragState({
      type: 'create',
      startX: worldPoint.x,
      startY: worldPoint.y,
      currentX: worldPoint.x,
      currentY: worldPoint.y,
      activeElementId: newEl.id,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const worldPoint = screenToWorld(e.clientX, e.clientY, viewport);
    setCursorPos(worldPoint);

    if (!dragState) return;

    if (dragState.type === 'pan' && dragState.initialViewport) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      setViewport({
        ...dragState.initialViewport,
        x: dragState.initialViewport.x + dx,
        y: dragState.initialViewport.y + dy,
      });
      return;
    }

    if (dragState.type === 'move' && dragState.initialElements) {
      const deltaX = worldPoint.x - dragState.startX;
      const deltaY = worldPoint.y - dragState.startY;

      setElementsTransient((prev) =>
        prev.map((el) => {
          const init = dragState.initialElements?.get(el.id);
          if (init) {
            return {
              ...el,
              x: init.x + deltaX,
              y: init.y + deltaY,
            };
          }
          return el;
        })
      );
      return;
    }

    if (dragState.type === 'resize' && dragState.initialElements && dragState.resizeHandle) {
      const deltaX = worldPoint.x - dragState.startX;
      const deltaY = worldPoint.y - dragState.startY;

      setElementsTransient((prev) =>
        prev.map((el) => {
          const init = dragState.initialElements?.get(el.id);
          if (init) {
            const resized = computeResize(init, dragState.resizeHandle!, deltaX, deltaY);
            return { ...el, ...resized };
          }
          return el;
        })
      );
      return;
    }

    if (dragState.type === 'box-select') {
      setDragState((prev) => (prev ? { ...prev, currentX: worldPoint.x, currentY: worldPoint.y } : null));

      const box = normalizeRect(
        dragState.startX,
        dragState.startY,
        worldPoint.x - dragState.startX,
        worldPoint.y - dragState.startY
      );

      const newlySelected = new Set<string>();
      elements.forEach((el) => {
        if (isElementInBox(el, box)) newlySelected.add(el.id);
      });
      setSelectedIds(newlySelected);
      return;
    }

    if (dragState.type === 'create' && previewElement) {
      const dx = worldPoint.x - dragState.startX;
      const dy = worldPoint.y - dragState.startY;

      if (previewElement.type === 'draw') {
        setPreviewElement((prev) =>
          prev
            ? {
                ...prev,
                points: [...(prev.points || []), { x: worldPoint.x, y: worldPoint.y }],
              }
            : null
        );
      } else {
        setPreviewElement((prev) =>
          prev
            ? {
                ...prev,
                width: dx,
                height: dy,
              }
            : null
        );
      }
    }
  };

  const handleMouseUp = () => {
    if (!dragState) return;

    if (dragState.type === 'move' || dragState.type === 'resize') {
      // Commit transient movements into history stack
      pushState([...elements]);
    } else if (dragState.type === 'create' && previewElement) {
      let finalElement: CanvasElement = { ...previewElement };

      if (finalElement.type !== 'draw' && finalElement.type !== 'arrow') {
        const norm = normalizeRect(
          finalElement.x,
          finalElement.y,
          finalElement.width,
          finalElement.height
        );
        // Default size if user just single-clicked
        finalElement.x = norm.x;
        finalElement.y = norm.y;
        finalElement.width = Math.max(norm.width, finalElement.type === 'sticky' ? 180 : 120);
        finalElement.height = Math.max(norm.height, finalElement.type === 'sticky' ? 160 : 80);
      }

      pushState([...elements, finalElement]);
      setSelectedIds(new Set([finalElement.id]));
      setPreviewElement(null);
      setActiveTool('select'); // Automatically revert back to select tool

      if (finalElement.type === 'text' || finalElement.type === 'sticky') {
        setEditingId(finalElement.id);
      }
    }

    setDragState(null);
  };

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input/textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Tool Switching
      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('hand');
          break;
        case 'r':
          setActiveTool('rectangle');
          break;
        case 'o':
          setActiveTool('circle');
          break;
        case 's':
          setActiveTool('sticky');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'a':
          setActiveTool('arrow');
          break;
        case 'p':
          setActiveTool('draw');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case '?':
          setIsShortcutsOpen((prev) => !prev);
          break;
        case 'escape':
          setSelectedIds(new Set());
          setEditingId(null);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleDeleteSelected, handleDuplicateSelected, redo, undo]);

  return (
    <div
      className={`canvas-container cursor-${isSpacePressed ? (dragState?.type === 'pan' ? 'hand panning' : 'hand') : activeTool}`}
    >
      {/* Dynamic Background Dot Grid */}
      <CanvasGrid viewport={viewport} />

      {/* Top Navbar Header */}
      <CanvasHeader
        viewport={viewport}
        onZoomIn={() => handleZoom(1.2)}
        onZoomOut={() => handleZoom(0.8)}
        onResetZoom={() => setViewport((prev) => ({ ...prev, zoom: 1 }))}
        onFitContent={handleFitContent}
        onExportPNG={() => exportToPNG(svgRef.current, elements)}
        onExportJSON={() => exportToJSON(elements)}
        onImportJSON={(imported) => {
          if (Array.isArray(imported)) {
            pushState(imported);
            setSelectedIds(new Set());
          }
        }}
        onClearCanvas={() => {
          if (window.confirm('Clear all items from canvas?')) {
            clearHistory([]);
            setSelectedIds(new Set());
          }
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        totalElements={elements.length}
      />

      {/* Selected Element Properties Inspector */}
      <PropertiesPanel
        selectedElements={selectedElements}
        onUpdateElement={handleUpdateElement}
        onDeleteElements={handleDeleteSelected}
        onDuplicateElements={handleDuplicateSelected}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
      />

      {/* Main SVG Interactive Canvas */}
      <div
        style={{ width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <CanvasRenderer
          svgRef={svgRef}
          viewport={viewport}
          elements={elements}
          selectedIds={selectedIds}
          dragState={dragState}
          selectionBounds={selectionBounds}
          editingId={editingId}
          onStartEditing={(id) => setEditingId(id)}
          onUpdateText={(id, text) => handleUpdateElement(id, { text })}
          onFinishEditing={() => setEditingId(null)}
          previewElement={previewElement}
        />
      </div>

      {/* Floating Bottom Toolbar */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Bottom Status Bar */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '24px',
          padding: '4px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          zIndex: 40,
        }}
      >
        <span>
          X: {Math.round(cursorPos.x)}, Y: {Math.round(cursorPos.y)}
        </span>
        <span style={{ color: 'var(--border-subtle)' }}>|</span>
        <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
        <span style={{ color: 'var(--border-subtle)' }}>|</span>
        <span style={{ color: 'var(--text-muted)' }}>Press ? for shortcuts</span>
      </div>

      {/* Shortcuts Guide Modal */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
};

export default App;
