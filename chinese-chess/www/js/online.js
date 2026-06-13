// online.js — 联机对战 WebRTC（信令服务器 + SDP 粘贴双模式）
// 优先使用信令服务器自动交换 SDP，降级到手动粘贴/QR 扫码
// 适用场景：同一WiFi / 热点 / 局域网（互联网P2P因CGNAT可能失败）
'use strict';

// 信令服务器地址（部署 Cloudflare Workers 后替换为实际地址）
const SIGNALING_SERVER = 'https://chinese-chess-signaling.2023qm.workers.dev';

// 多 STUN 服务器提高 candidate 获取成功率
const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.qq.com:3478' }
  ]
};
const ICE_TIMEOUT = 5000; // ICE 收集超时（仅用于文本粘贴模式）

let _pc = null;       // RTCPeerConnection
let _dc = null;       // DataChannel (game data)
let _isHost = false;
let _roomId = null;   // 6位连接码（用作标识）
let _color = null;    // 'red' | 'black'
let _fullSDPEncoded = null; // ICE 收集完成后的完整 SDP（含 candidates）
let _dcConnected = false;   // DataChannel 是否曾经成功打开过
let _failedTimer = null;    // failed 延迟确认定时器
let _ws = null;             // 信令 WebSocket
let _wsRoomId = null;       // 当前信令房间号

let _callbacks = {
  roomCreated: null,       // (roomId) - 主机：SDP已就绪
  gameStart: null,         // ({ roomId, color }) - DataChannel 已打开
  opponentMove: null,      // ({ fromR, fromC, toR, toC })
  opponentResigned: null,
  opponentDisconnected: null,
  iceFailed: null,         // () - ICE 连接失败（网络不可达）
  chat: null,
  error: null,
  qrOfferReady: null,      // (sdp) QR 主机 SDP 就绪
  qrAnswerReady: null,     // (sdp) QR 客机 Answer 就绪
  roomReady: null,         // ({ roomId }) - 信令房间双方就绪
  undoRequest: null,       // () - 对手请求悔棋
  undoResponse: null,      // (accepted: boolean) - 对手回复悔棋请求
};

// ============ 公开 API ============

// 主机：创建会话 → 回调返回 SDP 字符串（发给客机）
export function hostSession(onOfferReady) {
  _isHost = true;
  _color = 'red';
  _createPeer();
  _dc = _pc.createDataChannel('game');
  _setupDataChannel();

  _pc.createOffer().then(offer => _pc.setLocalDescription(offer)).catch(function(e) {
    console.error('[hostSession] 创建Offer失败:', e.message);
    if (_callbacks.error) _callbacks.error('创建会话失败: ' + e.message);
  });

  _waitForIce(function(sdp) {
    if (_callbacks.roomCreated) _callbacks.roomCreated(sdp);
    if (onOfferReady) onOfferReady(sdp);
  });
}

// QR 主机模式：显示 Offer QR → 扫描对方的 Answer QR → 连接
// 等 100ms 仅收集 host candidate，二维码短小可扫
export function startQRHost() {
  _isHost = true;
  _color = 'red';
  _createPeer();
  _dc = _pc.createDataChannel('game');
  _setupDataChannel();
  _pc.createOffer().then(function(offer) {
    return _pc.setLocalDescription(offer);
  }).then(function() {
    _waitForMinimalSDP(function(sdp) {
      if (_callbacks.qrOfferReady) _callbacks.qrOfferReady(sdp);
    });
  }).catch(function(e) {
    if (_callbacks.error) _callbacks.error('创建会话失败: ' + e.message);
  });
}
export function onQROfferReady(cb) { _callbacks.qrOfferReady = cb; }

