# 🎨 SyncCanvas — Real-Time Collaborative Infinite Canvas & CRDT Engine

SyncCanvas is a high-performance, real-time collaborative whiteboard and infinite canvas inspired by Figma and Miro, built with **React, TypeScript, SVG Rendering, and Conflict-Free Replicated Data Types (CRDTs)**.

---

## 🌟 Architecture & System Design

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT BROWSER                                   |
|                                                                                   |
|   +-----------------------+     +------------------------+     +--------------+   |
|   |  Interactive Viewport | <-> |   Yjs State Vector     | <-> |  IndexedDB   |   |
|   |  (Pan, Zoom, 60 FPS)  |     |   (CRDT Conflict Free) |     |  (Offline)   |   |
|   +-----------------------+     +------------------------+     +--------------+   |
+---------------------------------------------^-------------------------------------+
                                              |
                                              | Binary Delta Updates (WebSocket)
                                              v
+-----------------------------------------------------------------------------------+
|                              REAL-TIME GATEWAY CLUSTER                            |
|                                                                                   |
|      +---------------------------+             +---------------------------+      |
|      |  WebSocket Server Node 1  |             |  WebSocket Server Node 2  |      |
|      +---------------------------+             +---------------------------+      |
|                    ^                                         ^                    |
|                    +--------------------+--------------------+                    |
|                                         |                                         |
|                                         v                                         |
|                           +---------------------------+                           |
|                           |  Redis Pub/Sub (Broker)   |                           |
|                           +---------------------------+                           |
+-----------------------------------------------------------------------------------+
                                          |
                                          | Periodic Snapshot Compaction
                                          v
                            +---------------------------+
                            | PostgreSQL / Object Store |
                            +---------------------------+
```

---

## 🚀 Phase 1: Completed Features

- [x] **Infinite Pan-and-Zoom Canvas:** Smooth matrix transformation (`translate` & `scale`) with wheel zoom centered around mouse position and spacebar pan.
- [x] **Dynamic Dot Grid:** Resolution-independent SVG pattern that seamlessly scales with zoom factor.
- [x] **Rich Shape & Element Engine:**
  - **Rectangles & Circles** with rounded corners, customizable fills, and stroke styles.
  - **Sticky Notes** with realistic shadows, pastel color palettes, and in-place rich text editing.
  - **Arrows & Connecting Lines** with SVG arrowhead markers.
  - **Freehand Pen Drawing** with smooth quadratic Bezier curve interpolation.
  - **Text Blocks** with custom font sizes, colors, and alignments.
- [x] **Element Manipulation:**
  - Single-click selection and multi-element marquee selection box.
  - 8-point interactive resize handles with direction-aware cursors.
  - 60 FPS transient dragging and transformation with batch commit.
  - Layer ordering (Bring to Front / Send to Back).
  - Duplicate (Ctrl+D) and Delete (Del / Backspace).
- [x] **History & Undo/Redo:** Full transaction history stack with `Ctrl+Z` / `Ctrl+Y` shortcuts.
- [x] **Export Capabilities:**
  - High-resolution PNG export with 2x Retina rendering.
  - JSON project schema export and import.
- [x] **Dark Glassmorphic UI:** Built with Google Fonts (*Plus Jakarta Sans* & *JetBrains Mono*), CSS backdrop filters, and floating docks.

---

## ⚡ Phase 2: Completed Features (Real-Time Multiplayer Sync)

- [x] **Standalone Real-Time WebSocket Server (`server/server.ts`):**
  - Room multiplexing with binary sync protocol (SyncStep1, SyncStep2, Update).
  - Awareness state relay (presence, cursors).
  - Health & metrics REST API endpoint (`http://localhost:1234/stats`).
  - Automatic connection cleanup and heartbeat ping/pong.
- [x] **CRDT Room Hook (`useYjsRoom`):**
  - Shared `Y.Doc` and `Y.Map<CanvasElement>`.
  - Transactional mutations with `doc.transact(...)`.
  - Distributed `Y.UndoManager` for multi-user undo/redo.
- [x] **Dynamic Multi-Room Collaboration:**
  - URL parameter room switching (`?room=team-alpha`).
  - One-click `Share Room` link copy button in header.
  - Live connection status badge (Connected, Connecting, Offline).

---

## 👥 Phase 3: Completed Features (Multi-User Presence & Offline Resilience)

- [x] **Live Multiplayer Cursors (`MultiplayerCursors.tsx`):**
  - Real-time mouse tracking broadcasted through the binary Yjs Awareness protocol.
  - Directional SVG cursor pointers styled with unique collaborator colors.
  - Floating name badges with smooth interpolation.
- [x] **Remote Selection Halos (`RemoteSelections.tsx`):**
  - Colored dashed bounding boxes highlighting objects currently selected by other collaborators.
  - Name tags identifying who is active on each element (Figma-style).
- [x] **Collaborator Profile Customizer (`UserProfileModal.tsx` & `user.ts`):**
  - Custom display name and avatar color selection.
  - Persistent user profile across sessions via `localStorage`.
  - Collaborators avatar stack in top navbar with real-time peer count.
- [x] **Offline-First Persistence (`y-indexeddb`):**
  - Full local persistence into browser IndexedDB.
  - Edits made while offline are saved instantly and merge seamlessly upon reconnection with zero data loss.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Real-Time & CRDT:** Yjs, `y-websocket`, `y-indexeddb`, `y-protocols`, `lib0`
- **Backend Server:** Node.js, TypeScript, `ws`, `http`, `tsx`
- **Icons & Styling:** Lucide React, Plus Jakarta Sans, JetBrains Mono

---

## 💻 Running Locally

### 1. Start Real-Time WebSocket Server
```bash
npm run server
```
Server listens on port `1234` with metrics at `http://localhost:1234/stats`.

### 2. Start Vite Frontend
```bash
npm run dev
```
Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** in two separate browser windows to test real-time collaboration with live cursors and selection halos!

---

## ⌨️ Keyboard Shortcuts Cheat Sheet

| Key | Action |
| :--- | :--- |
| `V` | Select Tool |
| `H` or `Space + Drag` | Hand / Pan Tool |
| `R` | Rectangle Tool |
| `O` | Circle / Ellipse Tool |
| `S` | Sticky Note Tool |
| `T` | Text Tool |
| `A` | Arrow Tool |
| `P` | Freehand Pen Tool |
| `E` | Eraser Tool |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + D` | Duplicate Selected |
| `Del` / `Backspace` | Delete Selected |
| `Ctrl + Scroll` | Zoom In / Out |
| `Shift + Click` | Multi-select Elements |
| `?` | Show Shortcuts Modal |

---

## 🗺️ Project Roadmap

- **Phase 1 (Completed):** Interactive Canvas Engine, local state transformations, shape rendering, export tools.
- **Phase 2 (Completed):** WebSocket Gateway Server + Yjs `Y.Doc` binding for real-time document synchronization.
- **Phase 3 (Completed):** Multi-user live awareness (cursor tracking, selection halos, customizable profiles) + `y-indexeddb` offline sync.
- **Phase 4 (Next):** Redis Pub/Sub horizontal scaling, snapshot compaction engine, and production deployment.
