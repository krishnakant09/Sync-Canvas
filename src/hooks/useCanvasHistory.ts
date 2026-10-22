import { useCallback, useRef, useState } from 'react';
import type { CanvasElement } from '../types/canvas';

const MAX_HISTORY = 50;

export function useCanvasHistory(initialElements: CanvasElement[]) {
  const [elements, setElementsState] = useState<CanvasElement[]>(initialElements);
  
  // History stacks
  const pastRef = useRef<CanvasElement[][]>([]);
  const futureRef = useRef<CanvasElement[][]>([]);

  // Track if we can undo/redo for UI state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const pushState = useCallback((newElements: CanvasElement[]) => {
    setElementsState((prev) => {
      // Push previous state to past stack
      pastRef.current.push(prev);
      if (pastRef.current.length > MAX_HISTORY) {
        pastRef.current.shift();
      }
      // Reset future stack on new actions
      futureRef.current = [];
      updateFlags();
      return newElements;
    });
  }, [updateFlags]);

  // Direct state mutation without recording to history (e.g. while actively dragging/resizing at 60fps)
  const setElementsTransient = useCallback((updater: (prev: CanvasElement[]) => CanvasElement[]) => {
    setElementsState(updater);
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    setElementsState((current) => {
      const previous = pastRef.current.pop();
      if (!previous) return current;

      futureRef.current.push(current);
      updateFlags();
      return previous;
    });
  }, [updateFlags]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    setElementsState((current) => {
      const next = futureRef.current.pop();
      if (!next) return current;

      pastRef.current.push(current);
      updateFlags();
      return next;
    });
  }, [updateFlags]);

  const clearHistory = useCallback((initial: CanvasElement[] = []) => {
    pastRef.current = [];
    futureRef.current = [];
    updateFlags();
    setElementsState(initial);
  }, [updateFlags]);

  return {
    elements,
    pushState,
    setElementsTransient,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
