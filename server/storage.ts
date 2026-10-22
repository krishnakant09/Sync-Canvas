import fs from 'fs';
import path from 'path';
import * as Y from 'yjs';

const STORAGE_DIR = process.env.SNAPSHOT_DIR || path.join(process.cwd(), 'server', 'storage', 'snapshots');

// Ensure snapshot directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export interface SnapshotMeta {
  roomName: string;
  sizeBytes: number;
  lastSaved: number;
  filepath: string;
}

function getSnapshotPath(roomName: string): string {
  const safeName = encodeURIComponent(roomName).replace(/[*?:;"<>|]/g, '_');
  return path.join(STORAGE_DIR, `${safeName}.bin`);
}

/**
 * Persists compacted Yjs document state as a binary update buffer.
 */
export async function saveSnapshot(roomName: string, doc: Y.Doc): Promise<SnapshotMeta> {
  const filepath = getSnapshotPath(roomName);
  const stateUpdate = Y.encodeStateAsUpdate(doc);

  await fs.promises.writeFile(filepath, Buffer.from(stateUpdate));
  const stats = await fs.promises.stat(filepath);

  return {
    roomName,
    sizeBytes: stats.size,
    lastSaved: stats.mtimeMs,
    filepath,
  };
}

/**
 * Loads and restores a compacted Yjs document state from disk.
 */
export async function loadSnapshot(roomName: string, doc: Y.Doc): Promise<boolean> {
  const filepath = getSnapshotPath(roomName);

  if (!fs.existsSync(filepath)) {
    return false;
  }

  try {
    const data = await fs.promises.readFile(filepath);
    if (data.length > 0) {
      Y.applyUpdate(doc, new Uint8Array(data), 'snapshot-loader');
      return true;
    }
  } catch (err: any) {
    console.error(`[SyncCanvas Storage] Failed to load snapshot for "${roomName}":`, err.message);
  }

  return false;
}

/**
 * Returns list of all persisted snapshots and their sizes.
 */
export async function listSnapshots(): Promise<SnapshotMeta[]> {
  try {
    const files = await fs.promises.readdir(STORAGE_DIR);
    const results: SnapshotMeta[] = [];

    for (const file of files) {
      if (file.endsWith('.bin')) {
        const filepath = path.join(STORAGE_DIR, file);
        const stats = await fs.promises.stat(filepath);
        const roomName = decodeURIComponent(file.replace('.bin', ''));
        results.push({
          roomName,
          sizeBytes: stats.size,
          lastSaved: stats.mtimeMs,
          filepath,
        });
      }
    }
    return results;
  } catch (err) {
    return [];
  }
}
