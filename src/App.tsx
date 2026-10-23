import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  CanvasElement,
  DragState,
  Point,
  ResizeHandle,
  ToolType,
  UserProfile,
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
import { getStoredUserProfile } from './utils/user';
import { Sliders, Upload } from 'lucide-react';
import { processImageFile } from './utils/image';
import { useYjsRoom } from './hooks/useYjsRoom';
import { CanvasGrid } from './components/CanvasGrid';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { CanvasHeader } from './components/CanvasHeader';
import { CanvasRenderer } from './components/CanvasRenderer';
import { ShortcutsModal } from './components/ShortcutsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { CursorChat } from './components/CursorChat';

// Initial welcoming architectural demo elements for new rooms
const INITIAL_ELEMENTS: CanvasElement[] = [
  {
    id: 'demo_sticky_1',
    type: 'sticky',
    x: 80,
    y: 80,
    width: 250,
    height: 190,
    fill: '#fef08a',
    stroke: 'transparent',
    strokeWidth: 1,
    opacity: 1,
    zIndex: 1,
    text: '🚀 Welcome to SyncCanvas!\n\nPhase 3 Multi-User Presence & Offline Resilience is active.\n\nOpen a second tab to see live colored cursors and selection halos in action!',
    fontSize: 15,
    updatedAt: Date.now(),
  },
  {
    id: 'demo_rect_1',
    type: 'rectangle',
    x: 400,
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
    x: 425,
    y: 130,
    width: 150,
    height: 30,
    fill: 'transparent',
    stroke: '#ffffff',
    strokeWidth: 1,
    opacity: 1,
    zIndex: 3,
    text: 'Presence Layer\nYjs Awareness',
    fontSize: 16,
    textAlign: 'center',
    updatedAt: Date.now(),
  },
  {
    id: 'demo_arrow_1',
    type: 'arrow',
    x: 600,
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
    x: 700,
    y: 90,
    width: 240,
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
    x: 720,
    y: 130,
    width: 200,
    height: 30,
    fill: 'transparent',
    stroke: '#22d3ee',
    strokeWidth: 1,
    opacity: 1,
    zIndex: 3,
    text: 'Offline Persistence\ny-indexeddb',
    fontSize: 16,
    textAlign: 'center',
    updatedAt: Date.now(),
  },
  {
    id: 'demo_sticky_2',
    type: 'sticky',
    x: 400,
    y: 260,
    width: 280,
    height: 170,
    fill: '#e9d5ff',
    stroke: 'transparent',
    strokeWidth: 1,
    opacity: 1,
    zIndex: 1,
    text: '💡 Offline-First Reliability:\n\nIf your network drops, changes save to IndexedDB instantly. When reconnected, updates merge seamlessly without overwriting collaborators!',
    fontSize: 15,
    updatedAt: Date.now(),
  },
];

