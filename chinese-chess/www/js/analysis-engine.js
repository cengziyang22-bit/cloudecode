// analysis-engine.js -- Fairy-Stockfish WASM wrap, fallback to Wukong on failure
'use strict';

import { boardToFen } from './board.js';

var engine = null;
var fsfReady = false;
var fsfInitPromise = null;
var useFallback = false;
var initTimeout = 8000;
var searchTimeoutPad = 30000;

async function ensureInit() {
  if (fsfReady) return Promise.resolve();
  if (useFallback) return Promise.reject(new Error('fallback'));
  if (fsfInitPromise) return fsfInitPromise;

  fsfInitPromise = new Promise(async function (resolve, reject) {
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      console.warn('[FSF] init timeout (' + initTimeout + 'ms), fallback to Wukong');
      useFallback = true;
      fsfInitPromise = null;
      reject(new Error('FSF init timeout'));
    }, initTimeout);

    try {
      console.log('[FSF] loading WASM...');
      console.log('[FSF] using global Stockfish factory, instantiating...');
      engine = await Stockfish({ mainScriptUrlOrBlob: new URL('./engine/stockfish.js', import.meta.url).href });
      console.log('[FSF] WASM instantiated, starting UCI handshake...');

      if (timedOut) return;

      await new Promise(function (res) {
        var uciTimedOut = false;
        var uciTimer = setTimeout(function () {
          uciTimedOut = true;
          console.warn('[FSF] UCI handshake timeout');
          res();
        }, 5000);

        engine.addMessageListener(function (line) {
          console.log('[FSF] UCI:', line);
          if (uciTimedOut) return;
          // 检查 UCI_Variant 选项是否包含 xiangqi
          if (line.startsWith('option name UCI_Variant')) {
            if (line.indexOf(' var xiangqi ') < 0) {
              console.warn('[FSF] xiangqi variant not available in this build');
              useFallback = true;
            }
          }
          if (line === 'uciok') {
            console.log('[FSF] got uciok, setting options...');
            if (!useFallback) {
              engine.postMessage('setoption name UCI_Variant value xiangqi');
            }
            engine.postMessage('setoption name Hash value 32');
            engine.postMessage('isready');
          } else if (line === 'readyok') {
            console.log('[FSF] got readyok' + (useFallback ? ', xiangqi not available' : ', init complete'));
            clearTimeout(uciTimer);
            if (useFallback) {
              fsfInitPromise = null;
            } else {
              fsfReady = true;
            }
            res();
          }
        });
        engine.postMessage('uci');
      });

      clearTimeout(timer);
      if (!timedOut) resolve();
    } catch (e) {
      clearTimeout(timer);
      console.warn('[FSF] init failed:', e);
      useFallback = true;
      fsfInitPromise = null;
      reject(e);
    }
  });

  return fsfInitPromise;
}

function parseUciLine(line) {
  if (!line.startsWith('info ')) return null;
  var depth = 0, score = 0, scoreType = 'cp', pv = '';
  var d = line.match(/ depth (\d+)/);
  if (d) depth = parseInt(d[1]);
  var cp = line.match(/ score cp (-?\d+)/);
  var mate = line.match(/ score mate (-?\d+)/);
  if (cp) { scoreType = 'cp'; score = parseInt(cp[1]); }
  else if (mate) { scoreType = 'mate'; score = parseInt(mate[1]); }
  else return null;
  var p = line.match(/ pv (.+)$/);
  if (p) pv = p[1].trim();
  return { scoreType: scoreType, score: score, depth: depth, pv: pv };
}

var wukongAnalyze = null;

async function getWukongAnalyze() {
  if (!wukongAnalyze) {
    var ai = await import('./ai.js');
    wukongAnalyze = ai.analyzePosition;
  }
  return wukongAnalyze;
}

function fsfPvToNative(pv) {
  return pv;
}

export async function analyzePosition(board, color, onUpdate, onDone, thinkTimeMs) {
  // 没有 cross-origin isolation 就直接用 Wukong
  if (!self.crossOriginIsolated) {
    useFallback = true;
    var wu0 = await getWukongAnalyze();
    wu0(board, color, onUpdate, onDone, thinkTimeMs);
    return;
  }

  if (useFallback) {
    var wu = await getWukongAnalyze();
    wu(board, color, onUpdate, onDone, thinkTimeMs);
    return;
  }

  if (!fsfReady) {
    try {
      await ensureInit();
    } catch (e) {
      var wu2 = await getWukongAnalyze();
      wu2(board, color, onUpdate, onDone, thinkTimeMs);
      return;
    }
  }

  if (useFallback) {
    var wu3 = await getWukongAnalyze();
    wu3(board, color, onUpdate, onDone, thinkTimeMs);
    return;
  }

  var fen = boardToFen(board, color);
  var tt = thinkTimeMs || 2000;
  var bestResult = null;
  var doneCalled = false;
  var analysisListener = null;
  var searchTimer = setTimeout(function () {
    if (!doneCalled) {
      doneCalled = true;
      if (analysisListener) engine.removeMessageListener(analysisListener);
      if (onDone) onDone(bestResult);
    }
  }, tt + searchTimeoutPad);

  analysisListener = function (line) {
    if (doneCalled) return;
    if (line.startsWith('info ')) {
      var result = parseUciLine(line);
      if (result) {
        result.pv = fsfPvToNative(result.pv);
        bestResult = result;
        if (onUpdate) onUpdate(result);
      }
    } else if (line.startsWith('bestmove')) {
      clearTimeout(searchTimer);
      doneCalled = true;
      engine.removeMessageListener(analysisListener);
      if (onDone) onDone(bestResult);
    }
  };
  engine.addMessageListener(analysisListener);

  engine.postMessage('position fen ' + fen);
  engine.postMessage('go movetime ' + tt);
}

export function stopEngine() {
  if (engine) engine.postMessage('stop');
}

export function destroyEngine() {
  engine = null;
  fsfReady = false;
  fsfInitPromise = null;
  useFallback = false;
}
