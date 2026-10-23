/**
 * Image processing utilities for SyncCanvas
 * Handles client-side scaling, aspect ratio calculation, and optimized Data URL generation
 */

export interface ProcessedImage {
  src: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

/**
 * Reads a File or Blob, scales it down to maxDimension (if needed) using HTML5 Canvas,
 * and returns a compressed, high-quality Data URL along with scaled dimensions.
 */
export async function processImageFile(
  file: File | Blob,
  maxDimension = 1200
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data'));
      img.onload = () => {
        const naturalWidth = img.naturalWidth || img.width || 300;
        const naturalHeight = img.naturalHeight || img.height || 200;

        let targetWidth = naturalWidth;
        let targetHeight = naturalHeight;

        // Scale down if larger than max dimension
        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
            targetWidth = maxDimension;
          } else {
            targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
            targetHeight = maxDimension;
          }
        }

        // Draw onto canvas for compression and clean bounds
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            src: dataUrl,
            width: targetWidth,
            height: targetHeight,
            naturalWidth,
            naturalHeight,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Retain PNG transparency if file is PNG/WEBP, otherwise JPEG 0.88
        const isTransparent = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';
        const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(mimeType, 0.88);

        resolve({
          src: compressedDataUrl,
          width: targetWidth,
          height: targetHeight,
          naturalWidth,
          naturalHeight,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
