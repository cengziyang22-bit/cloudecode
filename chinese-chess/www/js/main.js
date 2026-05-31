// main.js — ES Module 入口
import { RED, BLACK, PIECE } from './board.js';
import { initGame, newGame, setGameMode, cleanupGame, triggerAnalysis, closeAnalysis, startPostGameAnalysis, getGameMode, undoMove, goToAnalysisPrev, goToAnalysisNext, closePostGameAnalysis, clearEditBoard, confirmCustomGame, editSelectPiece, hostOnlineSession, resignOnline } from './game.js';
import { acceptOffer, connectGuest, disconnect, isConnected, compressSDP, normalizeSDP, generateColorImage, decodeColorImage } from './online.js';

// ============ UI Event Bindings ============

// ============ UI Event Bindings ============

// --- 开始界面模式选择 ---
var startModeEls = document.querySelectorAll('.start-mode-btn');
startModeEls.forEach(function(el) {
  el.addEventListener('click', function() {
    startModeEls.forEach(function(b) { b.classList.remove('selected'); });
    el.classList.add('selected');
    var mode = el.dataset.mode;
    document.getElementById('difficultyGroup').style.display = mode === 'ai' ? '' : 'none';
    document.getElementById('colorGroup').style.display = mode === 'ai' ? '' : 'none';
  });
});

// --- 设置面板 ---
var selectedSettings = { totalTime: null, moveTime: null, difficulty: 10, aiColor: 'red', theme: 'classic' };

document.getElementById('btnSettingsBack').addEventListener('click', function() {
  document.getElementById('settingsPanel').style.display = 'none';
});

document.querySelectorAll('#settingsPanel .settings-option').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var group = btn.parentElement;
    group.querySelectorAll('.settings-option').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    var key = group.dataset.key;
    selectedSettings[key] = btn.dataset.value === 'unlimited' ? null : parseInt(btn.dataset.value);
  });
});

document.querySelectorAll('#settingsPanel .skin-swatch').forEach(function(el) {
  el.addEventListener('click', function() {
    document.querySelectorAll('.skin-swatch').forEach(function(s) { s.classList.remove('selected'); });
    el.classList.add('selected');
    selectedSettings.theme = el.dataset.theme;
  });
});

document.getElementById('diffSlider').addEventListener('input', function() {
  document.getElementById('diffLabel').textContent = this.value;
  selectedSettings.difficulty = parseInt(this.value);
});

// --- 开始游戏 ---
document.getElementById('btnStartGame').addEventListener('click', function() {
  var selected = document.querySelector('.start-mode-btn.selected');
  var mode = selected ? selected.dataset.mode : 'pvp';
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('gameContainer').style.display = '';
  initGame(mode, selectedSettings);
});

document.getElementById('btnConfirmSettings').addEventListener('click', function() {
  var selected = document.querySelector('.start-mode-btn.selected');
  var mode = selected ? selected.dataset.mode : 'pvp';
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('gameContainer').style.display = '';
  initGame(mode, selectedSettings);
});

// --- 游戏中模式切换 ---
document.querySelectorAll('.mode-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    cleanupGame();
    setGameMode(btn.dataset.mode);
    newGame();
  });
});

// --- 游戏控制 ---
document.getElementById('btnUndo').addEventListener('click', function() {
  undoMove();
});

document.getElementById('btnNew').addEventListener('click', function() {
  cleanupGame();
  newGame();
});

document.getElementById('btnAnalyze').addEventListener('click', function() {
  triggerAnalysis();
});

document.getElementById('btnAnalysisClose').addEventListener('click', function() {
  closeAnalysis();
});

// --- 赛后分析 ---
document.getElementById('btnPostgameClose').addEventListener('click', function() {
  closePostGameAnalysis();
});

document.getElementById('btnPgnPrev').addEventListener('click', function() {
  goToAnalysisPrev();
});

document.getElementById('btnPgnNext').addEventListener('click', function() {
  goToAnalysisNext();
});

// --- 联机对战 ---
document.getElementById('btnHostSession').addEventListener('click', function() {
  hostOnlineSession();
});

document.getElementById('btnAcceptOffer').addEventListener('click', function() {
  var sdp = document.getElementById('sdpPasteInput').value.trim();
  if (!sdp) { document.getElementById('sdpHint').textContent = '请先粘贴对手的连接码'; return; }
  normalizeSDP(sdp).then(function(normalized) {
    acceptOffer(normalized, function(answer) {
      compressSDP(answer).then(function(compressed) {
        document.getElementById('sdpOutput').style.display = '';
        document.getElementById('sdpOutputText').value = compressed;
        document.getElementById('sdpHint').textContent = '应答码已生成，发给主机';
        document.getElementById('sdpInput').style.display = 'flex';
        document.getElementById('btnConfirmAnswer').onclick = function() {
          var ans = document.getElementById('sdpPasteAnswer').value.trim();
          if (!ans) return;
          normalizeSDP(ans).then(function(normAns) {
            connectGuest(normAns);
          });
        };
        if (typeof QRCode !== 'undefined') {
          document.getElementById('sdpQRCode').innerHTML = '';
          new QRCode(document.getElementById('sdpQRCode'), { text: compressed, width: 140, height: 140 });
        }
      });
    });
  }).catch(function(e) {
    document.getElementById('sdpHint').textContent = '解码失败: ' + e.message;
  });
});