// 客机扫描到 Offer QR 后：解析 → 创建 Answer → 显示 Answer QR
// 同样只等 100ms，仅 host candidate
export function startQRGuest(encodedOffer) {
  _isHost = false;
  _color = 'black';
  _createPeer();
  _pc.ondatachannel = function(e) { _dc = e.channel; _setupDataChannel(); };
  try {
    var desc = JSON.parse(atob(encodedOffer));
  } catch (e) {
    if (_callbacks.error) _callbacks.error('无效的二维码');
    return;
  }
  _pc.setRemoteDescription(new RTCSessionDescription(desc)).then(function() {
    return _pc.createAnswer();
  }).then(function(answer) {
    return _pc.setLocalDescription(answer);
  }).then(function() {
    _waitForMinimalSDP(function(sdp) {
      if (_callbacks.qrAnswerReady) _callbacks.qrAnswerReady(sdp);
    });
  }).catch(function(e) {
    if (_callbacks.error) _callbacks.error('应答失败: ' + e.message);
  });
}
export function onQRAnswerReady(cb) { _callbacks.qrAnswerReady = cb; }

// 主机：收到客机的 answer 后调用
export function connectGuest(encodedAnswer) {
  try {
    var desc = JSON.parse(atob(encodedAnswer));
    // ICE 可能已超时→failed，重建 peer 才能继续
    if (_pc && (_pc.connectionState === 'failed' || _pc.connectionState === 'closed')) {
      console.log('[connectGuest] 连接已失效(' + _pc.connectionState + ')，重建中...');
      _createPeer();
      if (_isHost) {
        _dc = _pc.createDataChannel('game');
        _setupDataChannel();
      } else {
        _pc.ondatachannel = function(e) { _dc = e.channel; _setupDataChannel(); };
      }
    }
    _pc.setRemoteDescription(new RTCSessionDescription(desc)).catch(function(err) {
      console.error('[connectGuest] setRemoteDescription失败:', err.message);
      if (_callbacks.error) _callbacks.error('连接失败: ' + err.message);
    });
  } catch (e) {
    if (_callbacks.error) _callbacks.error('无效的连接码');
  }
}

// 客机：接受主机的 SDP → 回调返回 answer SDP
export function acceptOffer(encodedOffer, onAnswerReady) {
  _isHost = false;
  _color = 'black';
  _createPeer();
  _pc.ondatachannel = function(e) { _dc = e.channel; _setupDataChannel(); };

  try {
    var desc = JSON.parse(atob(encodedOffer));
  } catch (e) {
    if (_callbacks.error) _callbacks.error('无效的连接码');
    return;
  }

  _pc.setRemoteDescription(new RTCSessionDescription(desc)).then(function() {
    return _pc.createAnswer();
  }).then(function(answer) {
    return _pc.setLocalDescription(answer);
  }).catch(function(e) {
    console.error('[acceptOffer] 设置远端描述/创建Answer失败:', e.message);
    if (_callbacks.error) _callbacks.error('接受连接失败: ' + e.message);
  });

  _waitForIce(function(sdp) {
    if (_callbacks.roomCreated) _callbacks.roomCreated(sdp);
    if (onAnswerReady) onAnswerReady(sdp);
  });
}

export function disconnect() {
  _cleanupWs();
  if (_failedTimer) { clearTimeout(_failedTimer); _failedTimer = null; }
  if (_dc) { _dc.close(); _dc = null; }
  if (_pc) { _pc.close(); _pc = null; }
  _isHost = false;
  _roomId = null;
  _color = null;
  _dcConnected = false;
}

// ============ WebSocket 信令模式（推荐） ============

// 创建房间 → 返回 6 位房间号，等待对手加入
export async function createRoom() {
  try {
    var resp = await fetch(SIGNALING_SERVER + '/api/create', { method: 'POST' });
    var data = await resp.json();
    if (!data.roomId) throw new Error('创建房间失败');
    _wsRoomId = data.roomId;
    _isHost = true;
    _color = 'red';
    _connectWs();
    return data.roomId;
  } catch(e) {
    if (_callbacks.error) _callbacks.error('创建房间失败: ' + e.message);
    throw e;
  }
}

