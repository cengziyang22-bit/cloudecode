// opening-book.js — 开局库匹配：根据前几步走法识别开局名称
'use strict';

import { RED, BLACK, PIECE } from './board.js';

// ============ 通用匹配工具 ============

function match(m, opts) {
  if (!m) return false;
  if (opts.color !== undefined && m.piece.color !== opts.color) return false;
  if (opts.type !== undefined && m.piece.type !== opts.type) return false;
  if (opts.fr !== undefined && m.fromR !== opts.fr) return false;
  if (opts.fc !== undefined && m.fromC !== opts.fc) return false;
  if (opts.tr !== undefined && m.toR !== opts.tr) return false;
  if (opts.tc !== undefined && m.toC !== opts.tc) return false;
  return true;
}

function isRed(opts) { opts.color = RED; return match; }
function isBlack(opts) { opts.color = BLACK; return match; }

// ============ 红方第一步识别 ============

function redFirstMove(moves) {
  if (moves.length < 1) return 'unknown';
  var m = moves[0];
  // 中炮: 炮从 (7,1) 或 (7,7) 移到 (7,4)
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:1, tr:7, tc:4 })) return '中炮_右';
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:7, tr:7, tc:4 })) return '中炮_左';
  // 仙人指路: 兵从 (6,4) 进到 (5,4)
  if (match(m, { color:RED, type:PIECE.PAWN, fr:6, fc:4, tr:5, tc:4 })) return '仙人指路';
  // 飞相局: 相从 (9,2) 或 (9,6) 走到 (8,4)
  if (match(m, { color:RED, type:PIECE.ELEPHANT, fr:9, fc:2, tr:8, tc:4 })) return '飞相局';
  if (match(m, { color:RED, type:PIECE.ELEPHANT, fr:9, fc:6, tr:8, tc:4 })) return '飞相局';
  // 起马局: 马二进三 (9,1)→(7,2) 或 马八进七 (9,7)→(7,6)
  if (match(m, { color:RED, type:PIECE.HORSE, fr:9, fc:1, tr:7, tc:2 })) return '起马局';
  if (match(m, { color:RED, type:PIECE.HORSE, fr:9, fc:7, tr:7, tc:6 })) return '起马局';
  // 过宫炮: 炮从 (7,1) 到 (7,3) 或 (7,7) 到 (7,5)
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:1, tr:7, tc:3 })) return '过宫炮';
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:7, tr:7, tc:5 })) return '过宫炮';
  // 仕角炮: 炮从 (7,1) 到 (7,2) 或 (7,7) 到 (7,6)
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:1, tr:7, tc:2 })) return '仕角炮';
  if (match(m, { color:RED, type:PIECE.CANNON, fr:7, fc:7, tr:7, tc:6 })) return '仕角炮';
  return '其他';
}

// ============ 黑方走法检查工具 ============

function getMove(moves, idx) { return idx < moves.length ? moves[idx] : null; }

function blackHorseAdvance(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    return match(m, { color:BLACK, type:PIECE.HORSE, fr:0, fc:1, tr:2, tc:2 }) ||
           match(m, { color:BLACK, type:PIECE.HORSE, fr:0, fc:7, tr:2, tc:6 });
  };
}

// 黑方是否在指定步走了中炮（同侧/异侧）
function blackCannonCenterAt(idx, sameSide) {
  return function(moves) {
    var m = getMove(moves, idx);
    if (!match(m, { color:BLACK, type:PIECE.CANNON, tr:2, tc:4 })) return false;
    // 同侧/异侧：检查红方第一步炮的来源列
    if (sameSide === undefined) return true;
    var r1 = getMove(moves, 0);
    var redFromC = r1 ? r1.fromC : -1;
    if (sameSide) return m.fromC === redFromC;
    else return m.fromC !== redFromC;
  };
}

function blackPawnCenterAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    // 黑卒从 (3,2) 进到 (4,2) 或 (3,6) 进到 (4,6)
    return match(m, { color:BLACK, type:PIECE.PAWN, fr:3, fc:2, tr:4, tc:2 }) ||
           match(m, { color:BLACK, type:PIECE.PAWN, fr:3, fc:6, tr:4, tc:6 });
  };
}

function blackElephantCenterAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    return match(m, { color:BLACK, type:PIECE.ELEPHANT, fr:0, fc:2, tr:1, tc:4 }) ||
           match(m, { color:BLACK, type:PIECE.ELEPHANT, fr:0, fc:6, tr:1, tc:4 });
  };
}

