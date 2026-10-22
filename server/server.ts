import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 1234;

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

  constructor(name: string) {
    this.name = name;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.conns = new Map();

    // Broadcast local doc updates to all connected clients in this room
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
    });

    // Broadcast awareness updates (cursors, user details) to clients
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
}

// Global registry of active rooms
const rooms = new Map<string, RoomDoc>();

function getOrCreateRoom(roomName: string): RoomDoc {
  let room = rooms.get(roomName);
  if (!room) {
    room = new RoomDoc(roomName);
    rooms.set(roomName, room);
    console.log(`[SyncCanvas Server] Created room: "${roomName}"`);
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

// HTTP Server for Health Checks and Stats
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/stats') {
    const totalConnections = Array.from(rooms.values()).reduce(
      (acc, room) => acc + room.conns.size,
      0
    );
    const roomList = Array.from(rooms.entries()).map(([name, r]) => ({
      name,
      clients: r.conns.size,
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          status: 'healthy',
          service: 'SyncCanvas Real-Time Gateway',
          uptime: process.uptime(),
          totalRooms: rooms.size,
          totalConnections,
          rooms: roomList,
        },
        null,
        2
      )
    );
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SyncCanvas Real-Time WebSocket Server is running.');
});

// WebSocket Server attached to the HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  // Parse room from URL path or query string (e.g. ws://localhost:1234/my-canvas or ?room=my-canvas)
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  let roomName = url.searchParams.get('room');
  if (!roomName) {
    const pathname = url.pathname.slice(1);
    roomName = pathname ? decodeURIComponent(pathname) : 'default-room';
  }

  const room = getOrCreateRoom(roomName);
  const clientConn: ClientConnection = {
    ws,
    isAlive: true,
    controlledIds: new Set(),
  };
  room.conns.set(ws, clientConn);

  console.log(`[SyncCanvas Server] Client connected to room "${roomName}". Room clients: ${room.conns.size}`);

  // Setup Ping / Pong heartbeat
  ws.on('pong', () => {
    clientConn.isAlive = true;
  });

  // Step 1: Send SyncStep1 to newly connected client to request missing state
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, room.doc);
  send(ws, encoding.toUint8Array(encoder));

  // Step 2: Send current awareness states (cursors, users)
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

  // Handle incoming binary messages from client
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
        default:
          console.warn(`[SyncCanvas Server] Unknown message type: ${messageType}`);
      }
    } catch (err: any) {
      console.error('[SyncCanvas Server] Message processing error:', err.message);
    }
  });

  // Clean up when client disconnects
  ws.on('close', () => {
    room.conns.delete(ws);
    // Remove client's awareness states
    const statesToRemove = Array.from(clientConn.controlledIds);
    if (statesToRemove.length > 0) {
      awarenessProtocol.removeAwarenessStates(room.awareness, statesToRemove, null);
    }
    console.log(
      `[SyncCanvas Server] Client disconnected from room "${roomName}". Room clients: ${room.conns.size}`
    );

    // Optional: Clean up empty rooms after idle timeout if needed
    if (room.conns.size === 0) {
      console.log(`[SyncCanvas Server] Room "${roomName}" is currently empty.`);
    }
  });

  ws.on('error', (err) => {
    console.error(`[SyncCanvas Server] Socket error in room "${roomName}":`, err.message);
  });
});

// Periodic ping to drop dead/stale connections every 30s
const pingInterval = setInterval(() => {
  rooms.forEach((room) => {
    room.conns.forEach((clientConn, ws) => {
      if (!clientConn.isAlive) {
        console.log(`[SyncCanvas Server] Terminating inactive socket in room "${room.name}"`);
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
  console.log(`⚡ SyncCanvas Real-Time Server listening on port ${PORT}`);
  console.log(`📊 Health & Stats Endpoint: http://localhost:${PORT}/stats`);
  console.log(`🔌 WebSocket Endpoint: ws://localhost:${PORT}/[room-name]`);
  console.log(`=======================================================`);
});
