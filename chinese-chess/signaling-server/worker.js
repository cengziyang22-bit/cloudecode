// Chinese Chess WebRTC Signaling Server
// Cloudflare Workers + SQLite Durable Objects

import { DurableObject } from 'cloudflare:workers';

function generateRoomId() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function cors() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  });
}

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/init') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const existing = this.ctx.getWebSockets();
    console.log('[Room] fetch, existing WS count:', existing.length);

    if (existing.length >= 2) {
      return new Response('Room full', { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const role = existing.length === 0 ? 'host' : 'guest';
    server.send(JSON.stringify({ type: 'role', role: role }));
    console.log('[Room] new client role:', role);

    if (role === 'guest') {
      // Second client joined — notify both
      for (const s of existing) {
        try { s.send(JSON.stringify({ type: 'ready' })); } catch(e) {
          console.log('[Room] send ready to host failed:', e);
        }
      }
      try { server.send(JSON.stringify({ type: 'ready' })); } catch(e) {
        console.log('[Room] send ready to guest failed:', e);
      }
      console.log('[Room] both ready sent');
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const data = JSON.parse(message);
    console.log('[Room] message type:', data.type);
    const all = this.ctx.getWebSockets();
    for (const s of all) {
      if (s !== ws) {
        try { s.send(JSON.stringify(data)); } catch(e) {}
      }
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    console.log('[Room] WS closed, code:', code);
    const all = this.ctx.getWebSockets();
    for (const s of all) {
      if (s !== ws) {
        try {
          s.send(JSON.stringify({ type: 'peer-disconnected' }));
          s.close(1000, 'Peer left');
        } catch(e) {}
      }
    }
  }

  async webSocketError(ws, error) {
    console.log('[Room] WS error:', error);
    await this.webSocketClose(ws, 1006, 'Error', false);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return cors();

    const url = new URL(request.url);
    console.log('[Worker]', request.method, url.pathname);

    if (url.pathname === '/api/create' && request.method === 'POST') {
      const roomId = generateRoomId();
      const id = env.ROOM.idFromName(roomId);
      const stub = env.ROOM.get(id);
      await stub.fetch('http://dummy/init');
      console.log('[Worker] room created:', roomId);
      return json({ roomId: roomId });
    }

    const roomMatch = url.pathname.match(/^\/room\/(\d+)$/);
    if (roomMatch) {
      const roomId = roomMatch[1];
      console.log('[Worker] WS connect to room:', roomId);
      const id = env.ROOM.idFromName(roomId);
      const stub = env.ROOM.get(id);
      return stub.fetch(request);
    }

    return new Response('OK', {
      headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