// 黑方士角炮：炮8平6 (2,7)→(2,5) 或 炮2平4 (2,1)→(2,3) 或 炮2平6 等
function blackAdvisorCannonAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    if (!match(m, { color:BLACK, type:PIECE.CANNON })) return false;
    // 从炮位 (2,1) 或 (2,7) 平到士角 (2,2)/(2,3)/(2,5)/(2,6)
    return (m.fromR === 2 && (m.fromC === 1 || m.fromC === 7) &&
            m.toR === 2 && (m.toC === 2 || m.toC === 3 || m.toC === 5 || m.toC === 6));
  };
}

// 黑方过宫炮：炮8平6 (2,7)→(2,5) 或 炮2平6 (2,1)→(2,3)
function blackPalaceCannonAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    if (!match(m, { color:BLACK, type:PIECE.CANNON })) return false;
    return (m.fromR === 2 && m.fromC === 7 && m.toR === 2 && m.toC === 5) ||
           (m.fromR === 2 && m.fromC === 1 && m.toR === 2 && m.toC === 3);
  };
}

// 黑方出车：车1进1 (0,0)→(1,0) 或 车9进1 (0,8)→(1,8)
function blackRookAdvanceAt(idx) {
  return function(moves) {
    var m = getMove(moves, idx);
    return match(m, { color:BLACK, type:PIECE.ROOK, tr:1 }) &&
           (m.fromC === m.toC) && (m.toR > m.fromR);
  };
}

// 黑方任意位置上有马前进（用于检查是否只动了一马）
function countBlackHorseMoves(moves, maxIdx) {
  var cnt = 0;
  for (var i = 0; i <= maxIdx && i < moves.length; i++) {
    var m = moves[i];
    if (m && m.piece.color === BLACK && m.piece.type === PIECE.HORSE) cnt++;
  }
  return cnt;
}

// ============ 开局匹配规则 ============

var RULES = [];

function rule(name, style, desc, check) {
  RULES.push({ name: name, style: style, description: desc, check: check });
}

// --- 中炮变例 ---

rule('中炮对屏风马', '主动进攻',
  '红方中炮开局，黑方双马保中卒，经典布局，攻防体系完善',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    // 黑方前3步内走出双马
    var bMa1 = blackHorseAdvance(1)(moves);
    var bMa3 = moves.length >= 3 && blackHorseAdvance(3)(moves);
    // 或者黑方前两个黑棋走法都是马
    var bMaAlt = moves.length >= 4 && blackHorseAdvance(3)(moves);
    return bMa1 && (bMaAlt || countBlackHorseMoves(moves, 5) >= 2);
  }
);

rule('中炮对顺炮', '激烈对攻',
  '双方都走中炮，形成对攻局面，往往短兵相接',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    return blackCannonCenterAt(1, true)(moves);
  }
);

rule('中炮对列炮', '激烈对攻',
  '双方中炮方向相反，两翼展开激烈对攻',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    return blackCannonCenterAt(1, false)(moves);
  }
);

rule('中炮对反宫马', '稳健防守',
  '红方中炮，黑方士角炮配合单马防御，弹性较强',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    // 黑方一马 + 士角炮（前5步内）
    var hasHorse = blackHorseAdvance(1)(moves);
    if (!hasHorse) return false;
    // 检查士角炮在步1或步3或步5
    var hasCannon = moves.length >= 4 && blackAdvisorCannonAt(3)(moves);
    if (!hasCannon && moves.length >= 6) hasCannon = blackAdvisorCannonAt(5)(moves);
    if (!hasCannon && moves.length >= 2) hasCannon = blackAdvisorCannonAt(1)(moves); // 第一步就炮
    // 确保不是双马（屏风马）
    var isScreenHorses = moves.length >= 4 && blackHorseAdvance(3)(moves);
    return hasCannon && !isScreenHorses;
  }
);

rule('中炮对三步虎', '灵活多变',
  '黑方先出车后上马，阵型灵活，反弹性强',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    // 黑方在自己的前2步内出车，且最多只有一马
    var hasRook = blackRookAdvanceAt(1)(moves) || (moves.length >= 4 && blackRookAdvanceAt(3)(moves));
    if (!hasRook) return false;
    var horseCount = countBlackHorseMoves(moves, 5);
    return horseCount < 2;
  }
);

rule('中炮对单提马', '稳健防守',
  '黑方仅用一马守护中路，另一翼子力较弱，但反击直接',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    // 前4个黑方走法内只有1个马（另一马没出）
    if (moves.length < 2) return false;
    var maxCheckIdx = Math.min(moves.length - 1, 7);
    var horseCount = countBlackHorseMoves(moves, maxCheckIdx);
    // 有且仅有一马，且没有出另一马
    if (horseCount !== 1) return false;
    // 也没走中炮（排除顺炮列炮）
    if (blackCannonCenterAt(1)(moves)) return false;
    // 也没走士角炮（排除反宫马）
    if (blackAdvisorCannonAt(1)(moves) || (moves.length >= 4 && blackAdvisorCannonAt(3)(moves))) return false;
    // 也没出车（排除三步虎）
    if (blackRookAdvanceAt(1)(moves) || (moves.length >= 4 && blackRookAdvanceAt(3)(moves))) return false;
    return true;
  }
);