// 加入房间（输入房间号）
export function joinRoom(roomId) {
  _wsRoomId = roomId;
  _isHost = false;
  _color = 'black';
  _connectWs();
}

// 离开信令房间
export function leaveRoom() {
  _cleanupWs();
  disconnect();
}

function _connectWs() {
  var roomId = _wsRoomId;
  _cleanupWs();
  _wsRoomId = roomId;
  var wsUrl = SIGNALING_SERVER.replace('https://', 'wss://') + '/room/' + _wsRoomId;
  var ws = new WebSocket(wsUrl);
  _ws = ws;

  ws.onopen = function() {
    console.log('[WS] 已连接房间 ' + _wsRoomId);
  };

  ws.onmessage = function(e) {
    var msg;
    try { msg = JSON.parse(e.data); } catch(_) { return; }
    _onWsMessage(msg);
  };

  ws.onclose = function() {
    console.log('[WS] 断开');
    _ws = null;
  };

  ws.onerror = function() {
    console.warn('[WS] 连接错误');
    if (_callbacks.error) _callbacks.error('信令服务器连接失败，请尝试手动粘贴模式');
  };
}

function _cleanupWs() {
  if (_ws) {
    try { _ws.close(); } catch(e) {}
    _ws = null;
  }
  _wsRoomId = null;
}

async function _onWsMessage(msg) {
  switch (msg.type) {
    case 'role':
      // 服务器分配的角色
      console.log('[WS] 角色: ' + msg.role);
      break;

    case 'ready':
      console.log('[WS] 双方就绪');
      if (_callbacks.roomReady) _callbacks.roomReady({ roomId: _wsRoomId });
      if (_isHost) {
        _createPeer();
        _dc = _pc.createDataChannel('game');
        _setupDataChannel();
        _waitForIce(function(sdp) {
          console.log('[WS] 发送Offer,长度=' + sdp.length);
          _sendWs({ type: 'sdp', sdp: sdp });
        });
        try {
          var offer = await _pc.createOffer();
          await _pc.setLocalDescription(offer);
        } catch(e) {
          if (_callbacks.error) _callbacks.error('创建Offer失败: ' + e.message);
        }
      } else {
        _createPeer();
        _pc.ondatachannel = function(e) { _dc = e.channel; _setupDataChannel(); };
      }
      break;

    case 'sdp':
      if (!msg.sdp) return;
      console.log('[WS] 收到SDP,长度=' + msg.sdp.length);
      try {
        var desc = JSON.parse(atob(msg.sdp));
        if (!_isHost) {
          _waitForIce(function(sdp) {
            console.log('[WS] 发送Answer,长度=' + sdp.length);
            _sendWs({ type: 'sdp', sdp: sdp });
          });
        }
        await _pc.setRemoteDescription(new RTCSessionDescription(desc));
        if (!_isHost) {
          var answer = await _pc.createAnswer();
          await _pc.setLocalDescription(answer);
        }
      } catch(e) {
        console.error('[WS] SDP处理失败:', e.message);
        if (_callbacks.error) _callbacks.error('SDP交换失败: ' + e.message);
      }
      break;

    case 'peer-disconnected':
      if (_callbacks.opponentDisconnected) _callbacks.opponentDisconnected();
      break;
  }
}

function _sendWs(data) {
  if (_ws && _ws.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify(data));
  }
}

// ============ 原有 SDP 粘贴模式（降级） ============

export function sendMove(fromR, fromC, toR, toC) {
  _sendDC({ type: 'move', move: { fromR, fromC, toR, toC } });
}

export function sendResign() {
  _sendDC({ type: 'resign' });
}

export function sendChat(text) {
  _sendDC({ type: 'chat', text });
}

export function sendUndoRequest() {
  _sendDC({ type: 'undo-request' });
}

export function sendUndoResponse(accepted) {
  _sendDC({ type: 'undo-response', accepted: accepted });
}

export function getMyColor() { return _color; }
export function isConnected() { return _dc && _dc.readyState === 'open'; }

