// src/server.ts

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import app from './app';

const PORT = 3000;

const httpServer = http.createServer(app);

// ── WebSocket ─────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  console.log('[WS] client connected, total:', wss.clients.size);
  ws.on('close', () => console.log('[WS] client disconnected, total:', wss.clients.size));
});

export function broadcast(payload: object) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

// ── Start ─────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});