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

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Icons:** Lucide React
- **Typography:** Plus Jakarta Sans & JetBrains Mono
- **CRDT Engine (Phase 2):** Yjs (`y-websocket`, `y-indexeddb`)
- **Backend / Scaling (Phase 2 & 4):** Node.js / Go, WebSockets, Redis Pub/Sub, PostgreSQL

---

## 💻 Getting Started Locally

### 1. Clone & Install
```bash
git clone <repo-url>
cd sync-canvas
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** in your browser.

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
- **Phase 2 (Next):** WebSocket Gateway Server + Yjs `Y.Doc` binding for real-time document synchronization.
- **Phase 3:** Multi-user live awareness (cursor tracking, user avatars, color coding) + IndexedDB offline sync.
- **Phase 4:** Redis Pub/Sub horizontal scaling, PostgreSQL auth/rooms, and production deployment.