// ============ 回调 ============
export function onRoomCreated(cb) { _callbacks.roomCreated = cb; }
export function onGameStart(cb) { _callbacks.gameStart = cb; }
export function onOpponentMove(cb) { _callbacks.opponentMove = cb; }
export function onOpponentResigned(cb) { _callbacks.opponentResigned = cb; }
export function onOpponentDisconnected(cb) { _callbacks.opponentDisconnected = cb; }
export function onChat(cb) { _callbacks.chat = cb; }
export function onError(cb) { _callbacks.error = cb; }
export function onIceFailed(cb) { _callbacks.iceFailed = cb; }
export function onRoomReady(cb) { _callbacks.roomReady = cb; }
export function onUndoRequest(cb) { _callbacks.undoRequest = cb; }
export function onUndoResponse(cb) { _callbacks.undoResponse = cb; }

// ============ 内部 ============

function _createPeer() {
  if (_pc) { _pc.close(); }
  _pc = new RTCPeerConnection(STUN_SERVERS);
  _fullSDPEncoded = null;
  _dcConnected = false;
  if (_failedTimer) { clearTimeout(_failedTimer); _failedTimer = null; }

  // ICE 连接状态：disconnected 是瞬态抖动，忽略
  _pc.oniceconnectionstatechange = function() {
    if (_pc.iceConnectionState === 'failed') {
      console.warn('[ICE] 连接失败（网络不可达）');
    }
  };

  // 连接状态：以 DataChannel 为唯一依据
  // disconnected → 忽略（网络抖动）
  // failed → 延迟确认，给 ICE 重试机会
  // closed → 真关闭
  _pc.onconnectionstatechange = function() {
    var state = _pc.connectionState;
    if (state === 'failed') {
      if (!_failedTimer) {
        _failedTimer = setTimeout(function() {
          _failedTimer = null;
          // 3秒后 still failed → 真失败
          if (_callbacks.iceFailed) _callbacks.iceFailed();
        }, 3000);
      }
    } else if (state === 'connected') {
      if (_failedTimer) { clearTimeout(_failedTimer); _failedTimer = null; }
    } else if (state === 'closed') {
      if (_failedTimer) { clearTimeout(_failedTimer); _failedTimer = null; }
      if (_dcConnected && _callbacks.opponentDisconnected) _callbacks.opponentDisconnected();
    }
  };

  // ICE 收集完成时保存完整 SDP，以备 DataChannel 打开后补发
  _pc.onicegatheringstatechange = function() {
    if (_pc.iceGatheringState === 'complete') {
      _fullSDPEncoded = _encodeDesc();
      if (_dc && _dc.readyState === 'open') {
        _sendDC({ type: 'sdp_sync', sdp: _fullSDPEncoded });
      }
    }
  };
}

// QR 模式：只收集 host candidate，不等 srflx（中国大陆移动网络
// 常无公网 srflx，等再久也等不到）。100ms 足够 host 就绪，
// 二维码大小稳定在数百字符，任何手机都能扫。
// 跨网连接失败由 onIceFailed 回调处理，提示用户切换网络。
function _waitForMinimalSDP(cb) {
  var timer = setTimeout(function() {
    cb(_encodeDesc());
  }, 100);

  // 如果 ICE 提前完成（极少情况），提前返回
  _pc.onicegatheringstatechange = function() {
    if (_pc.iceGatheringState === 'complete') {
      clearTimeout(timer);
      _fullSDPEncoded = _encodeDesc();
      cb(_fullSDPEncoded);
    }
  };
}