document.getElementById('btnCopySdp').addEventListener('click', function() {
  var ta = document.getElementById('sdpOutputText');
  ta.select();
  navigator.clipboard.writeText(ta.value).catch(function() {});
});

document.getElementById('btnOnlineResign').addEventListener('click', function() {
  resignOnline();
});

// --- QR 扫码按钮 ---
document.getElementById('btnScanHostSDP').addEventListener('click', function() { triggerQRScan('sdpPasteInput'); });
document.getElementById('btnScanHostSDPFile').addEventListener('click', function() { document.getElementById('qrFileInput').click(); });
document.getElementById('btnScanAnswerSDP').addEventListener('click', function() { triggerQRScan('sdpPasteAnswer'); });
document.getElementById('btnScanAnswerSDPFile').addEventListener('click', function() { document.getElementById('qrFileInput').click(); });
document.getElementById('btnDecodeColorImage').addEventListener('click', function() { document.getElementById('colorFileInput').click(); });
document.getElementById('btnDecodeAnswerImage').addEventListener('click', function() { document.getElementById('answerFileInput').click(); });
document.getElementById('qrScannerCloseBtn').addEventListener('click', function() { stopQRScan(); });
document.getElementById('qrOverlayCloseBtn').addEventListener('click', function() {
  document.getElementById('qrOverlay').style.display = 'none';
  disconnect();
});

// --- 文件输入 ---
document.getElementById('qrFileInput').addEventListener('change', function(e) {
  if (!e.target.files[0]) return;
  decodeQRFromFile(e.target.files[0]);
  e.target.value = '';
});
document.getElementById('colorFileInput').addEventListener('change', function(e) {
  if (!e.target.files[0]) return;
  decodeColorFromFile(e.target.files[0], 'sdpPasteInput');
  e.target.value = '';
});
document.getElementById('answerFileInput').addEventListener('change', function(e) {
  if (!e.target.files[0]) return;
  decodeColorFromFile(e.target.files[0], 'sdpPasteAnswer');
  e.target.value = '';
});

// --- 自定义残局编辑器 ---
document.querySelectorAll('.editor-piece-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.editor-piece-btn').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    editSelectPiece(btn.dataset.type, btn.dataset.color);
  });
});

document.getElementById('btnClearBoard').addEventListener('click', function() {
  clearEditBoard();
});

document.getElementById('btnConfirmCustom').addEventListener('click', function() {
  confirmCustomGame();
});

// --- QR 扫描 ---
var html5Scanner = null;
function triggerQRScan(inputId) {
  var overlay = document.getElementById('qrScannerOverlay');
  overlay.style.display = 'flex';
  document.getElementById('qrScannerViewport').innerHTML = '';
  if (typeof Html5Qrcode !== 'undefined') {
    html5Scanner = new Html5Qrcode('qrScannerViewport');
    html5Scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      function(text) {
        document.getElementById(inputId).value = text;
        stopQRScan();
      },
      function() {}
    ).catch(function() { overlay.style.display = 'none'; });
  }
}
function stopQRScan() {
  document.getElementById('qrScannerOverlay').style.display = 'none';
  if (html5Scanner) {
    try { html5Scanner.stop(); } catch(e) {}
    html5Scanner = null;
  }
}

function decodeQRFromFile(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      if (typeof jsQR !== 'undefined') {
        var cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        var cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0);
        var id = cx.getImageData(0, 0, cv.width, cv.height);
        var code = jsQR(id.data, id.width, id.height);
        if (code) {
          document.getElementById('sdpPasteInput').value = code.data;
        }
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function decodeColorFromFile(file, inputId) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var compressed = decodeColorImage(img);
      document.getElementById(inputId).value = compressed;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById('btnSaveColorImage').addEventListener('click', function() {
  var sdp = document.getElementById('sdpOutputText').value;
  if (!sdp) return;
  var type = sdp[0];
  if (type === 'O' || type === 'A') {
    var cv = generateColorImage(sdp);
    document.getElementById('colorPreviewImg').src = cv.toDataURL();
    document.getElementById('colorPreview').style.display = '';
  }
});

document.getElementById('sdpQRCode').addEventListener('click', function() {
  var imgEl = this.querySelector('img');
  if (!imgEl) return;
  document.getElementById('qrOverlay').style.display = 'flex';
  document.getElementById('qrOverlayTitle').textContent = '扫描二维码';
  document.getElementById('qrOverlayCode').innerHTML = '';
  var bigImg = document.createElement('img');
  bigImg.src = imgEl.src;
  bigImg.style.width = '240px';
  bigImg.style.height = '240px';
  document.getElementById('qrOverlayCode').appendChild(bigImg);
  document.getElementById('qrOverlayColorBlock').style.display = 'none';
});

// --- 键盘快捷键 ---
document.addEventListener('keydown', function(e) {
  if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById('btnUndo').click();
  }
  if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById('btnNew').click();
  }
});

// 初始化：initGame 中会自动调用 preloadTextures
