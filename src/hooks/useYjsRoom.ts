import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { CanvasElement } from '../types/canvas';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface UseYjsRoomOptions {
  roomName: string;
  serverUrl?: string;
  initialElements?: CanvasElement[];
}

export function useYjsRoom({
  roomName,
  serverUrl = 'ws://localhost:1234',
  initialElements = [],
}: UseYjsRoomOptions) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [synced, setSynced] = useState(false);

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yMapRef = useRef<Y.Map<CanvasElement> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const doc = new Y.Doc();
    docRef.current = doc;

    const provider = new WebsocketProvider(serverUrl, roomName, doc, {
      connect: true,
      params: { room: roomName },
    });
    providerRef.current = provider;

    const yElements = doc.getMap<CanvasElement>('elements');
    yMapRef.current = yElements;

    // Distributed UndoManager scoped to elements map
    const undoManager = new Y.UndoManager(yElements, {
      trackedOrigins: new Set([null, provider]),
    });
    undoManagerRef.current = undoManager;

    const updateUndoRedoFlags = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };

    undoManager.on('stack-item-added', updateUndoRedoFlags);
    undoManager.on('stack-item-popped', updateUndoRedoFlags);

    // Connection lifecycle
    provider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setStatus(event.status);
    });

    // When synchronized with the server
    provider.on('sync', (isSynced: boolean) => {
      setSynced(isSynced);

      if (isSynced) {
        // If the shared room is completely empty, populate with starter architectural elements
        if (yElements.size === 0 && initialElements.length > 0) {
          doc.transact(() => {
            initialElements.forEach((el) => {
              yElements.set(el.id, el);
            });
          });
        }
      }
    });

    // Observer for real-time changes from local edits or remote peers
    const handleMapChange = () => {
      const items = Array.from(yElements.values()).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      setElements(items);
      updateUndoRedoFlags();
    };

    yElements.observe(handleMapChange);

    // Initial load
    handleMapChange();

    return () => {
      yElements.unobserve(handleMapChange);
      undoManager.destroy();
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      yMapRef.current = null;
      undoManagerRef.current = null;
    };
  }, [roomName, serverUrl]);

  // Set or update a single element in the CRDT map
  const setElement = useCallback((element: CanvasElement) => {
    const yMap = yMapRef.current;
    if (!yMap) return;
    yMap.set(element.id, { ...element, updatedAt: Date.now() });
  }, []);

  // Batch transactional update (e.g., dragging multiple items)
  const setElementsBatch = useCallback((elementsToUpdate: CanvasElement[]) => {
    const doc = docRef.current;
    const yMap = yMapRef.current;
    if (!doc || !yMap) return;

    doc.transact(() => {
      elementsToUpdate.forEach((el) => {
        yMap.set(el.id, { ...el, updatedAt: Date.now() });
      });
    });
  }, []);

  // Delete element
  const deleteElement = useCallback((id: string) => {
    const yMap = yMapRef.current;
    if (!yMap) return;
    yMap.delete(id);
  }, []);

  // Batch delete
  const deleteElementsBatch = useCallback((ids: string[]) => {
    const doc = docRef.current;
    const yMap = yMapRef.current;
    if (!doc || !yMap) return;

    doc.transact(() => {
      ids.forEach((id) => yMap.delete(id));
    });
  }, []);

  // Clear entire room
  const clearRoom = useCallback(() => {
    const doc = docRef.current;
    const yMap = yMapRef.current;
    if (!doc || !yMap) return;

    doc.transact(() => {
      yMap.clear();
    });
  }, []);

  // Undo / Redo
  const undo = useCallback(() => {
    undoManagerRef.current?.undo();
  }, []);

  const redo = useCallback(() => {
    undoManagerRef.current?.redo();
  }, []);

  return {
    elements,
    status,
    synced,
    setElement,
    setElementsBatch,
    deleteElement,
    deleteElementsBatch,
    clearRoom,
    undo,
    redo,
    canUndo,
    canRedo,
    provider: providerRef.current,
  };
}