function _setupDataChannel() {
  _dc.onopen = function() {
    _dcConnected = true;
    if (_callbacks.gameStart) _callbacks.gameStart({ roomId: _roomId || '', color: _color });
    // DataChannel 打开后，如果完整 SDP 已就绪，补发 candidates
    if (_fullSDPEncoded) {
      _sendDC({ type: 'sdp_sync', sdp: _fullSDPEncoded });
    }
  };

  _dc.onmessage = function(e) {
    var msg;
    try { msg = JSON.parse(e.data); }
    catch (_) { return; }
    switch (msg.type) {
      case 'move':
        if (_callbacks.opponentMove) _callbacks.opponentMove(msg.move);
        break;
      case 'resign':
        if (_callbacks.opponentResigned) _callbacks.opponentResigned();
        break;
      case 'chat':
        if (_callbacks.chat) _callbacks.chat(msg.text);
        break;
      case 'sdp_sync':
        _handleSDPSync(msg.sdp);
        break;
      case 'undo-request':
        if (_callbacks.undoRequest) _callbacks.undoRequest();
        break;
      case 'undo-response':
        if (_callbacks.undoResponse) _callbacks.undoResponse(msg.accepted);
        break;
    }
  };

  _dc.onclose = function() {
    var wasConnected = _dcConnected;
    _dcConnected = false;
    if (wasConnected && _callbacks.opponentDisconnected) _callbacks.opponentDisconnected();
  };
}

// 收到对方补发的完整 SDP → 解析并添加新 candidate
function _handleSDPSync(encodedSdp) {
  if (!_pc) return;
  try {
    var raw = atob(encodedSdp);
    var desc = JSON.parse(raw);
    var lines = desc.sdp ? desc.sdp.split('\n') : [];
    var added = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf('a=candidate:') === 0) {
        var candStr = line.substring(12).trim();
        if (candStr) {
          try {
            _pc.addIceCandidate(new RTCIceCandidate({ candidate: candStr }));
            added++;
          } catch(e) { /* ignore dup/invalid */ }
        }
      }
    }
    console.log('[ICE] 收到 ' + added + ' 个补发 candidate');
  } catch(e) {
    console.warn('[ICE] 解析补发 SDP 失败:', e.message);
  }
}

function _sendDC(msg) {
  if (_dc && _dc.readyState === 'open') _dc.send(JSON.stringify(msg));
}

function _waitForIce(cb) {
  var done = false;
  function tryEmit() {
    if (_pc.localDescription) {
      cb(_encodeDesc());
    } else {
      console.warn('[waitForIce] localDescription 未就绪，延迟重试...');
      setTimeout(tryEmit, 500);
    }
  }
  var timer = setTimeout(function() {
    if (!done) { done = true; tryEmit(); }
  }, ICE_TIMEOUT);

  _pc.onicecandidate = function(e) {
    if (!e.candidate && !done) {
      done = true;
      clearTimeout(timer);
      setTimeout(tryEmit, 150);
    }
  };
}

function _encodeDesc() {
  return btoa(JSON.stringify(_pc.localDescription));
}

// 紧凑编码用于二维码：去掉 JSON 包装，type 缩为 1 字母，节省约 40%
// 格式: "o|base64_of_full_sdp"  (o=offer) 或 "a|base64_of_full_sdp" (a=answer)
function _encodeDescCompact() {
  var desc = _pc.localDescription;
  var prefix = desc.type === 'offer' ? 'o|' : 'a|';
  return prefix + btoa(desc.sdp);
}

// 解码紧凑格式为标准 {type, sdp} 对象
function _decodeCompact(encoded) {
  if (encoded.length < 3 || encoded[1] !== '|') return null;
  var type = encoded[0] === 'o' ? 'offer' : encoded[0] === 'a' ? 'answer' : null;
  if (!type) return null;
  var sdp = atob(encoded.substring(2));
  return { type: type, sdp: sdp };
}

// ============ 色块编码（汉字压缩） ============
// 将 gzip 压缩后的 O|/A| 格式 base64 进一步压缩为汉字串
// 每 2 个 base64 字符 → 1 个汉字，长度再减 50%
// 前缀 C|O 或 C|A 表示色块编码（C=ColorBlock, O/A=原始类型）
const _B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const _B64_MAP = {};
for (var _i = 0; _i < 64; _i++) _B64_MAP[_B64[_i]] = _i;
const _HANZI_START = 0x4E00; // CJK 统一表意文字起始