rule('中炮对进卒', '灵活多变',
  '红方中炮，黑方先进卒，阵型灵活，可根据红方动向调整',
  function(moves) {
    if (!moves[0] || !/^中炮/.test(redFirstMove(moves))) return false;
    return blackPawnCenterAt(1)(moves);
  }
);

// --- 仙人指路变例 ---

rule('仙人指路对卒底炮', '激烈对攻',
  '红方挺七兵，黑方炮打中兵，形成激烈对攻局势',
  function(moves) {
    if (redFirstMove(moves) !== '仙人指路') return false;
    return blackCannonCenterAt(1)(moves);
  }
);

rule('仙人指路对飞象', '散手缠斗',
  '红方挺兵，黑方飞象，双方比拼内功，节奏较缓',
  function(moves) {
    if (redFirstMove(moves) !== '仙人指路') return false;
    return blackElephantCenterAt(1)(moves);
  }
);

rule('仙人指路对起马', '灵活多变',
  '红方挺兵，黑方跳马，双方正常出子，可转向多种布局',
  function(moves) {
    if (redFirstMove(moves) !== '仙人指路') return false;
    return blackHorseAdvance(1)(moves);
  }
);

rule('仙人指路对挺卒', '散手缠斗',
  '双方对挺兵卒，互不干涉，比拼中局功力',
  function(moves) {
    if (redFirstMove(moves) !== '仙人指路') return false;
    return blackPawnCenterAt(1)(moves);
  }
);

// --- 飞相局变例 ---

rule('飞相对过宫炮', '稳健防守',
  '红方飞相巩固阵地，黑方过宫炮瞄向红方薄弱侧翼',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    return blackPalaceCannonAt(1)(moves);
  }
);

rule('飞相对左中炮', '激烈对攻',
  '红方飞相，黑方左中炮直接攻击红方中路',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    // 左中炮：炮8平5 (2,7)→(2,4)
    return match(getMove(moves, 1), { color:BLACK, type:PIECE.CANNON, fr:2, fc:7, tr:2, tc:4 });
  }
);

rule('飞相对士角炮', '散手缠斗',
  '红方飞相，黑方士角炮，双方稳健出子，注重阵地战',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    return blackAdvisorCannonAt(1)(moves);
  }
);

rule('飞相对起马', '灵活多变',
  '红方飞相，黑方跳马，双方正常出子',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    return blackHorseAdvance(1)(moves);
  }
);

rule('飞相对挺卒', '散手缠斗',
  '红方飞相，黑方挺卒，局面平稳，比拼中局',
  function(moves) {
    if (redFirstMove(moves) !== '飞相局') return false;
    return blackPawnCenterAt(1)(moves);
  }
);

// --- 其他开局 ---

rule('起马对挺卒', '灵活多变',
  '红方起马，黑方挺卒制马，开局正常出子',
  function(moves) {
    if (redFirstMove(moves) !== '起马局') return false;
    return blackPawnCenterAt(1)(moves);
  }
);

rule('起马对中炮', '激烈对攻',
  '红方起马，黑方直接中炮反击，对攻激烈',
  function(moves) {
    if (redFirstMove(moves) !== '起马局') return false;
    return blackCannonCenterAt(1)(moves);
  }
);

rule('过宫炮', '稳健防守',
  '红方过宫炮，子力集中于一侧，稳健中暗藏反击',
  function(moves) {
    return redFirstMove(moves) === '过宫炮';
  }
);

rule('仕角炮', '灵活多变',
  '红方仕角炮，阵型灵活，可转向多种布局',
  function(moves) {
    return redFirstMove(moves) === '仕角炮';
  }
);

// ============ 导出接口 ============

export function identifyOpening(moveHistory) {
  if (!moveHistory || moveHistory.length < 2) return null;

  // 依次检查规则
  for (var i = 0; i < RULES.length; i++) {
    if (RULES[i].check(moveHistory)) {
      return {
        name: RULES[i].name,
        style: RULES[i].style,
        description: RULES[i].description
      };
    }
  }

  // 能识别出第一步但无完全匹配
  var family = redFirstMove(moveHistory);
  if (family !== 'unknown' && family !== '其他') {
    var nameMap = {
      '中炮_右': '中炮', '中炮_左': '中炮',
      '仙人指路': '仙人指路', '飞相局': '飞相局',
      '起马局': '起马局', '过宫炮': '过宫炮',
      '仕角炮': '仕角炮'
    };
    return {
      name: nameMap[family] || family,
      style: '布局阶段',
      description: '对局初期，双方正在出子布阵'
    };
  }

  return null;
}
