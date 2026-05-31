// 中国象棋联机对战 WebRTC 信令服务器
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const HEARTBEAT_INTERVAL = 30000;

const rooms = new Map(); // roomId → { red, black }

function genRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function log(msg) {
  const t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  console.log(`[${t}] ${msg}`);
}

function otherPeer(ws, room) {
  if (!room) return null;
  return ws === room.red ? room.black : room.red;
}

const wss = new WebSocketServer({ port: PORT });
log(`信令服务器启动，监听端口 ${PORT}`);

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  log(`新连接: ${clientIp}`);

  ws.isAlive = true;
  ws.roomId = null;
  ws.color = null;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    const room = rooms.get(ws.roomId);
    const peer = otherPeer(ws, room);

    switch (msg.type) {
      case 'create_room': {
        if (ws.roomId) { send(ws, { type: 'error', message: '你已在房间中' }); break; }
        let roomId = genRoomId();
        while (rooms.has(roomId)) roomId = genRoomId();
        ws.roomId = roomId;
        ws.color = 'red';
        rooms.set(roomId, { red: ws, black: null });
        send(ws, { type: 'room_created', roomId, color: 'red' });
        log(`房间 ${roomId} 创建, 红方: ${clientIp}`);
        break;
      }

      case 'join_room': {
        const { roomId } = msg;
        const target = rooms.get(roomId);
        if (!target) { send(ws, { type: 'error', message: '房间不存在' }); break; }
        if (ws === target.red) { send(ws, { type: 'error', message: '不能加入自己创建的房间' }); break; }
        if (ws.roomId) { send(ws, { type: 'error', message: '你已在房间中' }); break; }
        if (target.black) { send(ws, { type: 'error', message: '房间已满' }); break; }
        ws.roomId = roomId;
        ws.color = 'black';
        target.black = ws;
        send(ws, { type: 'joined', roomId, color: 'black' });
        send(target.red, { type: 'peer_joined' });
        log(`房间 ${roomId} 黑方加入: ${clientIp}`);
        break;
      }

      // 信令转发：offer / answer / ice_candidate → 转发给对手
      case 'offer':
      case 'answer':
      case 'ice_candidate':
        if (peer) send(peer, msg);
        break;

      case 'chat':
        if (peer) send(peer, msg);
        break;
    }
  });

  ws.on('close', () => {
    log(`${clientIp} 断开连接`);
    if (ws.roomId) {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      const peer = otherPeer(ws, room);
      if (peer) {
        send(peer, { type: 'peer_disconnected' });
        peer.roomId = null;
        peer.color = null;
      }
      rooms.delete(ws.roomId);
      log(`房间 ${ws.roomId} 已清理`);
    }
  });

  ws.on('error', (err) => {
    log(`连接错误: ${err.message}`);
  });
});

// 心跳检测
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => clearInterval(heartbeat));

log('中国象棋信令服务端就绪');