// 压缩 SDP → 汉字色块串
export function toColorBlocks(compressed) {
  var type = compressed[0]; // 'O' | 'A'
  var data = compressed.substring(2);
  var out = '';
  for (var i = 0; i < data.length; i += 2) {
    if (i + 1 < data.length) {
      var idx = _B64_MAP[data[i]] * 64 + _B64_MAP[data[i + 1]];
      out += String.fromCharCode(_HANZI_START + idx);
    } else {
      out += data[i]; // 奇数长度保留
    }
  }
  return 'C|' + type + out;
}

// 汉字色块串 → 压缩 SDP
export function fromColorBlocks(code) {
  if (code[0] !== 'C' || code[1] !== '|') return code;
  var type = code[2];
  var data = code.substring(3);
  var out = '';
  for (var i = 0; i < data.length; i++) {
    var cp = data.charCodeAt(i);
    if (cp >= _HANZI_START) {
      var offset = cp - _HANZI_START;
      out += _B64[Math.floor(offset / 64)] + _B64[offset % 64];
    } else {
      out += data[i];
    }
  }
  return type + '|' + out;
}

// 压缩 SDP：gzip → O|base64 或 A|base64
// 输入是标准 base64 JSON SDP，输出压缩串，体积缩小 60-70%
export async function compressSDP(sdpBase64) {
  try {
    var desc = JSON.parse(atob(sdpBase64));
    var enc = new TextEncoder();
    var prefix = desc.type === 'offer' ? 'O|' : 'A|';
    var comp = await new Response(
      new Blob([enc.encode(desc.sdp)]).stream().pipeThrough(new CompressionStream('gzip'))
    ).arrayBuffer();
    var bytes = new Uint8Array(comp);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    var result = prefix + btoa(bin);
    console.log('[compressSDP] ' + desc.type + ' | 原始=' + sdpBase64.length + 'B → 压缩=' + result.length + 'B');
    return result;
  } catch(e) {
    console.warn('[compressSDP] 压缩失败:', e.message);
    return sdpBase64;
  }
}

// 通用解码：支持原始格式和压缩格式，返回标准 base64 编码
// 格式: o| / a| (紧凑), O| / A| (压缩+gzip), 或直接标准 base64
export async function normalizeSDP(encoded) {
  // 色块编码 C|O / C|A → 先解码为 O| / A| 再继续
  if (encoded.length > 3 && encoded[0] === 'C' && encoded[1] === '|') {
    console.log('[normalizeSDP] 检测到色块编码，解码中...');
    encoded = fromColorBlocks(encoded);
  }
  // 压缩格式 O| / A|
  if (encoded.length > 2 && encoded[1] === '|' && (encoded[0] === 'O' || encoded[0] === 'A')) {
    try {
      var type = encoded[0] === 'O' ? 'offer' : 'answer';
      var compressed = atob(encoded.substring(2));
      var bytes = new Uint8Array(compressed.length);
      for (var i = 0; i < compressed.length; i++) bytes[i] = compressed.charCodeAt(i);
      var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      var buf = await new Response(stream).arrayBuffer();
      var sdp = new TextDecoder().decode(buf);
      console.log('[normalizeSDP] 解压成功 | type=' + type + ' sdp_len=' + sdp.length);
      return btoa(JSON.stringify({type: type, sdp: sdp}));
    } catch(e) {
      console.warn('[normalizeSDP] 解压失败:', e.message);
      // O|/A| 解压失败 → 不降级到 o| 原始文本格式（数据是 gzip base64 而非 SDP 文本）
      return encoded;
    }
  }

  // 紧凑格式（o|base64sdp 或 a|base64sdp）
  try {
    var compact = _decodeCompact(encoded);
    if (compact) {
      var result = btoa(JSON.stringify(compact));
      console.log('[normalizeSDP] 紧凑格式解码成功 | type=' + compact.type + ' sdp_len=' + compact.sdp.length);
      return result;
    }
  } catch(e) { /* not compact format, fall through */ }
  // 原始文本紧凑格式（o| + 原始SDP，无base64）
  if (encoded.length > 2 && encoded[1] === '|') {
    var t = encoded[0] === 'o' ? 'offer' : 'answer';
    console.log('[normalizeSDP] 原始文本紧凑格式 type=' + t);
    return btoa(JSON.stringify({type: t, sdp: encoded.substring(2)}));
  }
  // 标准格式
  console.log('[normalizeSDP] 标准base64格式');
  return encoded;
}

