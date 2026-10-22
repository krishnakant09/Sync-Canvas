import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

import { saveSnapshot, loadSnapshot, listSnapshots } from './storage';
import { initRedis, publishRoomUpdate, isRedisConnected, getInstanceId } from './redis';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 1234;
const CLIENT_DIST_DIR = path.join(process.cwd(), 'dist');

const messageSync = 0;
const messageAwareness = 1;

interface ClientConnection {
  ws: WebSocket;
  isAlive: boolean;
  controlledIds: Set<number>;
}

class RoomDoc {
  name: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, ClientConnection>;
  private snapshotTimeout: NodeJS.Timeout | null = null;
  lastCompacted: number = Date.now();

  constructor(name: string) {
    this.name = name;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.conns = new Map();

    // 1. Broadcast doc updates to locally connected clients
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      this.conns.forEach((clientConn, ws) => {
        if (ws !== origin && ws.readyState === WebSocket.OPEN) {
          send(ws, message);
        }
      });

      // 2. Publish to Redis cluster if the update originated locally (not from Redis)
      if (origin !== 'redis') {
        publishRoomUpdate(this.name, update);
      }

      // 3. Debounced Snapshot Compaction (compresses CRDT log after 10 seconds of idle)
      this.scheduleSnapshot();
    });

    // Broadcast awareness updates (cursors, presence) to clients
    this.awareness.on(
      'update',
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: any) => {
        const changedClients = added.concat(updated, removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
        );
        const message = encoding.toUint8Array(encoder);

        this.conns.forEach((clientConn, ws) => {
          if (ws !== origin && ws.readyState === WebSocket.OPEN) {
            send(ws, message);
          }
        });
      }
    );
  }

  scheduleSnapshot() {
    if (this.snapshotTimeout) {
      clearTimeout(this.snapshotTimeout);
    }
    this.snapshotTimeout = setTimeout(() => {
      this.compactAndSave();
    }, 10000);
  }

  async compactAndSave() {
    try {
      const meta = await saveSnapshot(this.name, this.doc);
      this.lastCompacted = Date.now();
      console.log(`[SyncCanvas Compaction] 📦 Compacted room "${this.name}" snapshot (${meta.sizeBytes} bytes)`);
    } catch (err: any) {
      console.error(`[SyncCanvas Compaction] Failed to save snapshot for "${this.name}":`, err.message);
    }
  }
}

// Global registry of active rooms
const rooms = new Map<string, RoomDoc>();

async function getOrCreateRoom(roomName: string): Promise<RoomDoc> {
  let room = rooms.get(roomName);
  if (!room) {
    room = new RoomDoc(roomName);
    rooms.set(roomName, room);

    // Load persisted state snapshot from disk if exists
    const restored = await loadSnapshot(roomName, room.doc);
    if (restored) {
      console.log(`[SyncCanvas Storage] 📥 Restored snapshot for room "${roomName}" from disk.`);
    } else {
      console.log(`[SyncCanvas Server] Initialized fresh room: "${roomName}"`);
    }
  }
  return room;
}

function send(ws: WebSocket, message: Uint8Array) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(message, (err) => {
      if (err) console.error('[SyncCanvas Server] Send error:', err.message);
    });
  } catch (e: any) {
    console.error('[SyncCanvas Server] Send exception:', e.message);
  }
}

// Initialize Redis Horizontal Pub/Sub
initRedis((roomName, update) => {
  const room = rooms.get(roomName);
  if (room) {
    // Apply update received from another server node in the cluster
    Y.applyUpdate(room.doc, update, 'redis');
  }
});

/**
 * Set essential HTTP security headers recommended for production web applications.
 * Addresses:
 * - Content-Security-Policy (CSP) to block unauthorized scripts, clickjacking, and injection.
 * - X-Frame-Options to DENY clickjacking.
 * - X-Content-Type-Options to prevent MIME-type sniffing.
 * - Strict-Transport-Security (HSTS) to enforce HTTPS connections.
 * - Referrer-Policy and X-XSS-Protection for defense-in-depth.
 */
function applySecurityHeaders(res: http.ServerResponse): void {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' ws: wss: http: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
}

/**
 * Configure restricted CORS headers to prevent cross-origin data leakage.
 * Addresses [MEDIUM] Any website can read your responses (open CORS).
 * Instead of wildcards (*), only authorized application domains and trusted local origins are permitted.
 */
function applyCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): void {
  const origin = req.headers.origin;

  const allowedOrigins = new Set<string>([
    'https://sync-canvas.antideploy.app',
    'http://localhost:5173',
    'http://localhost:1234',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:1234',
  ]);

  if (process.env.APP_URL) {
    try { allowedOrigins.add(new URL(process.env.APP_URL).origin); } catch {}
  }
  if (process.env.SITE_URL) {
    try { allowedOrigins.add(new URL(process.env.SITE_URL).origin); } catch {}
  }
  if (process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN.split(',').forEach((o) => {
      const trimmed = o.trim();
      if (trimmed) allowedOrigins.add(trimmed);
    });
  }

  const isAllowed =
    origin &&
    (allowedOrigins.has(origin) ||
      /^https:\/\/sync-canvas[a-z0-9-]*\.antideploy\.app$/.test(origin));

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// HTTP Request Handler (REST API, Telemetry, and Production Static Assets)
const server = http.createServer(async (req, res) => {
  // Apply hardened HTTP security and restricted CORS headers
  applySecurityHeaders(res);
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // Health Endpoint
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        uptime: process.uptime(),
        instanceId: getInstanceId(),
        redisConnected: isRedisConnected(),
      })
    );
    return;
  }

  // Telemetry & Metrics Endpoint
  if (url.pathname === '/stats' || url.pathname === '/api/stats') {
    const totalConnections = Array.from(rooms.values()).reduce(
      (acc, room) => acc + room.conns.size,
      0
    );
    const roomList = Array.from(rooms.entries()).map(([name, r]) => ({
      name,
      clients: r.conns.size,
      lastCompacted: r.lastCompacted,
      elementsCount: r.doc.getMap('elements').size,
    }));

    const memoryUsage = process.memoryUsage();
    const snapshots = await listSnapshots();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          service: 'SyncCanvas Real-Time Gateway Cluster',
          instanceId: getInstanceId(),
          status: 'healthy',
          uptime: process.uptime(),
          totalRooms: rooms.size,
          totalConnections,
          redisClusterActive: isRedisConnected(),
          memory: {
            rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
            heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          },
          rooms: roomList,
          persistedSnapshots: snapshots,
        },
        null,
        2
      )
    );
    return;
  }

  // Snapshot list endpoint
  if (url.pathname === '/api/snapshots') {
    const snapshots = await listSnapshots();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(snapshots, null, 2));
    return;
  }

  // Manual Compaction Trigger
  if (req.method === 'POST' && url.pathname.startsWith('/api/rooms/') && url.pathname.endsWith('/compact')) {
    const parts = url.pathname.split('/');
    const roomName = decodeURIComponent(parts[3] || '');
    const room = rooms.get(roomName);

    if (room) {
      await room.compactAndSave();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `Room "${roomName}" compacted and saved.` }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Room "${roomName}" not found.` }));
    }
    return;
  }

  // Production Static File Serving (when built frontend is in dist/)
  if (fs.existsSync(CLIENT_DIST_DIR)) {
    let filePath = path.join(CLIENT_DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(CLIENT_DIST_DIR, 'index.html'); // SPA fallback
    }

    const ext = path.extname(filePath);
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.json': 'application/json',
    };

    try {
      const data = await fs.promises.readFile(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
      return;
    } catch {
      // Fall through to 404
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SyncCanvas Real-Time WebSocket Gateway & Compaction Engine is running.');
});

// WebSocket Server attached to the HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  let roomName = url.searchParams.get('room');
  if (!roomName) {
    const pathname = url.pathname.slice(1);
    roomName = pathname ? decodeURIComponent(pathname) : 'default-room';
  }

  const room = await getOrCreateRoom(roomName);
  const clientConn: ClientConnection = {
    ws,
    isAlive: true,
    controlledIds: new Set(),
  };
  room.conns.set(ws, clientConn);

  console.log(`[SyncCanvas Server] Client connected to room "${roomName}". Room clients: ${room.conns.size}`);

  ws.on('pong', () => {
    clientConn.isAlive = true;
  });

  // Step 1: Send SyncStep1 to newly connected client
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, room.doc);
  send(ws, encoding.toUint8Array(encoder));

  // Step 2: Send current awareness states (collaborators, cursors)
  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys()))
    );
    send(ws, encoding.toUint8Array(awarenessEncoder));
  }

  // Handle incoming messages
  ws.on('message', (data: ArrayBuffer | Buffer) => {
    try {
      const uint8 = new Uint8Array(data as any);
      const decoder = decoding.createDecoder(uint8);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync: {
          const syncEncoder = encoding.createEncoder();
          encoding.writeVarUint(syncEncoder, messageSync);
          syncProtocol.readSyncMessage(decoder, syncEncoder, room.doc, ws);
          if (encoding.length(syncEncoder) > 1) {
            send(ws, encoding.toUint8Array(syncEncoder));
          }
          break;
        }
        case messageAwareness: {
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);
          break;
        }
      }
    } catch (err: any) {
      console.error('[SyncCanvas Server] Message processing error:', err.message);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    room.conns.delete(ws);
    const statesToRemove = Array.from(clientConn.controlledIds);
    if (statesToRemove.length > 0) {
      awarenessProtocol.removeAwarenessStates(room.awareness, statesToRemove, null);
    }
    console.log(`[SyncCanvas Server] Client left room "${roomName}". Active clients: ${room.conns.size}`);

    // If room is now empty, immediately compact and save state to disk
    if (room.conns.size === 0) {
      console.log(`[SyncCanvas Server] Room "${roomName}" is idle. Compacting snapshot to disk...`);
      room.compactAndSave();
    }
  });

  ws.on('error', (err) => {
    console.error(`[SyncCanvas Server] Socket error in room "${roomName}":`, err.message);
  });
});

// Periodic ping to drop dead sockets every 30s
const pingInterval = setInterval(() => {
  rooms.forEach((room) => {
    room.conns.forEach((clientConn, ws) => {
      if (!clientConn.isAlive) {
        console.log(`[SyncCanvas Server] Pruning inactive socket in room "${room.name}"`);
        ws.terminate();
        return;
      }
      clientConn.isAlive = false;
      ws.ping();
    });
  });
}, 30000);

server.on('close', () => {
  clearInterval(pingInterval);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`⚡ SyncCanvas Gateway & Compaction Engine (Port ${PORT})`);
  console.log(`🆔 Instance ID: ${getInstanceId()}`);
  console.log(`📊 Metrics API: http://localhost:${PORT}/stats`);
  console.log(`💾 Snapshots API: http://localhost:${PORT}/api/snapshots`);
  console.log(`🔌 WebSocket Endpoint: ws://localhost:${PORT}/[room-name]`);
  console.log(`=======================================================`);
});
