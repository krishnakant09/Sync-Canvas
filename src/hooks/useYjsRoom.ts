import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { CanvasElement, Point, ReactionEvent, UserPresence, UserProfile } from '../types/canvas';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function getDefaultServerUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:1234';
  if (window.location.port === '5173') {
    return `ws://${window.location.hostname}:1234`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

interface UseYjsRoomOptions {
  roomName: string;
  serverUrl?: string;
  initialElements?: CanvasElement[];
  userProfile: UserProfile;
}

export function useYjsRoom({
  roomName,
  serverUrl = getDefaultServerUrl(),
  initialElements = [],
  userProfile,
}: UseYjsRoomOptions) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [synced, setSynced] = useState(false);
  const [isIndexedDBReady, setIsIndexedDBReady] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<UserPresence[]>([]);

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const idbRef = useRef<IndexeddbPersistence | null>(null);
  const yMapRef = useRef<Y.Map<CanvasElement> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const doc = new Y.Doc();
    docRef.current = doc;

    // 1. Offline Persistence via IndexedDB
    const idb = new IndexeddbPersistence(`sync-canvas-${roomName}`, doc);
    idbRef.current = idb;

    idb.on('synced', () => {
      setIsIndexedDBReady(true);
    });

    // 2. Real-time WebSocket Gateway
    const provider = new WebsocketProvider(serverUrl, roomName, doc, {
      connect: true,
      params: { room: roomName },
    });
    providerRef.current = provider;

    // 3. Set Local User Awareness (Presence)
    provider.awareness.setLocalStateField('user', userProfile);

    // 4. CRDT Elements Map
    const yElements = doc.getMap<CanvasElement>('elements');
    yMapRef.current = yElements;

    // 5. Distributed UndoManager
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

    // 6. Connection Status
    provider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setStatus(event.status);
    });

    // 7. Yjs Document Sync Handshake
    provider.on('sync', (isSynced: boolean) => {
      setSynced(isSynced);

      if (isSynced) {
        if (yElements.size === 0 && initialElements.length > 0) {
          doc.transact(() => {
            initialElements.forEach((el) => {
              yElements.set(el.id, el);
            });
          });
        }
      }
    });

    // 8. Elements Map Observer
    const handleMapChange = () => {
      const items = Array.from(yElements.values()).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      setElements(items);
      updateUndoRedoFlags();
    };

    yElements.observe(handleMapChange);
    handleMapChange();

    // 9. Awareness / Presence Observer
    const handleAwarenessChange = () => {
      const awareness = provider.awareness;
      const states = awareness.getStates();
      const peers: UserPresence[] = [];

      states.forEach((state: any, clientId: number) => {
        if (clientId !== doc.clientID && state.user) {
          peers.push({
            clientId,
            user: state.user,
            cursor: state.cursor || null,
            selectedElementIds: state.selectedElementIds || [],
            lastActive: Date.now(),
            cursorChat: state.cursorChat || null,
            reaction: state.reaction || null,
          });
        }
      });

      setRemoteUsers(peers);
    };

    provider.awareness.on('change', handleAwarenessChange);

    return () => {
      yElements.unobserve(handleMapChange);
      provider.awareness.off('change', handleAwarenessChange);
      undoManager.destroy();
      provider.destroy();
      idb.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      idbRef.current = null;
      yMapRef.current = null;
      undoManagerRef.current = null;
    };
  }, [roomName, serverUrl]);

  // Update local cursor in awareness
  const updateCursor = useCallback((point: Point | null) => {
    const provider = providerRef.current;
    if (!provider) return;
    provider.awareness.setLocalStateField('cursor', point);
  }, []);

  // Update selected elements in awareness
  const updateSelectedElementIds = useCallback((selectedIds: string[]) => {
    const provider = providerRef.current;
    if (!provider) return;
    provider.awareness.setLocalStateField('selectedElementIds', selectedIds);
  }, []);

  // Update local user profile in awareness
  const updateUserProfile = useCallback((profile: UserProfile) => {
    const provider = providerRef.current;
    if (!provider) return;
    provider.awareness.setLocalStateField('user', profile);
  }, []);

  // Update cursor chat message in awareness
  const updateCursorChat = useCallback((message: string | null) => {
    const provider = providerRef.current;
    if (!provider) return;
    provider.awareness.setLocalStateField('cursorChat', message);
  }, []);

  // Broadcast reaction event in awareness
  const broadcastReaction = useCallback((emoji: string) => {
    const provider = providerRef.current;
    if (!provider) return;
    const reaction: ReactionEvent = {
      emoji,
      id: `${docRef.current?.clientID || 0}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    provider.awareness.setLocalStateField('reaction', reaction);
  }, []);

  // Set or update a single element in the CRDT map
  const setElement = useCallback((element: CanvasElement) => {
    const yMap = yMapRef.current;
    if (!yMap) return;
    yMap.set(element.id, { ...element, updatedAt: Date.now() });
  }, []);

  // Batch transactional update
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
    isIndexedDBReady,
    remoteUsers,
    updateCursor,
    updateSelectedElementIds,
    updateUserProfile,
    updateCursorChat,
    broadcastReaction,
    setElement,
    setElementsBatch,
    deleteElement,
    deleteElementsBatch,
    clearRoom,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