// ============ 色块图编码（图片分享） ============
// 每3个base64字符→1个RGB色块，排列成20列网格，生成PNG图片
// 用户保存图片发给对方，对方选图自动解码
const CB_SIZE = 32;   // 色块像素
const CB_GAP = 4;     // 间隙
const CB_CELL = CB_SIZE + CB_GAP; // 36
const CB_COLS = 20;   // 每行20块
const CB_MUL = 4;     // 0-63 → 0-252（留容差）

// 生成色块图Canvas，输入 O|base64 或 A|base64
export function generateColorImage(compressed) {
  var type = compressed[0]; // O|A
  var data = compressed.substring(2);
  var total = data.length;
  // 补齐到3的倍数
  var pad = (3 - total % 3) % 3;
  for (var p = 0; p < pad; p++) data += 'A';
  var blocks = data.length / 3; // 数据块数
  var all = 1 + blocks;         // 含1个头部
  var rows = Math.ceil(all / CB_COLS);
  var W = CB_COLS * CB_CELL + CB_GAP;
  var H = rows * CB_CELL + CB_GAP;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var cx = cv.getContext('2d');
  cx.fillStyle = '#fff';
  cx.fillRect(0, 0, W, H);

  function blk(idx, r, g, b) {
    var col = idx % CB_COLS, row = (idx / CB_COLS) | 0;
    cx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    cx.fillRect(col * CB_CELL + CB_GAP, row * CB_CELL + CB_GAP, CB_SIZE, CB_SIZE);
  }

  // 头部：count=12bits, type=1bit (O=0, A=63)
  blk(0,
    ((total >> 6) & 0x3F) * CB_MUL,
    (total & 0x3F) * CB_MUL,
    type === 'A' ? 0xFC : 0); // 63*4=252(蓝全亮=A), 0=O

  // 数据块
  for (var i = 0; i < data.length; i += 3) {
    var idx = i / 3 + 1;
    blk(idx,
      _B64_MAP[data[i]] * CB_MUL,
      _B64_MAP[data[i + 1]] * CB_MUL,
      _B64_MAP[data[i + 2]] * CB_MUL);
  }
  return cv;
}

// 从图片元素解码色块图 → O|base64 或 A|base64
export function decodeColorImage(img) {
  var W = img.naturalWidth, H = img.naturalHeight;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0);
  // 推算网格行列
  var cell = W / CB_COLS;
  var rows = Math.round(H / cell);
  var vals = [];
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < CB_COLS; c++) {
      var x = (c + 0.5) * cell | 0;
      var y = (r + 0.5) * cell | 0;
      if (x < W && y < H) {
        var px = cx.getImageData(x, y, 1, 1).data;
        vals.push(Math.round(px[0] / CB_MUL));
        vals.push(Math.round(px[1] / CB_MUL));
        vals.push(Math.round(px[2] / CB_MUL));
      }
    }
  }
  // 头部
  var count = (vals[0] << 6) | vals[1];
  var type = vals[2] >= 32 ? 'A' : 'O';
  // 数据
  var res = '';
  for (var i = 3; i < vals.length; i++) {
    var v = vals[i];
    res += _B64[v < 0 ? 0 : v > 63 ? 63 : v];
  }
  res = res.substring(0, count);
  return type + '|' + res;
}
