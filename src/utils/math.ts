import type { CanvasElement, Point, ResizeHandle, SelectionBounds, Viewport } from '../types/canvas';

export function screenToWorld(screenX: number, screenY: number, viewport: Viewport): Point {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  };
}

export function worldToScreen(worldX: number, worldY: number, viewport: Viewport): Point {
  return {
    x: worldX * viewport.zoom + viewport.x,
    y: worldY * viewport.zoom + viewport.y,
  };
}

export function generateId(prefix = 'elem'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function normalizeRect(x: number, y: number, width: number, height: number): SelectionBounds {
  let nx = x;
  let ny = y;
  let nw = width;
  let nh = height;

  if (nw < 0) {
    nx = x + nw;
    nw = Math.abs(nw);
  }
  if (nh < 0) {
    ny = y + nh;
    nh = Math.abs(nh);
  }

  return { x: nx, y: ny, width: nw, height: nh };
}

export function isPointInElement(point: Point, element: CanvasElement): boolean {
  if (element.type === 'draw') {
    if (!element.points || element.points.length === 0) return false;
    // Bounding box hit test with small padding
    const bounds = normalizeRect(element.x, element.y, element.width, element.height);
    const padding = Math.max(10, element.strokeWidth);
    return (
      point.x >= bounds.x - padding &&
      point.x <= bounds.x + bounds.width + padding &&
      point.y >= bounds.y - padding &&
      point.y <= bounds.y + bounds.height + padding
    );
  }

  const { x, y, width, height } = normalizeRect(
    element.x,
    element.y,
    element.width,
    element.height
  );

  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

export function isElementInBox(element: CanvasElement, box: SelectionBounds): boolean {
  const elemRect = normalizeRect(element.x, element.y, element.width, element.height);
  const selRect = normalizeRect(box.x, box.y, box.width, box.height);

  return (
    elemRect.x < selRect.x + selRect.width &&
    elemRect.x + elemRect.width > selRect.x &&
    elemRect.y < selRect.y + selRect.height &&
    elemRect.y + elemRect.height > selRect.y
  );
}

export function getSelectionBoundingBox(elements: CanvasElement[]): SelectionBounds | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const rect = normalizeRect(el.x, el.y, el.width, el.height);
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function computeResize(
  initial: CanvasElement,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number
): { x: number; y: number; width: number; height: number } {
  let { x, y, width, height } = initial;
  const minSize = 20;
  const isImage = initial.type === 'image';
  const aspect = initial.width / Math.max(1, initial.height);

  switch (handle) {
    case 'se': {
      if (isImage) {
        width = Math.max(minSize, initial.width + deltaX);
        height = Math.max(minSize, Math.round(width / aspect));
      } else {
        width = Math.max(minSize, initial.width + deltaX);
        height = Math.max(minSize, initial.height + deltaY);
      }
      break;
    }
    case 'e': {
      width = Math.max(minSize, initial.width + deltaX);
      break;
    }
    case 's': {
      height = Math.max(minSize, initial.height + deltaY);
      break;
    }
    case 'nw': {
      if (isImage) {
        const newWidth = Math.max(minSize, initial.width - deltaX);
        const newHeight = Math.max(minSize, Math.round(newWidth / aspect));
        x = initial.x + (initial.width - newWidth);
        y = initial.y + (initial.height - newHeight);
        width = newWidth;
        height = newHeight;
      } else {
        const newWidth = initial.width - deltaX;
        const newHeight = initial.height - deltaY;
        if (newWidth >= minSize) {
          width = newWidth;
          x = initial.x + deltaX;
        }
        if (newHeight >= minSize) {
          height = newHeight;
          y = initial.y + deltaY;
        }
      }
      break;
    }
    case 'w': {
      const newWidth = initial.width - deltaX;
      if (newWidth >= minSize) {
        width = newWidth;
        x = initial.x + deltaX;
      }
      break;
    }
    case 'n': {
      const newHeight = initial.height - deltaY;
      if (newHeight >= minSize) {
        height = newHeight;
        y = initial.y + deltaY;
      }
      break;
    }
    case 'ne': {
      if (isImage) {
        const newWidth = Math.max(minSize, initial.width + deltaX);
        const newHeight = Math.max(minSize, Math.round(newWidth / aspect));
        y = initial.y + (initial.height - newHeight);
        width = newWidth;
        height = newHeight;
      } else {
        const newHeight = initial.height - deltaY;
        width = Math.max(minSize, initial.width + deltaX);
        if (newHeight >= minSize) {
          height = newHeight;
          y = initial.y + deltaY;
        }
      }
      break;
    }
    case 'sw': {
      if (isImage) {
        const newWidth = Math.max(minSize, initial.width - deltaX);
        const newHeight = Math.max(minSize, Math.round(newWidth / aspect));
        x = initial.x + (initial.width - newWidth);
        width = newWidth;
        height = newHeight;
      } else {
        const newWidth = initial.width - deltaX;
        height = Math.max(minSize, initial.height + deltaY);
        if (newWidth >= minSize) {
          width = newWidth;
          x = initial.x + deltaX;
        }
      }
      break;
    }
  }

  return { x, y, width, height };
}