export const App: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Local user profile (customizable display name & color)
  const [userProfile, setUserProfile] = useState<UserProfile>(getStoredUserProfile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Room name derived from URL query parameter (e.g. ?room=team-canvas)
  const [roomName, setRoomName] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'main-canvas';
  });

  // Real-Time Yjs Synchronization & Awareness Hook
  const {
    elements,
    status: connectionStatus,
    isIndexedDBReady,
    remoteUsers,
    updateCursor,
    updateSelectedElementIds,
    updateUserProfile,
    updateCursorChat,
    setElement,
    setElementsBatch,
    deleteElementsBatch,
    clearRoom,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useYjsRoom({
    roomName,
    initialElements: INITIAL_ELEMENTS,
    userProfile,
  });

  // Local transient overrides for high-performance 60 FPS dragging before committing to Yjs
  const [transientOverrides, setTransientOverrides] = useState<Map<string, Partial<CanvasElement>>>(new Map());

  // Viewport State (Pan & Zoom)
  const [viewport, setViewport] = useState<Viewport>({
    x: 100,
    y: 80,
    zoom: 1,
  });

  // Tools & Selection
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPropertiesDrawerOpen, setIsPropertiesDrawerOpen] = useState(false);
  const [isCursorChatActive, setIsCursorChatActive] = useState(false);
  const isCursorChatActiveRef = useRef(isCursorChatActive);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIdRef = useRef(editingId);

  useEffect(() => {
    isCursorChatActiveRef.current = isCursorChatActive;
  }, [isCursorChatActive]);

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  const [mouseScreenPos, setMouseScreenPos] = useState<Point>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
  });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Viewport Ref for stable access inside event listeners without re-subscription
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Mouse Coordinates in World Space (for status bar & paste positioning)
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 });
  const mouseWorldPosRef = useRef<Point>({ x: 0, y: 0 });

  // Image Drag-and-Drop & File Upload
  const [isDragOver, setIsDragOver] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // In-flight drag state (create, move, resize, pan, box-select)
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewElement, setPreviewElement] = useState<CanvasElement | null>(null);

  // Mobile device detection
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Multi-touch pinch-to-zoom and pan state
  const pinchStateRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialViewport: Viewport;
    initialCenter: Point;
  } | null>(null);

  // Mobile double tap detection
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({
    time: 0,
    x: 0,
    y: 0,
  });

  // Broadcast selected elements to awareness whenever selection changes
  useEffect(() => {
    updateSelectedElementIds(Array.from(selectedIds));
  }, [selectedIds, updateSelectedElementIds]);

  // Render elements with local transient dragging overrides applied
  const renderedElements = elements.map((el) => {
    const override = transientOverrides.get(el.id);
    return override ? { ...el, ...override } : el;
  });

  // Active selection bounding box
  const selectedElements = renderedElements.filter((el) => selectedIds.has(el.id));
  const selectionBounds = getSelectionBoundingBox(selectedElements);

  // Switch Room handler
  const handleRoomChange = (newRoom: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    window.history.pushState({}, '', url.toString());
    setRoomName(newRoom);
    setSelectedIds(new Set());
  };

  // Profile update handler
  const handleSaveProfile = (updated: UserProfile) => {
    setUserProfile(updated);
    updateUserProfile(updated);
  };

  // ==========================================
  // VIEWPORT ZOOM & PAN HELPERS
  // ==========================================
  const handleZoom = useCallback((delta: number, focalPoint?: Point) => {
    setViewport((prev) => {
      const newZoom = Math.min(3, Math.max(0.15, prev.zoom * delta));
      if (focalPoint) {
        const newX = focalPoint.x - (focalPoint.x - prev.x) * (newZoom / prev.zoom);
        const newY = focalPoint.y - (focalPoint.y - prev.y) * (newZoom / prev.zoom);
        return { x: newX, y: newY, zoom: newZoom };
      }
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const newX = cx - (cx - prev.x) * (newZoom / prev.zoom);
      const newY = cy - (cy - prev.y) * (newZoom / prev.zoom);
      return { x: newX, y: newY, zoom: newZoom };
    });
  }, []);

  const handleFitContent = useCallback(() => {
    if (renderedElements.length === 0) return;
    const bounds = getSelectionBoundingBox(renderedElements);
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
  }, [renderedElements]);

  // ==========================================
  // MOUSE WHEEL (PAN & ZOOM)
  // ==========================================
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        handleZoom(zoomFactor, { x: e.clientX, y: e.clientY });
      } else {
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
    const existing = elements.find((el) => el.id === id);
    if (existing) {
      setElement({ ...existing, ...updates });
    }
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    deleteElementsBatch(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [deleteElementsBatch, selectedIds]);

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

    setElementsBatch(newElements);
    setSelectedIds(newSelectedIds);
  }, [elements, selectedIds, setElementsBatch]);

  const handleBringToFront = () => {
    if (selectedIds.size === 0) return;
    const maxZ = Math.max(...elements.map((e) => e.zIndex), 0);
    const toUpdate = elements
      .filter((el) => selectedIds.has(el.id))
      .map((el) => ({ ...el, zIndex: maxZ + 1 }));
    setElementsBatch(toUpdate);
  };

  const handleSendToBack = () => {
    if (selectedIds.size === 0) return;
    const minZ = Math.min(...elements.map((e) => e.zIndex), 1);
    const toUpdate = elements
      .filter((el) => selectedIds.has(el.id))
      .map((el) => ({ ...el, zIndex: Math.max(0, minZ - 1) }));
    setElementsBatch(toUpdate);
  };

  // ==========================================
  // IMAGE UPLOAD, PASTE & DRAG-AND-DROP
  // ==========================================
  const insertImageFile = useCallback(
    async (file: File | Blob, targetPoint?: Point) => {
      try {
        const { src, naturalWidth, naturalHeight } = await processImageFile(file);

        // Limit initial display dimensions to 480px while preserving original aspect ratio
        const maxDisplaySize = 480;
        const scale = Math.min(1, maxDisplaySize / Math.max(naturalWidth, naturalHeight));
        const width = Math.round(naturalWidth * scale);
        const height = Math.round(naturalHeight * scale);

        let posX: number;
        let posY: number;
        if (targetPoint) {
          posX = Math.round(targetPoint.x - width / 2);
          posY = Math.round(targetPoint.y - height / 2);
        } else {
          const currentViewport = viewportRef.current;
          const cx = (window.innerWidth / 2 - currentViewport.x) / currentViewport.zoom;
          const cy = (window.innerHeight / 2 - currentViewport.y) / currentViewport.zoom;
          posX = Math.round(cx - width / 2);
          posY = Math.round(cy - height / 2);
        }

        const maxZ = elements.reduce((acc, el) => Math.max(acc, el.zIndex), 0);
        const newEl: CanvasElement = {
          id: generateId('image'),
          type: 'image',
          x: posX,
          y: posY,
          width,
          height,
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          opacity: 1,
          zIndex: maxZ + 1,
          src,
          naturalWidth,
          naturalHeight,
          updatedAt: Date.now(),
        };

        setElement(newEl);
        setSelectedIds(new Set([newEl.id]));
        setActiveTool('select');
      } catch (err) {
        console.error('Failed to process image file:', err);
      }
    },
    [elements, setElement]
  );

  const handleImageFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      insertImageFile(file);
    }
    e.target.value = '';
  };

  // Global Clipboard Paste (Ctrl+V / Cmd+V) for image data
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const hasCursor = mouseWorldPosRef.current.x !== 0 || mouseWorldPosRef.current.y !== 0;
            const target = hasCursor ? { ...mouseWorldPosRef.current } : undefined;
            insertImageFile(file, target);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [insertImageFile]);

  // Drag and Drop Handlers for canvas container
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const dropWorldPos = screenToWorld(e.clientX, e.clientY, viewportRef.current);
      let count = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const offset = count * 24;
          insertImageFile(file, { x: dropWorldPos.x + offset, y: dropWorldPos.y + offset });
          count++;
        }
      }
    }
  };

  // ==========================================
  // UNIFIED POINTER & TOUCH GESTURE HANDLERS
  // ==========================================
  const handlePointerDown = (
    clientX: number,
    clientY: number,
    target: EventTarget | null,
    isShift = false,
    button = 0
  ) => {
    if (button === 1 || isSpacePressed || activeTool === 'hand') {
      setDragState({
        type: 'pan',
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
        initialViewport: { ...viewport },
      });
      return;
    }

    if (button !== 0) return;

    const worldPoint = screenToWorld(clientX, clientY, viewport);
    const svgElem = target as SVGElement | null;
    const handleAttr = svgElem?.getAttribute ? (svgElem.getAttribute('data-handle') as ResizeHandle | null) : null;

    // 1. Click / Tap on Resize Handle
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

    // 2. Eraser Tool: Click / Tap to delete element
    if (activeTool === 'eraser') {
      const hit = [...renderedElements].reverse().find((el) => isPointInElement(worldPoint, el));
      if (hit) {
        deleteElementsBatch([hit.id]);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(hit.id);
          return next;
        });
      }
      return;
    }

    // Image Tool: Click canvas to open file picker
    if (activeTool === 'image') {
      imageFileInputRef.current?.click();
      setActiveTool('select');
      return;
    }

    // 3. Select Tool: Hit test elements
    if (activeTool === 'select') {
      const hit = [...renderedElements].reverse().find((el) => isPointInElement(worldPoint, el));

      if (hit) {
        const nextSelected = new Set(selectedIds);
        if (isShift) {
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
        renderedElements.forEach((el) => {
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
        if (!isShift) setSelectedIds(new Set());
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

    // 4. Creation Tools
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

  const handlePointerMove = (clientX: number, clientY: number) => {
    setMouseScreenPos({ x: clientX, y: clientY });
    const worldPoint = screenToWorld(clientX, clientY, viewport);
    mouseWorldPosRef.current = worldPoint;
    setCursorPos(worldPoint);
    updateCursor(worldPoint);

    if (!dragState) return;

    if (dragState.type === 'pan' && dragState.initialViewport) {
      const dx = clientX - dragState.startX;
      const dy = clientY - dragState.startY;
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

      const newOverrides = new Map<string, Partial<CanvasElement>>();
      dragState.initialElements.forEach((init, id) => {
        newOverrides.set(id, {
          x: init.x + deltaX,
          y: init.y + deltaY,
        });
      });
      setTransientOverrides(newOverrides);
      return;
    }

    if (dragState.type === 'resize' && dragState.initialElements && dragState.resizeHandle) {
      const deltaX = worldPoint.x - dragState.startX;
      const deltaY = worldPoint.y - dragState.startY;

      const newOverrides = new Map<string, Partial<CanvasElement>>();
      dragState.initialElements.forEach((init, id) => {
        const resized = computeResize(init, dragState.resizeHandle!, deltaX, deltaY);
        newOverrides.set(id, resized);
      });
      setTransientOverrides(newOverrides);
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
      renderedElements.forEach((el) => {
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

  const handlePointerUp = () => {
    if (!dragState) return;

    if (dragState.type === 'move' || dragState.type === 'resize') {
      if (transientOverrides.size > 0) {
        const elementsToUpdate: CanvasElement[] = [];
        transientOverrides.forEach((override, id) => {
          const original = elements.find((el) => el.id === id);
          if (original) {
            elementsToUpdate.push({ ...original, ...override });
          }
        });
        setElementsBatch(elementsToUpdate);
        setTransientOverrides(new Map());
      }
    } else if (dragState.type === 'create' && previewElement) {
      let finalElement: CanvasElement = { ...previewElement };

      if (finalElement.type !== 'draw' && finalElement.type !== 'arrow') {
        const norm = normalizeRect(
          finalElement.x,
          finalElement.y,
          finalElement.width,
          finalElement.height
        );
        finalElement.x = norm.x;
        finalElement.y = norm.y;
        finalElement.width = Math.max(norm.width, finalElement.type === 'sticky' ? 180 : 120);
        finalElement.height = Math.max(norm.height, finalElement.type === 'sticky' ? 160 : 80);
      }

      setElement(finalElement);
      setSelectedIds(new Set([finalElement.id]));
      setPreviewElement(null);
      setActiveTool('select');

      if (finalElement.type === 'text' || finalElement.type === 'sticky') {
        setEditingId(finalElement.id);
      }
    }

    setDragState(null);
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerDown(e.clientX, e.clientY, e.target, e.shiftKey, e.button);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    updateCursor(null);
  };

  const handleMouseUp = () => {
    handlePointerUp();
  };

  // Mobile Touch Handlers (with multi-touch pinch-to-zoom & two-finger pan)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // 2-finger multi-touch gesture: pinch-to-zoom & two-finger pan
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const center = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      pinchStateRef.current = {
        initialDist: dist,
        initialZoom: viewport.zoom,
        initialViewport: { ...viewport },
        initialCenter: center,
      };
      setDragState(null);
      setPreviewElement(null);
      return;
    }

    if (e.touches.length === 1) {
      pinchStateRef.current = null;
      const t = e.touches[0];
      const now = Date.now();
      const dist = Math.hypot(t.clientX - lastTapRef.current.x, t.clientY - lastTapRef.current.y);
      const isDoubleTap = now - lastTapRef.current.time < 350 && dist < 35;
      lastTapRef.current = { time: now, x: t.clientX, y: t.clientY };

      if (isDoubleTap) {
        const worldPoint = screenToWorld(t.clientX, t.clientY, viewport);
        const hit = [...renderedElements].reverse().find((el) => isPointInElement(worldPoint, el));
        if (hit && (hit.type === 'text' || hit.type === 'sticky')) {
          setEditingId(hit.id);
          return;
        }
      }

      handlePointerDown(t.clientX, t.clientY, e.target, false, 0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStateRef.current) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const currentCenter = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };

      const scale = currentDist / pinchStateRef.current.initialDist;
      const newZoom = Math.min(3.0, Math.max(0.15, pinchStateRef.current.initialZoom * scale));

      // Calculate focal world point
      const focalWorldX =
        (pinchStateRef.current.initialCenter.x - pinchStateRef.current.initialViewport.x) /
        pinchStateRef.current.initialZoom;
      const focalWorldY =
        (pinchStateRef.current.initialCenter.y - pinchStateRef.current.initialViewport.y) /
        pinchStateRef.current.initialZoom;

      setViewport({
        zoom: newZoom,
        x: currentCenter.x - focalWorldX * newZoom,
        y: currentCenter.y - focalWorldY * newZoom,
      });
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      handlePointerMove(t.clientX, t.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      pinchStateRef.current = null;
      handlePointerUp();
      updateCursor(null);
    } else if (e.touches.length === 1) {
      pinchStateRef.current = null;
    }
  };

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      // Figma-Style Live Cursor Chat Trigger
      if (e.key === '/' && !editingIdRef.current) {
        e.preventDefault();
        setIsCursorChatActive(true);
        return;
      }

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
        case 'i':
          imageFileInputRef.current?.click();
          break;
        case '?':
          setIsShortcutsOpen((prev) => !prev);
          break;
        case 'escape':
          if (isCursorChatActiveRef.current) {
            setIsCursorChatActive(false);
            updateCursorChat(null);
            return;
          }
          setIsPropertiesDrawerOpen(false);
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
  }, [handleDeleteSelected, handleDuplicateSelected, redo, undo, updateCursorChat]);

  return (
    <div
      className={`canvas-container cursor-${isSpacePressed ? (dragState?.type === 'pan' ? 'hand panning' : 'hand') : activeTool}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for Image upload tool */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFileInput}
      />

      {/* Visual cue when dragging image files over canvas */}
      {isDragOver && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            inset: isMobile ? '12px' : '20px',
            borderRadius: '16px',
            border: '2px dashed var(--primary)',
            background: 'rgba(99, 102, 241, 0.12)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            zIndex: 90,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              boxShadow: '0 0 24px var(--primary-glow)',
            }}
          >
            <Upload size={32} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)' }}>
            Drop image to add to canvas
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            PNG, JPG, WebP, GIF, or SVG automatically compressed & synced
          </div>
        </div>
      )}

      {/* Dynamic Background Dot Grid */}
      <CanvasGrid viewport={viewport} />

      {/* Top Navbar Header with Real-Time Multiplayer Room & Status */}
      <CanvasHeader
        viewport={viewport}
        connectionStatus={connectionStatus}
        roomName={roomName}
        userProfile={userProfile}
        remoteUsers={remoteUsers}
        isIndexedDBReady={isIndexedDBReady}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onChangeRoom={handleRoomChange}
        onZoomIn={() => handleZoom(1.2)}
        onZoomOut={() => handleZoom(0.8)}
        onResetZoom={() => setViewport((prev) => ({ ...prev, zoom: 1 }))}
        onFitContent={handleFitContent}
        onExportPNG={() => exportToPNG(svgRef.current, renderedElements)}
        onExportJSON={() => exportToJSON(renderedElements)}
        onImportJSON={(imported) => {
          if (Array.isArray(imported)) {
            setElementsBatch(imported);
            setSelectedIds(new Set());
          }
        }}
        onClearCanvas={() => {
          if (window.confirm('Clear all items from the shared room?')) {
            clearRoom();
            setSelectedIds(new Set());
          }
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        totalElements={renderedElements.length}
        isMobile={isMobile}
        isPropertiesOpen={isPropertiesDrawerOpen}
        onToggleProperties={() => setIsPropertiesDrawerOpen((prev) => !prev)}
        hasSelection={selectedElements.length > 0}
      />

      {/* Dedicated Floating Style & Properties Drawer Button (when closed) */}
      {!isPropertiesDrawerOpen && (
        <button
          onClick={() => setIsPropertiesDrawerOpen(true)}
          className="glass-panel animate-fade-in"
          aria-label="Open Style & Properties Drawer"
          data-tooltip="Open Style & Properties Drawer"
          style={{
            position: 'absolute',
            top: isMobile ? '56px' : '68px',
            left: isMobile ? '12px' : '20px',
            padding: isMobile ? '6px 12px' : '7px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: isMobile ? '12px' : '13px',
            fontWeight: 600,
            color: selectedElements.length > 0 ? 'var(--text-main)' : 'var(--text-muted)',
            zIndex: 40,
            borderRadius: '24px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            background: 'rgba(18, 22, 34, 0.88)',
            backdropFilter: 'blur(16px)',
            border: selectedElements.length > 0 ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Sliders size={isMobile ? 14 : 16} color={selectedElements.length > 0 ? 'var(--primary)' : 'currentColor'} />
          <span>Style</span>
          {selectedElements.length > 0 && (
            <span
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {selectedElements.length}
            </span>
          )}
        </button>
      )}

      {/* Selected Element Properties Inspector (controlled drawer) */}
      <PropertiesPanel
        isOpen={isPropertiesDrawerOpen}
        onClose={() => setIsPropertiesDrawerOpen(false)}
        selectedElements={selectedElements}
        onUpdateElement={handleUpdateElement}
        onDeleteElements={handleDeleteSelected}
        onDuplicateElements={handleDuplicateSelected}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
        isMobile={isMobile}
      />

      {/* Main SVG Interactive Canvas with Unified Pointer & Touch Handlers */}
      <div
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <CanvasRenderer
          svgRef={svgRef}
          viewport={viewport}
          elements={renderedElements}
          selectedIds={selectedIds}
          dragState={dragState}
          selectionBounds={selectionBounds}
          editingId={editingId}
          onStartEditing={(id) => setEditingId(id)}
          onUpdateText={(id, text) => handleUpdateElement(id, { text })}
          onFinishEditing={() => setEditingId(null)}
          previewElement={previewElement}
          remoteUsers={remoteUsers}
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
        isPropertiesOpen={isPropertiesDrawerOpen}
        onToggleProperties={() => setIsPropertiesDrawerOpen((prev) => !prev)}
        hasSelection={selectedElements.length > 0}
        isCursorChatActive={isCursorChatActive}
        onToggleCursorChat={() => setIsCursorChatActive((prev) => !prev)}
        onUploadImage={() => imageFileInputRef.current?.click()}
      />

      {/* Figma-Style Interactive Cursor Chat Component */}
      <CursorChat
        isActive={isCursorChatActive}
        onClose={() => setIsCursorChatActive(false)}
        userProfile={userProfile}
        mouseScreenPos={mouseScreenPos}
        onBroadcastChat={updateCursorChat}
        isMobile={isMobile}
      />

      {/* Bottom Status Bar */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: isMobile ? '70px' : '16px',
          right: isMobile ? '12px' : '24px',
          padding: isMobile ? '3px 8px' : '4px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '6px' : '12px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          zIndex: 35,
          pointerEvents: 'none',
        }}
      >
        {!isMobile && (
          <>
            <span>
              X: {Math.round(cursorPos.x)}, Y: {Math.round(cursorPos.y)}
            </span>
            <span style={{ color: 'var(--border-subtle)' }}>|</span>
            <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
            <span style={{ color: 'var(--border-subtle)' }}>|</span>
          </>
        )}
        <span style={{ color: connectionStatus === 'connected' ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
          ● {isMobile ? connectionStatus.toUpperCase() : `${connectionStatus.toUpperCase()} (${remoteUsers.length} peers)`}
        </span>
      </div>

      {/* Shortcuts Guide Modal */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* User Profile Customization Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={userProfile}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
};

export default App;
