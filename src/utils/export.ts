import { CanvasElement } from '../types/canvas';
import { getSelectionBoundingBox } from './math';

export function exportToJSON(elements: CanvasElement[], filename = 'sync-canvas-board.json') {
  const data = JSON.stringify(elements, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPNG(
  svgElement: SVGSVGElement | null,
  elements: CanvasElement[],
  filename = 'sync-canvas-board.png'
) {
  if (!svgElement || elements.length === 0) return;

  const bounds = getSelectionBoundingBox(elements);
  if (!bounds) return;

  const padding = 50;
  const exportX = bounds.x - padding;
  const exportY = bounds.y - padding;
  const exportWidth = bounds.width + padding * 2;
  const exportHeight = bounds.height + padding * 2;

  // Clone SVG node for export with fixed viewBox matching content
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  
  // Remove UI adornments like selection boxes and cursor handles from clone
  const uiAdornments = clone.querySelectorAll('.canvas-ui-layer');
  uiAdornments.forEach((node) => node.remove());

  // Set attributes for export
  clone.setAttribute('viewBox', `${exportX} ${exportY} ${exportWidth} ${exportHeight}`);
  clone.setAttribute('width', `${exportWidth}`);
  clone.setAttribute('height', `${exportHeight}`);

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth * 2; // 2x Retina resolution
    canvas.height = exportHeight * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    // Background fill
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    ctx.drawImage(img, 0, 0);

    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
