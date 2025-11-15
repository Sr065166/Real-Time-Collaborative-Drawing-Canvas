# Real-Time-Collaborative-Drawing-Canvas

🎨 Canvas — Sahil

A real-time, multi-user collaborative drawing canvas built using Vanilla JavaScript, HTML5 Canvas, Node.js, and WebSockets (Socket.io).
Users can draw together simultaneously, see each other's cursor movements, erase, change colors, undo/redo actions, and maintain a synchronized shared canvas.

🚀 Features
🖌️ Drawing Tools

Smooth brush drawing

Eraser tool (uses canvas compositing)

Custom color picker

Adjustable brush width

🔄 Real-Time Collaboration

Live drawing synced across all connected clients

Low-latency updates using WebSockets

Client-side smoothing for smooth strokes

👥 User Presence

Shows list of online users

Cursor position of peers (optional hook included)

↩️ Undo / Redo

Global undo/redo at the server level

Server maintains authoritative history

All clients re-render from shared state

🖼️ Canvas Engine

Efficient layered rendering

Quadratic curve interpolation for smooth lines

Avoids re-rendering full canvas on every stroke

Uses an offscreen layer for performance

🏗️ Project Structure
canvas-sahil/
├── client/
│   ├── index.html
│   ├── style.css
│   ├── canvas.js
│   ├── websocket.js
│   └── main.js
├── server/
│   ├── server.js
│   └── rooms.js
├── package.json
├── README.md
└── ARCHITECTURE.md

⚙️ Tech Stack
Frontend

HTML5 Canvas

Vanilla JavaScript

Pointer Events (mouse + touch)

Real-time stroke rendering

Backend

Node.js

Express.js

Socket.io

In-memory drawing history by room

🚀 Getting Started
1. Install Dependencies
npm install

2. Start Server
npm start

3. Open the App

Open your browser and go to:

http://localhost:3000

4. Test with Multiple Users

Open multiple tabs or browsers:

Tab 1 → http://localhost:3000

Tab 2 → http://localhost:3000

Drawings will synchronize in real-time.

🔧 How It Works
Real-Time Sync

Each stroke is an “operation” (op) containing points.

During drawing → partial stroke updates sent every 60ms.

When stroke ends → full stroke sent to server.

Server broadcasts the final stroke to all users.

Undo / Redo

Server keeps:

history[] → all applied operations

undone[] → stack of undone operations

Undo removes last op from history.

Redo restores last undone op.

Server sends updated history to all clients.


👨‍💻 Developed by

Sahil
Real-time collaborative drawing canvas project
