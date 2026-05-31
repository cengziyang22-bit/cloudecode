// ai.js — Wukong 纯 JS 引擎封装（无需 WASM/SharedArrayBuffer）
'use strict';

import { boardToFen } from './board.js';

let engine = null;

export function initEngine() {
  if (engine) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (typeof WukongEngine === 'undefined') {
      reject(new Error('Wukong 引擎未加载'));
      return;
    }
    try {
      engine = WukongEngine();
      console.log('[AI] Wukong 引擎初始化完成');
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

function wukongToGameMove(moveStr) {
  // Wukong moveToString 格式: "a9a8" (file+rank+file+rank), rank 0=底线(红), 9=底线(黑)
  var srcCol = moveStr.charCodeAt(0) - 97;
  var srcRank = parseInt(moveStr[1]);
  var dstCol = moveStr.charCodeAt(2) - 97;
  var dstRank = parseInt(moveStr[3]);
  return {
    fromR: 9 - srcRank,
    fromC: srcCol,
    toR: 9 - dstRank,
    toC: dstCol
  };
}

// 将 Wukong PV (rank 0-9) 转为 Fairy-Stockfish UCI 格式 (rank 1-10)
function wukongPvToUci(wukongPv) {
  if (!wukongPv) return '';
  return wukongPv.split(' ').map(function(move) {
    if (move.length < 4) return move;
    return move[0] + (parseInt(move[1]) + 1) + move[2] + (parseInt(move[3]) + 1);
  }).join(' ');
}

export function getBestMove(board, color, thinkTimeMs) {
  var thinkTime = thinkTimeMs || 2000;
  return new Promise((resolve) => {
    if (!engine) { resolve(null); return; }

    var fen = boardToFen(board, color);
    console.log('[AI] 请求走棋, FEN:', fen, 'thinkTime:', thinkTime);

    engine.setBoard(fen);
    engine.setTimeControl({
      timeSet: 1,
      stopTime: Date.now() + thinkTime,
      stopped: 0,
      time: thinkTime
    });

    // setTimeout 让浏览器有机会渲染 "AI 思考中..." 再开始同步搜索
    setTimeout(function () {
      var wukongMove = engine.search(64);
      if (!wukongMove) { resolve(null); return; }
      var moveStr = engine.moveToString(wukongMove);
      console.log('[AI] 最佳走法:', moveStr);
      resolve(wukongToGameMove(moveStr));
    }, 50);
  });
}

export function analyzePosition(board, color, onUpdate, onDone, thinkTimeMs) {
  if (!engine) {
    if (onDone) onDone(null);
    return;
  }

  var tt = thinkTimeMs || 3000;
  var fen = boardToFen(board, color);
  console.log('[AI] 分析局面, FEN:', fen, 'thinkTime:', tt);

  engine.setBoard(fen);
  engine.setTimeControl({
    timeSet: 1,
    stopTime: Date.now() + tt,
    stopped: 0,
    time: tt
  });

  setTimeout(function () {
    engine.search(64);
    var info = engine.getLastSearchInfo();

    if (info && info.score !== undefined) {
      var result;
      if (typeof info.score === 'string' && info.score.startsWith('M')) {
        result = {
          scoreType: 'mate',
          score: parseInt(info.score.substring(1)),
          depth: parseInt(info.depth) || 0,
          pv: wukongPvToUci(info.pv)
        };
      } else {
        result = {
          scoreType: 'cp',
          // Wukong 内部 pawn=30 分，转成 centipawn (pawn=100)
          score: (typeof info.score === 'number' ? info.score : parseInt(info.score) || 0) * 100 / 30,
          depth: parseInt(info.depth) || 0,
          pv: wukongPvToUci(info.pv)
        };
      }

      if (onUpdate) onUpdate(result);
      if (onDone) onDone(result);
    } else {
      if (onDone) onDone(null);
    }
  }, 50);
}

export function stopEngine() {
  if (engine) engine.resetTimeControl();
}

export function destroyEngine() {
  engine = null;
}
