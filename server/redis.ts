import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';
const INSTANCE_ID = `node_${Math.random().toString(36).substring(2, 8)}`;

let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let isConnected = false;

type RemoteUpdateHandler = (roomName: string, update: Uint8Array) => void;
let onRemoteUpdateCallback: RemoteUpdateHandler | null = null;

export function isRedisConnected(): boolean {
  return isConnected;
}

export function getInstanceId(): string {
  return INSTANCE_ID;
}

/**
 * Initializes Redis Pub/Sub connection if REDIS_URL or local Redis is available.
 */
export function initRedis(onUpdate: RemoteUpdateHandler) {
  onRemoteUpdateCallback = onUpdate;

  // If no REDIS_URL is provided and we aren't in production cluster, we stay in standalone mode
  if (!REDIS_URL && process.env.NODE_ENV !== 'production') {
    console.log('[SyncCanvas Redis] REDIS_URL not set; running in high-performance single-node mode.');
    return;
  }

  const connectionString = REDIS_URL || 'redis://localhost:6379';

  try {
    pubClient = new Redis(connectionString, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('[SyncCanvas Redis] Redis cluster unavailable. Falling back to local standalone mode.');
          return null; // Stop retrying
        }
        return Math.min(times * 1000, 3000);
      },
      lazyConnect: true,
    });

    subClient = new Redis(connectionString, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 1000, 3000)),
      lazyConnect: true,
    });

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        isConnected = true;
        console.log(`[SyncCanvas Redis] 🌐 Connected to Redis cluster (${connectionString}) on instance ${INSTANCE_ID}`);

        // Pattern subscribe to all room channels
        subClient?.psubscribe('synccanvas:room:*', (err) => {
          if (err) console.error('[SyncCanvas Redis] Pattern subscription error:', err);
        });

        subClient?.on('pmessage', (_pattern, channel, message) => {
          try {
            const roomName = channel.replace('synccanvas:room:', '');
            const parsed = JSON.parse(message);

            // Ignore messages published by this exact same node instance
            if (parsed.senderId === INSTANCE_ID) return;

            if (parsed.update && onRemoteUpdateCallback) {
              const binaryUpdate = new Uint8Array(Buffer.from(parsed.update, 'base64'));
              onRemoteUpdateCallback(roomName, binaryUpdate);
            }
          } catch (err: any) {
            console.error('[SyncCanvas Redis] Message parsing error:', err.message);
          }
        });
      })
      .catch((err) => {
        console.log(`[SyncCanvas Redis] Could not connect to Redis (${err.message}). Running in standalone mode.`);
        isConnected = false;
      });

    pubClient.on('error', () => {
      isConnected = false;
    });

    subClient.on('error', () => {
      isConnected = false;
    });
  } catch (err: any) {
    console.log(`[SyncCanvas Redis] Standalone mode active: ${err.message}`);
    isConnected = false;
  }
}

/**
 * Broadcasts a binary room update across the Redis cluster to other WebSocket server nodes.
 */
export function publishRoomUpdate(roomName: string, update: Uint8Array) {
  if (!isConnected || !pubClient) return;

  try {
    const payload = JSON.stringify({
      senderId: INSTANCE_ID,
      roomName,
      update: Buffer.from(update).toString('base64'),
      timestamp: Date.now(),
    });

    pubClient.publish(`synccanvas:room:${roomName}`, payload).catch(() => {});
  } catch {
    // Non-blocking
  }
}
