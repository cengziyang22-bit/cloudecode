// sound.js — 古风武侠音效（真人语音 + 战鼓 + 锣）
'use strict';

let audioCtx = null;
let voiceBuffers = {};

// 预加载语音音频
export function preloadSounds() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var files = { capture: '吃', check: '将军', checkmate: '绝杀' };
  var keys = Object.keys(files);
  keys.forEach(function(key) {
    fetch('sounds/' + key + '.mp3')
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) {
        return audioCtx.decodeAudioData(buf);
      })
      .then(function(audioBuf) {
        voiceBuffers[key] = audioBuf;
        console.log('[Sound] 已加载语音:', files[key]);
      })
      .catch(function(e) {
        console.warn('[Sound] 语音加载失败:', key, e.message);
      });
  });
}

function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// 播放预加载的语音
function playVoice(key, delay, vol) {
  var c = ctx();
  var buf = voiceBuffers[key];
  if (!buf) return;
  var src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 1.12;
  var gain = c.createGain();
  gain.gain.value = vol || 1.0;
  src.connect(gain);
  gain.connect(c.destination);
  src.start(c.currentTime + (delay || 0));
}

// 战鼓
function warDrum(delay, freq, vol, decay) {
  var c = ctx();
  var t = c.currentTime + (delay || 0);
  var osc = c.createOscillator();
  var gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq || 90, t);
  osc.frequency.exponentialRampToValueAtTime((freq || 90) * 0.3, t + (decay || 0.2));
  gain.gain.setValueAtTime(vol || 0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (decay || 0.2));
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t); osc.stop(t + (decay || 0.2) + 0.02);
}

// 铜锣
function gong(delay, vol, decay) {
  var c = ctx();
  var t = c.currentTime + (delay || 0);
  var dur = decay || 0.25;
  var bufSize = Math.floor(c.sampleRate * dur);
  var buf = c.createBuffer(1, bufSize, c.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < bufSize; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
  }
  var src = c.createBufferSource();
  src.buffer = buf;
  var gain = c.createGain();
  gain.gain.setValueAtTime(vol || 0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  var bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 0.8;
  src.connect(bp); bp.connect(gain); gain.connect(c.destination);
  src.start(t);
}

// 战场低吼
function warGrowl(delay, vol, dur) {
  var c = ctx();
  var t = c.currentTime + (delay || 0);
  var osc = c.createOscillator();
  var gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(55, t);
  osc.frequency.linearRampToValueAtTime(35, t + (dur || 0.3));
  gain.gain.setValueAtTime(0.01, t);
  gain.gain.linearRampToValueAtTime(vol || 0.25, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.3));
  var lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 200;
  osc.connect(lp); lp.connect(gain); gain.connect(c.destination);
  osc.start(t); osc.stop(t + (dur || 0.3) + 0.02);
}

// ========== 绝杀种类语音播报（从MP3加载，与吃/将军/绝杀同款男声） ==========
export function playCheckmateTypeVoice(typeName, onDone) {
  // "绝杀" 没有单独语音文件（由 playCheckmateSound 播 checkmate.mp3）
  if (typeName === '绝杀' || !typeName) {
    if (onDone) onDone();
    return;
  }
  var c = ctx();
  var fileName = typeName.replace(/[\/\\:：<>"|?*\（\(）\)]/g, '').trim();
  fetch('sounds/' + encodeURIComponent(fileName) + '.mp3')
    .then(function(r) { if (!r.ok) throw new Error('no file'); return r.arrayBuffer(); })
    .then(function(buf) { return c.decodeAudioData(buf); })
    .then(function(audioBuf) {
      var src = c.createBufferSource();
      src.buffer = audioBuf;
      var gain = c.createGain();
      gain.gain.value = 1.0;
      src.connect(gain);
      gain.connect(c.destination);
      src.onended = function() { if (onDone) onDone(); };
      src.start(c.currentTime);
    })
    .catch(function() {
      // 没有语音文件则跳过（不出声）
      if (onDone) onDone();
    });
}

// ========== 走棋 ==========
export function playMoveSound() {
  var c = ctx();
  var t = c.currentTime;
  var osc = c.createOscillator();
  var g = c.createGain();
  osc.type = 'sine'; osc.frequency.value = 500;
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(g); g.connect(c.destination);
  osc.start(t); osc.stop(t + 0.06);
}

// ========== 吃子 ==========
export function playCaptureSound() {
  warDrum(0, 100, 0.7, 0.22);
  gong(0.02, 0.3, 0.2);
  warGrowl(0, 0.2, 0.25);
  playVoice('capture', 0.04, 1.0);
}

// ========== 将军 ==========
export function playCheckSound() {
  warGrowl(0, 0.3, 0.35);
  warDrum(0, 80, 0.75, 0.25);
  warDrum(0.12, 65, 0.6, 0.2);
  gong(0.15, 0.4, 0.3);
  playVoice('check', 0.06, 1.0);
}

// ========== 绝杀 ==========
export function playCheckmateSound() {
  warGrowl(0, 0.35, 0.5);
  warDrum(0, 60, 0.8, 0.3);
  warDrum(0.1, 50, 0.65, 0.25);
  warDrum(0.2, 42, 0.55, 0.22);
  gong(0.15, 0.5, 0.4);
  var c = ctx();
  var t = c.currentTime;
  var osc = c.createOscillator();
  var gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, t + 0.15);
  osc.frequency.exponentialRampToValueAtTime(22, t + 0.65);
  gain.gain.setValueAtTime(0.5, t + 0.15);
  gain.gain.setValueAtTime(0.5, t + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  osc.connect(gain); gain.connect(c.destination);
  osc.start(t + 0.15); osc.stop(t + 0.75);
  playVoice('checkmate', 0.1, 1.0);
}
